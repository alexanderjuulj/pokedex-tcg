import fs from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { DATA_DIR, DB_PATH } from "./config";

export type Column = {
  name: string;
  // Declared type, lowercased ("integer", "text", "boolean", ...). Empty for
  // view columns computed without a cast.
  type: string;
  notNull: boolean;
  hasDefault: boolean;
  pk: boolean;
};

type ColumnInfo = {
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
  hidden: number;
};

export function openDb(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  // WAL lets the CLI (migrate, backup) work while the API holds the file.
  // foreign_keys is per connection in SQLite, so every open sets it.
  db.exec(`
    pragma journal_mode = wal;
    pragma foreign_keys = on;
    pragma busy_timeout = 5000;
  `);
  return db;
}

export function quote(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function columnsOf(db: DatabaseSync, relation: string): Column[] {
  const rows = db
    .prepare(`pragma table_xinfo(${quote(relation)})`)
    .all() as ColumnInfo[];
  return rows
    .filter((row) => row.hidden === 0)
    .map((row) => ({
      name: row.name,
      type: row.type.toLowerCase(),
      notNull: row.notnull === 1,
      hasDefault: row.dflt_value !== null,
      pk: row.pk > 0,
    }));
}

export function transaction(db: DatabaseSync, run: () => void) {
  db.exec("begin");
  try {
    run();
    db.exec("commit");
  } catch (error) {
    db.exec("rollback");
    throw error;
  }
}

// SQLite has no boolean type: columns declared `boolean` store 0/1 and are
// converted at the API boundary so the generated TS types can say boolean.
export function fromDb(columns: Column[], row: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...row };
  for (const column of columns) {
    if (column.type === "boolean" && out[column.name] != null) {
      out[column.name] = out[column.name] === 1;
    }
  }
  return out;
}

export function toDb(column: Column, value: unknown): SQLInputValue {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null || typeof value === "string" || typeof value === "number") {
    return value;
  }
  throw new TypeError(`${column.name}: unsupported value`);
}
