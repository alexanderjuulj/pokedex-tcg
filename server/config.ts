import path from "node:path";

// Shared by the API, the db CLI and vite.config.ts. A missing .env is fine:
// the defaults match .env.example.
try {
  process.loadEnvFile();
} catch {
  // no .env
}

// The app's name in files and paths (database, backups). The new-app script
// in app-starter sets it, along with src/constants/app.ts.
export const APP_NAME = "pokedex-tcg";

export const WEB_PORT = Number(process.env.WEB_PORT ?? 5320);
export const API_PORT = Number(process.env.API_PORT ?? 5321);

// One level up from server/ in development and from dist-server/ in a
// release (the bundles sit at the same depth), so db/migrations resolves in
// both.
export const ROOT_DIR = path.resolve(import.meta.dirname, "..");
// On the server the database lives outside the releases (shared/data), so
// deploys never touch it.
export const DATA_DIR = process.env.DATA_DIR ?? path.join(ROOT_DIR, "data");
export const DB_PATH = path.join(DATA_DIR, `${APP_NAME}.sqlite`);
export const BACKUP_DIR = path.join(DATA_DIR, "backups");
// The card scans from `catalog pull`. Not in the backups: a pull brings them
// back.
export const CATALOG_DIR = path.join(DATA_DIR, "catalog");
