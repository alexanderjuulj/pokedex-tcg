import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Writable } from "node:stream";
import type { DatabaseSync } from "node:sqlite";
import { APP_NAME, BACKUP_DIR, DB_PATH, ROOT_DIR } from "../server/config";
import { openDb, transaction } from "../server/db";
import { hashPassword } from "../server/password";
import { pullCatalog } from "./catalog";
import { generateTypes } from "./genTypes";

// pnpm db:<command>. A schema change: pnpm db:new "add x", write the SQL,
// pnpm db:migrate (which regenerates the TS types).
const USAGE = `Usage: tsx db/cli.ts <command>

  migrate            apply pending migrations, then regenerate the TS types
  seed               run db/seed.sql (idempotent: inserts are "or ignore")
  reset              back up, delete the database, migrate and seed
  new <description>  create db/migrations/YYYYMMDDHHMMSS_<description>.sql
  backup             copy the database to data/backups/
  catalog            pull the TCGdex card catalogue and its images (only
                     what's missing; needs internet)
  types              regenerate src/lib/database.types.ts only
  login [env-file]   set the app's login: writes AUTH_* into env-file, or
                     prints the lines to paste into the server's .env`;

const MIGRATIONS_DIR = path.join(ROOT_DIR, "db", "migrations");
const SEED_FILE = path.join(ROOT_DIR, "db", "seed.sql");
const TYPES_FILE = path.join(ROOT_DIR, "src", "lib", "database.types.ts");
const MIGRATION_FILE = /^(\d{14})_([a-z0-9_]+)\.sql$/;

type AppliedMigration = { version: string; checksum: string };

// UTC YYYYMMDDHHMMSS, the migration version format.
const timestamp = () =>
  new Date().toISOString().replace(/\D/g, "").slice(0, 14);

const sha256 = (text: string) =>
  crypto.createHash("sha256").update(text).digest("hex");

function writeTypes(db: DatabaseSync) {
  // Releases on the server ship without src/: nothing to type there.
  if (!fs.existsSync(path.dirname(TYPES_FILE))) return;
  fs.writeFileSync(TYPES_FILE, generateTypes(db));
  console.log(`types: ${path.relative(ROOT_DIR, TYPES_FILE)}`);
}

// A migration that rebuilds a table other tables point at (SQLite's way to
// change a column's check or type) starts with this line. It runs with
// foreign keys off, as SQLite's own procedure says (the switch is ignored
// inside a transaction, so the runner flips it), and every reference must
// still hold before it commits.
const FOREIGN_KEYS_OFF = "-- migrate: foreign_keys off";

function migrate() {
  const db = openDb();
  db.exec(`
    create table if not exists schema_migrations (
      version    text primary key,
      name       text not null,
      checksum   text not null,
      applied_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);
  const applied = new Map(
    (
      db
        .prepare("select version, checksum from schema_migrations")
        .all() as AppliedMigration[]
    ).map((row) => [row.version, row.checksum]),
  );

  let count = 0;
  for (const file of fs.readdirSync(MIGRATIONS_DIR).sort()) {
    if (!file.endsWith(".sql")) continue;
    const match = MIGRATION_FILE.exec(file);
    if (!match) {
      throw new Error(`${file}: expected YYYYMMDDHHMMSS_description.sql`);
    }
    const [, version, name] = match;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const checksum = sha256(sql);

    // Applied migrations are immutable: an edit would never reach a
    // database that already ran the file, so fail instead of skipping.
    if (applied.has(version)) {
      if (applied.get(version) !== checksum) {
        throw new Error(
          `${file} changed after it was applied. Revert the edit and add a new migration instead.`,
        );
      }
      continue;
    }

    const keysOff = sql.startsWith(FOREIGN_KEYS_OFF);
    if (keysOff) db.exec("pragma foreign_keys = off");
    try {
      transaction(db, () => {
        db.exec(sql);
        if (keysOff) {
          const broken = db.prepare("pragma foreign_key_check").all();
          if (broken.length) {
            throw new Error(
              `${file} breaks ${broken.length} references, e.g. ${JSON.stringify(broken[0])}`,
            );
          }
        }
        db.prepare(
          "insert into schema_migrations (version, name, checksum) values (?, ?, ?)",
        ).run(version, name, checksum);
      });
    } finally {
      if (keysOff) db.exec("pragma foreign_keys = on");
    }
    console.log(`applied: ${file}`);
    count++;
  }
  if (count === 0) console.log("migrations: up to date");

  writeTypes(db);
  db.close();
}

function seed() {
  const db = openDb();
  transaction(db, () => db.exec(fs.readFileSync(SEED_FILE, "utf8")));
  db.close();
  console.log(`seeded: ${path.relative(ROOT_DIR, SEED_FILE)}`);
}

function backup(): string | null {
  if (!fs.existsSync(DB_PATH)) return null;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  // To the millisecond: a deploy can run right after the nightly copy.
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 17);
  const file = path.join(BACKUP_DIR, `${APP_NAME}-${stamp}.sqlite`);
  const db = openDb();
  // A consistent copy even while the API has the database open.
  db.prepare("vacuum into ?").run(file);
  db.close();
  console.log(`backup: ${path.relative(ROOT_DIR, file)}`);
  return file;
}

// The database may hold real data, so reset always backs up
// first.
function reset() {
  backup();
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(`${DB_PATH}${suffix}`, { force: true });
  }
  migrate();
  seed();
}

function newMigration(description: string) {
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!slug) throw new Error('Usage: pnpm db:new "add meals"');
  const file = path.join(MIGRATIONS_DIR, `${timestamp()}_${slug}.sql`);
  fs.writeFileSync(file, `-- ${description}\n\n`);
  console.log(`created: ${path.relative(ROOT_DIR, file)}`);
}

const MIN_PASSWORD_LENGTH = 10;

// Hidden input: readline echoes what's typed to its output, so the output
// is a stream that can be muted while a password is entered.
function createPrompt() {
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal: process.stdin.isTTY,
  });
  // The line iterator buffers: answers piped in before their question is
  // asked aren't dropped (rl.question would drop them).
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (question: string, hidden = false) => {
    // Straight to stdout, so the question shows even while muted.
    process.stdout.write(question);
    muted = hidden;
    const { value, done } = await lines.next();
    muted = false;
    // A muted Enter doesn't move to the next line.
    if (hidden) process.stdout.write("\n");
    if (done) throw new Error("No answer: the input ended.");
    return value as string;
  };
  return { ask, close: () => rl.close() };
}

function writeEnv(file: string, values: Record<string, string>) {
  const kept = (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "")
    .split("\n")
    .filter((line) => !Object.keys(values).some((key) => line.startsWith(`${key}=`)));
  while (kept.length > 0 && kept[kept.length - 1] === "") kept.pop();
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  fs.writeFileSync(file, [...kept, ...lines, ""].join("\n"));
  // It holds the password hash and the session secret.
  fs.chmodSync(file, 0o600);
}

// Only this command reads stdin: the deploy runs the others inside a remote
// `bash -s`, whose script arrives on that same stdin.
async function login(envFile: string | undefined) {
  const { ask, close } = createPrompt();
  try {
    await saveLogin(envFile, ask);
  } finally {
    close();
  }
}

async function saveLogin(
  envFile: string | undefined,
  ask: (question: string, hidden?: boolean) => Promise<string>,
) {
  const user = (await ask("Username: ")).trim();
  // Plain characters only: the .env is read by systemd and sourced by bash.
  if (!/^[A-Za-z0-9._-]+$/.test(user)) {
    throw new Error("Use letters, digits, '.', '_' or '-' for the username.");
  }
  const password = await ask("Password: ", true);
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`);
  }
  if ((await ask("Password again: ", true)) !== password) {
    throw new Error("The passwords don't match.");
  }

  // A new secret every time, so changing the login logs every device out.
  const values = {
    AUTH_USER: user,
    AUTH_PASSWORD_HASH: hashPassword(password),
    AUTH_SECRET: crypto.randomBytes(32).toString("hex"),
  };
  if (!envFile) {
    console.log("\nAdd these lines to the server's .env, then restart the API:\n");
    for (const [key, value] of Object.entries(values)) console.log(`${key}=${value}`);
    return;
  }
  writeEnv(envFile, values);
  console.log(`login: saved to ${envFile}. Restart the API to use it; every device logs in again.`);
}

const [command, ...args] = process.argv.slice(2);

try {
  switch (command) {
    case "migrate":
      migrate();
      break;
    case "seed":
      seed();
      break;
    case "reset":
      reset();
      break;
    case "new":
      newMigration(args.join(" "));
      break;
    case "backup":
      if (!backup()) console.log("backup: no database yet");
      break;
    case "catalog":
      await pullCatalog();
      break;
    case "types": {
      const db = openDb();
      writeTypes(db);
      db.close();
      break;
    }
    case "login":
      await login(args[0]);
      break;
    default:
      console.log(USAGE);
      process.exitCode = command ? 1 : 0;
  }
} catch (error) {
  console.error(`error: ${(error as Error).message}`);
  process.exitCode = 1;
}
