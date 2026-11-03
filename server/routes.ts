import { Hono, type Context } from "hono";
import type { SQLInputValue } from "node:sqlite";
import { columnsOf, fromDb, openDb, quote, toDb, type Column } from "./db";
import { ApiError } from "./errors";
import { TABLES, VIEWS } from "./tables";

// Generic CRUD over the allowlist in ./tables:
//
//   GET    /api/:name?order=name,-created_at&category=fruit
//   GET    /api/:name/:id
//   POST   /api/:name          (tables only)
//   PATCH  /api/:name/:id      (tables only)
//   DELETE /api/:name/:id      (tables only)
//
// Every identifier is checked against the live schema before it goes into
// SQL; values are always bound.

export const db = openDb();

function relation(name: string, access: "read" | "write"): Column[] {
  const allowed: readonly string[] =
    access === "write" ? TABLES : [...TABLES, ...VIEWS];
  if (!allowed.includes(name)) throw new ApiError(404, `Unknown table "${name}"`);
  return columnsOf(db, name);
}

function column(columns: Column[], name: string): Column {
  const found = columns.find((candidate) => candidate.name === name);
  if (!found) throw new ApiError(400, `Unknown column "${name}"`);
  return found;
}

function rowId(c: Context): number {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) throw new ApiError(404, "Not found");
  return id;
}

async function body(c: Context): Promise<Record<string, unknown>> {
  const value = await c.req.json().catch(() => null);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "Expected a JSON object");
  }
  return value as Record<string, unknown>;
}

// Bound values for a write; the id is never client-writable.
function assignments(columns: Column[], values: Record<string, unknown>) {
  return Object.entries(values).map(([key, value]) => {
    const target = column(columns, key);
    if (target.pk) throw new ApiError(400, `"${key}" is read-only`);
    try {
      return { name: quote(target.name), value: toDb(target, value) };
    } catch (error) {
      throw new ApiError(400, (error as Error).message);
    }
  });
}

function selectById(name: string, columns: Column[], id: number) {
  const row = db
    .prepare(`select * from ${quote(name)} where id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) throw new ApiError(404, "Not found");
  return fromDb(columns, row);
}

export const api = new Hono();

api.get("/:name", (c) => {
  const name = c.req.param("name");
  const columns = relation(name, "read");
  const where: string[] = [];
  const params: SQLInputValue[] = [];
  const orderBy: string[] = [];

  for (const [key, value] of Object.entries(c.req.query())) {
    if (key === "order") {
      for (const part of value.split(",").filter(Boolean)) {
        const descending = part.startsWith("-");
        const target = column(columns, descending ? part.slice(1) : part);
        orderBy.push(`${quote(target.name)}${descending ? " desc" : ""}`);
      }
      continue;
    }
    // Query values are strings; booleans arrive as "true"/"false".
    const target = column(columns, key);
    where.push(`${quote(target.name)} = ?`);
    params.push(
      target.type === "boolean" ? (value === "true" ? 1 : 0) : value,
    );
  }

  const sql = [
    `select * from ${quote(name)}`,
    where.length ? `where ${where.join(" and ")}` : "",
    orderBy.length ? `order by ${orderBy.join(", ")}` : "",
  ].join(" ");
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return c.json(rows.map((row) => fromDb(columns, row)));
});

api.get("/:name/:id", (c) => {
  const name = c.req.param("name");
  return c.json(selectById(name, relation(name, "read"), rowId(c)));
});

api.post("/:name", async (c) => {
  const name = c.req.param("name");
  const columns = relation(name, "write");
  const values = assignments(columns, await body(c));
  const sql = values.length
    ? `insert into ${quote(name)} (${values.map((v) => v.name).join(", ")})
       values (${values.map(() => "?").join(", ")}) returning id`
    : `insert into ${quote(name)} default values returning id`;
  const { id } = db.prepare(sql).get(...values.map((v) => v.value)) as {
    id: number;
  };
  return c.json(selectById(name, columns, id), 201);
});

api.patch("/:name/:id", async (c) => {
  const name = c.req.param("name");
  const columns = relation(name, "write");
  const id = rowId(c);
  const values = assignments(columns, await body(c));
  if (values.length === 0) throw new ApiError(400, "Nothing to update");
  const { changes } = db
    .prepare(
      `update ${quote(name)} set ${values.map((v) => `${v.name} = ?`).join(", ")} where id = ?`,
    )
    .run(...values.map((v) => v.value), id);
  if (changes === 0) throw new ApiError(404, "Not found");
  // Re-read rather than RETURNING: the updated_at trigger runs after the
  // statement, so RETURNING would hand back the old timestamp.
  return c.json(selectById(name, columns, id));
});

api.delete("/:name/:id", (c) => {
  const name = c.req.param("name");
  relation(name, "write");
  const { changes } = db
    .prepare(`delete from ${quote(name)} where id = ?`)
    .run(rowId(c));
  if (changes === 0) throw new ApiError(404, "Not found");
  return c.body(null, 204);
});
