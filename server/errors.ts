import type { Context } from "hono";

export class ApiError extends Error {
  constructor(
    readonly status: 400 | 401 | 404 | 409 | 429 | 503,
    message: string,
  ) {
    super(message);
  }
}

// SQLite's own messages ("UNIQUE constraint failed: items.name") are clear
// enough to show in the error toast as-is.
export function onError(error: Error, c: Context) {
  if (error instanceof ApiError) {
    return c.json({ error: error.message }, error.status);
  }
  const sqlite = error as Error & { code?: string; errcode?: number };
  if (sqlite.code === "ERR_SQLITE_ERROR") {
    const SQLITE_CONSTRAINT = 19;
    const isConstraint = ((sqlite.errcode ?? 0) & 0xff) === SQLITE_CONSTRAINT;
    return c.json({ error: error.message }, isConstraint ? 409 : 400);
  }
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
}
