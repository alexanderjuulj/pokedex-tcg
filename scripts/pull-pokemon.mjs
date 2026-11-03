// Writes the migrations that hold the Pokémon, from two one-time pulls:
// - Bulbapedia's National Pokédex list (number, name, types), saved as
//   scripts/bulbapedia-dex.json. Bulbapedia sits behind a Cloudflare check,
//   so that pull ran in a real browser, which also shrank the artwork into
//   public/pokemon/NNN.webp.
// - PokéAPI for the facts: category, height, weight, a Pokédex entry
//   (HeartGold's, or from the first English game after it that has one) and
//   what each Pokémon evolves from, and how.
//
// Usage: node scripts/pull-pokemon.mjs scripts/bulbapedia-dex.json <migration.sql> [first] [last]
//   1 251      the first migration: the pokemon table and Kanto and Johto
//   252 1025   the rest of the National Pokédex: rebuilds the table for the
//              wider range, and links older Pokémon to new pre-evolutions
// Migrations are immutable once applied anywhere; this script documents
// where their data came from.

import fs from "node:fs";

const [dexFile, outFile, firstArg = "1", lastArg = "251"] = process.argv.slice(2);
if (!dexFile || !outFile) {
  console.error("Usage: node scripts/pull-pokemon.mjs <dex.json> <migration.sql> [first] [last]");
  process.exit(1);
}
const FIRST = Number(firstArg);
const LAST = Number(lastArg);

const TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];
// The last Pokédex number of each generation.
const GENERATION_ENDS = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
// Where the Pokédex entry comes from: HeartGold, else the first of these
// that has one (each generation's first English games).
const ENTRY_VERSIONS = [
  "heartgold", "platinum", "black", "black-2", "x", "omega-ruby", "sun", "ultra-sun",
  "lets-go-pikachu", "sword", "legends-arceus", "scarlet", "violet",
];

const everyone = JSON.parse(fs.readFileSync(dexFile, "utf8")).map(([id, name, types]) => ({
  id,
  name,
  types: types.split("/").map((type) => type.toLowerCase()),
}));
const dex = everyone.filter((pokemon) => pokemon.id >= FIRST && pokemon.id <= LAST);
if (dex.length !== LAST - FIRST + 1) {
  throw new Error(`expected ${LAST - FIRST + 1} Pokémon, got ${dex.length}`);
}

const cache = new Map();
async function get(url) {
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      for (let attempt = 1; ; attempt++) {
        const response = await fetch(url).catch((error) => error);
        if (response.ok) return response.json();
        if (attempt === 3) throw new Error(`${url}: ${response.status ?? response.message}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    })());
  }
  return cache.get(url);
}

async function inBatches(items, size, run) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(run))));
  }
  return results;
}

const idFromUrl = (url) => Number(url.match(/\/(\d+)\/$/)[1]);
const NAMES_BY_SLUG = new Map(everyone.map((pokemon) => [
  pokemon.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[.':]/g, "").replace(/♀/g, "-f").replace(/♂/g, "-m").replace(/\s+/g, "-"),
  pokemon.name,
]));
const ITEM_NAMES = { "kings-rock": "King's Rock", "up-grade": "Up-Grade" };
const title = (slug) =>
  ITEM_NAMES[slug] ??
  NAMES_BY_SLUG.get(slug) ??
  slug.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");

// The games shout names ("CHARIZARD", "POKéMON") and break lines for the
// screen.
const NAMES = new Map(everyone.map((pokemon) => [pokemon.name.toUpperCase(), pokemon.name]));
const cleanEntry = (text) =>
  text
    .replace(/­\s*/g, "")
    .replace(/\s+/g, " ")
    .replace(/POKéMON/g, "Pokémon")
    .replace(/MR\. MIME/g, "Mr. Mime")
    .replace(/[A-Z][A-Z'♀♂-]+/g, (word) => NAMES.get(word) ?? word)
    .trim();

// How a Pokémon is reached from its pre-evolution: "Level 16", "Fire Stone",
// "Trade holding Metal Coat", "Friendship (day)", "Level 20, Attack > Defense",
// "Level up knowing Ancient Power".
function evolutionMethod(details) {
  const d = details[0];
  if (!d) return null;
  const trigger = d.trigger.name;
  let method;
  if (trigger === "use-item") method = title(d.item.name);
  else if (trigger === "trade") {
    method = d.held_item
      ? `Trade holding ${title(d.held_item.name)}`
      : d.trade_species
        ? `Trade for ${title(d.trade_species.name)}`
        : "Trade";
  } else if (trigger === "level-up") {
    if (d.min_level) method = `Level ${d.min_level}`;
    else if (d.min_happiness) method = "Friendship";
    else if (d.min_affection) method = "Affection";
    else if (d.min_beauty) method = "Beauty";
    else if (d.known_move) method = `Level up knowing ${title(d.known_move.name)}`;
    else if (d.known_move_type) method = `Level up knowing a ${title(d.known_move_type.name)}-type move`;
    else if (d.held_item) method = `Level up holding ${title(d.held_item.name)}`;
    else if (d.party_species) method = `Level up with ${title(d.party_species.name)} in the party`;
    else if (d.location) method = `Level up at ${title(d.location.name)}`;
    else method = "Level up";
  } else if (trigger === "use-move") {
    method = `Use ${title(d.used_move.name)}${d.min_move_count ? ` ${d.min_move_count} times` : ""}`;
  } else if (trigger === "shed") {
    // Shedinja: the shell Nincada leaves.
    method = "Level 20, with a free party slot";
  } else method = title(trigger);
  if (d.time_of_day) method += ` (${d.time_of_day})`;
  if (d.gender) method += d.gender === 1 ? " (female)" : " (male)";
  if (d.needs_overworld_rain) method += ", in the rain";
  if (d.turn_upside_down) method += ", upside down";
  // Tyrogue: 1 means Attack > Defense, -1 the reverse, 0 equal.
  if (d.relative_physical_stats != null) {
    const sign = { 1: ">", 0: "=", [-1]: "<" }[d.relative_physical_stats];
    method += `, Attack ${sign} Defense`;
  }
  return method;
}

console.log("PokéAPI: species and stats");
const rows = await inBatches(dex, 8, async (pokemon) => {
  const [species, stats] = await Promise.all([
    get(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}/`),
    get(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}/`),
  ]);
  const genus = species.genera.find((g) => g.language.name === "en")?.genus;
  const english = species.flavor_text_entries.filter((f) => f.language.name === "en");
  const entry =
    ENTRY_VERSIONS.map((version) => english.find((f) => f.version.name === version)).find(Boolean) ??
    english.at(-1);
  if (!genus || !entry) throw new Error(`${pokemon.name}: no genus or Pokédex entry`);
  for (const type of pokemon.types) {
    if (!TYPES.includes(type)) throw new Error(`${pokemon.name}: unknown type ${type}`);
  }
  const fromId = species.evolves_from_species ? idFromUrl(species.evolves_from_species.url) : null;
  return {
    ...pokemon,
    generation: GENERATION_ENDS.findIndex((end) => pokemon.id <= end) + 1,
    category: genus,
    heightDm: stats.height,
    weightHg: stats.weight,
    entry: cleanEntry(entry.flavor_text),
    // Pre-evolutions beyond the range (Azurill before #251) are left out.
    evolvesFromId: fromId && fromId <= LAST ? fromId : null,
    chainUrl: species.evolution_chain.url,
  };
});

console.log("PokéAPI: evolution chains");
const methods = new Map();
const parents = new Map();
const chains = await inBatches([...new Set(rows.map((row) => row.chainUrl))], 8, get);
for (const chain of chains) {
  const walk = (link) => {
    const id = idFromUrl(link.species.url);
    methods.set(id, evolutionMethod(link.evolution_details));
    for (const next of link.evolves_to) {
      parents.set(idFromUrl(next.species.url), id);
      walk(next);
    }
  };
  walk(chain.chain);
}

const sql = (value) =>
  value === null || value === undefined
    ? "null"
    : typeof value === "number"
      ? String(value)
      : `'${String(value).replaceAll("'", "''")}'`;

const values = rows.map((row) =>
  `  (${[
    row.id,
    sql(row.name),
    row.generation,
    sql(row.types[0]),
    sql(row.types[1] ?? null),
    sql(row.category),
    row.heightDm,
    row.weightHg,
    sql(row.entry),
    sql(row.evolvesFromId),
    sql(row.evolvesFromId ? methods.get(row.id) : null),
  ].join(", ")})`,
);

const typeList = TYPES.map((type) => `'${type}'`).join(", ");
const createTable = (last, generations, table = "pokemon") => `create table ${table} (
  id               integer primary key check (id between 1 and ${last}),
  name             text not null unique,
  generation       integer not null check (generation between 1 and ${generations}),
  primary_type     text not null check (primary_type in (${typeList})),
  secondary_type   text check (secondary_type in (${typeList})),
  category         text not null,
  height_dm        integer not null,
  weight_hg        integer not null,
  entry            text not null,
  -- A pre-evolution can come later in the Pokédex (Pichu, #172, before
  -- Pikachu, #25), so the check waits for commit.
  evolves_from_id  integer references pokemon (id) deferrable initially deferred,
  evolution_method text,
  check ((evolves_from_id is null) = (evolution_method is null))
);`;
const insert = `insert into pokemon (id, name, generation, primary_type, secondary_type, category,
  height_dm, weight_hg, entry, evolves_from_id, evolution_method) values
${values.join(",\n")};`;

let migration;
if (FIRST === 1) {
  migration = `-- The 251 Pokémon of Generations 1 and 2: the Pokédex the collection fills.
-- Reference data, so no timestamps and not writable through the API (it's
-- read through views). Written by scripts/pull-pokemon.mjs: names and types
-- from Bulbapedia, the rest from PokéAPI. The artwork is
-- public/pokemon/NNN.webp.

${createTable(LAST, 2)}

${insert}
`;
} else {
  // Older Pokémon whose pre-evolution is new: Azurill (#298) before Marill.
  const links = [...parents]
    .filter(([child, parent]) => child < FIRST && parent >= FIRST && parent <= LAST)
    .sort(([a], [b]) => a - b)
    .map(([child, parent]) =>
      `update pokemon set evolves_from_id = ${parent}, evolution_method = ${sql(methods.get(child))} where id = ${child};`,
    );
  migration = `-- migrate: foreign_keys off
-- Pokémon #${FIRST}–${LAST}, the rest of the National Pokédex: for the cards
-- beyond the goal (Kanto and Johto). Written by scripts/pull-pokemon.mjs like
-- the first ${FIRST - 1}; the artwork is public/pokemon/NNN.webp.

-- The table's checks allowed #1–${FIRST - 1} only, and SQLite can't change a check, so
-- the table is rebuilt the way SQLite's docs do it: with foreign keys off
-- (the first line; db/cli.ts checks every reference before it commits), a
-- copy under a new name takes the old one's place. legacy_alter_table
-- leaves the views alone; they find the new table under the old name, as
-- do the cards, the catalogue and the binders.
pragma legacy_alter_table = on;

${createTable(LAST, 9, "pokemon_new")}

insert into pokemon_new select * from pokemon;
drop table pokemon;
alter table pokemon_new rename to pokemon;
pragma legacy_alter_table = off;

${insert}

-- Older Pokémon whose pre-evolution is new here.
${links.join("\n")}
`;
}
fs.writeFileSync(outFile, migration);
console.log(`wrote: ${outFile}`);
