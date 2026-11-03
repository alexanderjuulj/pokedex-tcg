import { Hono, type Context } from "hono";
import { transaction } from "./db";
import { ApiError } from "./errors";
import { db } from "./routes";

// Dedicated endpoints for writes the generic CRUD routes can't express
// (several rows in one transaction), in the spirit of Supabase RPCs:
// POST /api/rpc/<name> with a JSON body.

export const rpc = new Hono();

async function body(c: Context): Promise<Record<string, unknown>> {
  const value = await c.req.json().catch(() => null);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "Expected a JSON object");
  }
  return value as Record<string, unknown>;
}

function integer(value: unknown, name: string): number {
  if (!Number.isInteger(value)) throw new ApiError(400, `${name}: expected an integer`);
  return value as number;
}

// Puts a card in its Pokémon's slot. The old featured card steps down first:
// the unique index allows one per Pokémon.
rpc.post("/set_featured_card", async (c) => {
  const id = integer((await body(c)).id, "id");
  const card = db.prepare("select pokemon_id from cards where id = ?").get(id) as
    | { pokemon_id: number }
    | undefined;
  if (!card) throw new ApiError(404, `cards/${id} not found`);

  transaction(db, () => {
    db.prepare("update cards set is_featured = 0 where pokemon_id = ? and is_featured = 1").run(
      card.pokemon_id,
    );
    // Into the slot is into its pocket, even from outside the binders.
    db.prepare("update cards set is_featured = 1, kept_outside = 0 where id = ?").run(id);
  });
  return c.json({ id });
});

// Makes the Pokédex binders the setup planned (one or several, from the
// regions picked), all or none. Triggers refuse ranges another Pokédex binder
// already covers.
rpc.post("/add_pokedex_binders", async (c) => {
  const binders = (await body(c)).binders;
  if (!Array.isArray(binders) || !binders.length) {
    throw new ApiError(400, "binders: expected a non-empty array");
  }
  const rows = binders.map((value: Record<string, unknown>, index) => {
    const name = typeof value?.name === "string" ? value.name.trim() : "";
    if (!name) throw new ApiError(400, `binders[${index}].name: expected a name`);
    return {
      name,
      first: integer(value.first_pokemon_id, `binders[${index}].first_pokemon_id`),
      last: integer(value.last_pokemon_id, `binders[${index}].last_pokemon_id`),
      pockets: integer(value.pockets_per_page, `binders[${index}].pockets_per_page`),
      pages: value.page_count == null ? null : integer(value.page_count, `binders[${index}].page_count`),
    };
  });

  const ids: number[] = [];
  transaction(db, () => {
    const insert = db.prepare(
      `insert into binders (name, kind, first_pokemon_id, last_pokemon_id, pockets_per_page, page_count)
       values (?, 'pokedex', ?, ?, ?, ?)`,
    );
    for (const row of rows) {
      ids.push(Number(insert.run(row.name, row.first, row.last, row.pockets, row.pages).lastInsertRowid));
    }
  });
  return c.json({ ids });
});

// Puts a card in a free binder's first empty pocket. The card in a Pokémon's
// slot can't go: it lives in its Pokédex binder.
rpc.post("/put_in_binder", async (c) => {
  const values = await body(c);
  const cardId = integer(values.card_id, "card_id");
  const binderId = integer(values.binder_id, "binder_id");
  const binder = db.prepare("select name, kind from binders where id = ?").get(binderId) as
    | { name: string; kind: string }
    | undefined;
  if (!binder) throw new ApiError(404, `binders/${binderId} not found`);
  if (binder.kind !== "free") throw new ApiError(400, `${binder.name} keeps its own order`);
  const card = db
    .prepare(
      `select c.is_featured, c.grading_company, exists (
         select 1 from binders b
         where b.kind = 'pokedex' and c.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
       ) as in_pokedex_binder
       from cards c where c.id = ?`,
    )
    .get(cardId) as
    | { is_featured: number; grading_company: string | null; in_pokedex_binder: number }
    | undefined;
  if (!card) throw new ApiError(404, `cards/${cardId} not found`);
  if (card.grading_company) throw new ApiError(409, "A graded card's slab doesn't fit in a pocket");
  if (card.is_featured && card.in_pokedex_binder) {
    throw new ApiError(409, "This card is in its Pokémon's slot, in the Pokédex binder");
  }

  let pocket = 1;
  transaction(db, () => {
    const used = new Set(
      (
        db
          .prepare("select binder_pocket from cards where binder_id = ? and id <> ?")
          .all(binderId, cardId) as { binder_pocket: number }[]
      ).map((row) => row.binder_pocket),
    );
    while (used.has(pocket)) pocket++;
    db.prepare("update cards set binder_id = ?, binder_pocket = ?, kept_outside = 0 where id = ?").run(
      binderId,
      pocket,
      cardId,
    );
  });
  return c.json({ card_id: cardId, binder_id: binderId, binder_pocket: pocket });
});
