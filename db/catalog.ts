import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { openDb, transaction } from "../server/db";
import {
  catalogImagePath,
  findCatalogImage,
  findSetImage,
  IMAGE_SIZES,
  setImagePath,
} from "../server/catalogImages";

// `pnpm catalog:pull`: copies TCGdex's cards for every Pokémon in the
// Pokédex into the database, and their scans and the sets' logos and symbols
// into data/catalog/, so the app never looks anything up at runtime. Run it
// once per machine (the Mac, the server). Running it again only fetches
// what's missing: new sets, images not on this machine's disk (an
// interrupted run, or a database copied over), and scans TCGdex has added
// since. It also counts each set's commons, uncommons and rares, for the
// pack odds.
//
// pokemontcg.io's open data fills TCGdex's gaps: scans of older and special
// cards, logos, and the set symbols (TCGdex lists them, but its server for
// them answers every request with an error). It's read from its GitHub
// repository; its API is often down.

const API = "https://api.tcgdex.net/v2/en";
const PTCG_DATA = "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master";
// The digital TCG Pocket game: its cards were never printed.
const SKIPPED_SERIES = new Set(["tcgp"]);
// Promos and these come in their own products, not in booster packs.
const NOT_IN_BOOSTERS = new Set(["McDonald's Collection", "Trainer kits", "POP", "Miscellaneous"]);
// TCGdex sets that pokemontcg.io names differently, by TCGdex id. The rest
// match by name, or by release day.
const PTCG_SETS: Record<string, string> = {
  svp: "svp",
  // Its Unown A–Z are numbered among Unseen Forces' cards there.
  exu: "ex10",
};
const CONCURRENCY = 12;
// The rarities the pack odds count, as TCGdex names them, by the card_sets
// column that counts them. TCGdex spells holo rares both ways.
const RARITY_COUNTS = {
  common_count: ["Common"],
  uncommon_count: ["Uncommon"],
  rare_count: ["Rare", "Holo Rare", "Rare Holo"],
};
type RarityColumn = keyof typeof RARITY_COUNTS;

type SetBrief = { id: string; logo?: string };
type SetDetail = {
  id: string;
  name: string;
  releaseDate?: string;
  serie: { id: string; name: string };
  cardCount: { official?: number };
};
type CardBrief = { id: string };
type CardDetail = {
  id: string;
  name: string;
  localId: string;
  rarity?: string;
  illustrator?: string;
  image?: string;
  set: { id: string };
  variants?: { normal?: boolean; holo?: boolean; reverse?: boolean; firstEdition?: boolean };
};
type CardListing = { id: string; localId: string };
type PtcgSet = {
  id: string;
  name: string;
  releaseDate: string;
  images: { logo?: string; symbol?: string };
};
type PtcgCard = { number: string; name: string; images: { small: string; large: string } };

async function fetchOk(url: string): Promise<Response | null> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url).catch(() => null);
    if (response?.ok) return response;
    if (response?.status === 404) return null;
    if (attempt === 4) throw new Error(`${url}: ${response?.status ?? "no response"}`);
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
}

async function findJson<T>(url: string): Promise<T | null> {
  const response = await fetchOk(url);
  return response && ((await response.json()) as T);
}

async function getJson<T>(url: string): Promise<T> {
  const json = await findJson<T>(url);
  if (json === null) throw new Error(`${url}: not found`);
  return json;
}

async function eachLimited<T, R>(
  label: string,
  items: T[],
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let done = 0;
  const report = () => process.stdout.write(`\r${label}: ${done}/${items.length}`);
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await run(items[index]);
        done++;
        if (done % 25 === 0) report();
      }
    }),
  );
  if (items.length) {
    report();
    process.stdout.write("\n");
  }
  return results;
}

const isPromo = (setName: string) => /promo/i.test(setName);

// Written whole, then renamed: an interrupted run never leaves half a file.
// False when there's no such file.
async function download(url: string, file: string) {
  const response = await fetchOk(url);
  if (!response) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.part`, Buffer.from(await response.arrayBuffer()));
  fs.renameSync(`${file}.part`, file);
  return true;
}

// The kept sets by TCGdex id, and the ids of the skipped ones.
async function pullSets(db: DatabaseSync) {
  const known = new Map(
    (db.prepare("select tcgdex_id, id from card_sets").all() as { tcgdex_id: string; id: number }[])
      .map((row) => [row.tcgdex_id, row.id]),
  );
  const briefs = await getJson<SetBrief[]>(`${API}/sets`);
  const details = await eachLimited(
    "sets",
    briefs.filter((set) => !known.has(set.id)),
    (set) => getJson<SetDetail>(`${API}/sets/${encodeURIComponent(set.id)}`),
  );
  const skipped = details.filter((set) => SKIPPED_SERIES.has(set.serie.id)).map((set) => set.id);
  const insert = db.prepare(
    `insert into card_sets (tcgdex_id, name, series, released_on, card_count)
     values (?, ?, ?, ?, ?) returning id`,
  );
  transaction(db, () => {
    for (const set of details) {
      if (SKIPPED_SERIES.has(set.serie.id)) continue;
      const { id } = insert.get(
        set.id,
        set.name,
        set.serie.name,
        set.releaseDate?.slice(0, 10) ?? null,
        // Promos print no set total ("SWSH050", not "50/53").
        isPromo(set.name) ? null : (set.cardCount.official ?? null),
      ) as { id: number };
      known.set(set.id, id);
    }
    // Every set, not just the new ones: logos come and go.
    const logos = new Map(briefs.map((set) => [set.id, set.logo ?? null]));
    const refresh = db.prepare(
      "update card_sets set logo_url = ?, in_boosters = ? where tcgdex_id = ?",
    );
    const rows = db.prepare("select tcgdex_id, name, series from card_sets").all() as {
      tcgdex_id: string;
      name: string;
      series: string;
    }[];
    for (const row of rows) {
      const inBoosters = !isPromo(row.name) && !NOT_IN_BOOSTERS.has(row.series);
      refresh.run(logos.get(row.tcgdex_id) ?? null, inBoosters ? 1 : 0, row.tcgdex_id);
    }
  });
  return { sets: known, skipped };
}

async function pullCards(db: DatabaseSync, sets: Map<string, number>, skipped: string[]) {
  // Which Pokémon each card shows, from one listing per Pokédex number.
  const { last } = db.prepare("select max(id) as last from pokemon").get() as { last: number };
  const dexIds = Array.from({ length: last }, (_, i) => i + 1);
  const listings = await eachLimited("pokémon", dexIds, (dexId) =>
    getJson<CardBrief[]>(`${API}/cards?dexId=eq:${dexId}`),
  );
  const pokemonByCard = new Map<string, number[]>();
  listings.forEach((cards, i) => {
    for (const card of cards) {
      pokemonByCard.set(card.id, [...(pokemonByCard.get(card.id) ?? []), dexIds[i]]);
    }
  });

  const known = new Set(
    (db.prepare("select tcgdex_id from catalog_cards").all() as { tcgdex_id: string }[])
      .map((row) => row.tcgdex_id),
  );
  // Card ids are "<set id>-<number>".
  const isSkipped = (id: string) => skipped.some((setId) => id.startsWith(`${setId}-`));
  const fresh = await eachLimited(
    "cards",
    [...pokemonByCard.keys()].filter((id) => !known.has(id) && !isSkipped(id)),
    (id) => getJson<CardDetail>(`${API}/cards/${encodeURIComponent(id)}`),
  );

  const insertCard = db.prepare(
    `insert into catalog_cards (tcgdex_id, card_set_id, name, local_id, rarity, illustrator,
       has_normal, has_holo, has_reverse, has_first_edition, image_url)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const link = db.prepare(
    `insert or ignore into catalog_card_pokemon (catalog_card_id, pokemon_id)
     select id, ? from catalog_cards where tcgdex_id = ?`,
  );
  let added = 0;
  transaction(db, () => {
    for (const card of fresh) {
      const setId = sets.get(card.set.id);
      if (setId === undefined) throw new Error(`${card.id}: unknown set ${card.set.id}`);
      const variants = card.variants ?? {};
      insertCard.run(
        card.id,
        setId,
        card.name,
        card.localId,
        // "None" for the cards without one.
        card.rarity && card.rarity !== "None" ? card.rarity : null,
        card.illustrator ?? null,
        variants.normal ? 1 : 0,
        variants.holo ? 1 : 0,
        variants.reverse ? 1 : 0,
        variants.firstEdition ? 1 : 0,
        card.image ?? null,
      );
      added++;
    }
    // Every listing, not just the new cards: a later Pokédex number can
    // join an old card.
    for (const [tcgdexId, pokemonIds] of pokemonByCard) {
      for (const pokemonId of pokemonIds) link.run(pokemonId, tcgdexId);
    }
  });
  console.log(`cards: ${added} new`);

  // TCGdex adds scans over time: ask again about the cards it had none of
  // and nothing else filled in.
  const unscanned = db
    .prepare("select tcgdex_id from catalog_cards where image_url is null and has_image = 0")
    .all() as { tcgdex_id: string }[];
  const rechecked = await eachLimited("cards without scans", unscanned, (card) =>
    findJson<CardDetail>(`${API}/cards/${encodeURIComponent(card.tcgdex_id)}`),
  );
  const setImage = db.prepare("update catalog_cards set image_url = ? where tcgdex_id = ?");
  transaction(db, () => {
    for (const card of rechecked) if (card?.image) setImage.run(card.image, card.id);
  });
}

// How many commons, uncommons and rares every set has, Trainers and Energy
// included, for the pack odds. A listing per rarity, so every run counts
// again. Only the main run counts ("4", not "RC4": those come in their own
// slot), and no basic Energy, which has its own slot too.
async function countRarities(db: DatabaseSync) {
  const basicEnergy = new Set(
    (await getJson<CardListing[]>(`${API}/cards?category=eq:Energy&energyType=eq:Normal`))
      .map((card) => card.id),
  );
  const counts = new Map<string, Record<RarityColumn, number>>();
  for (const [column, rarities] of Object.entries(RARITY_COUNTS) as [RarityColumn, string[]][]) {
    for (const rarity of rarities) {
      const cards = await getJson<CardListing[]>(
        `${API}/cards?rarity=eq:${encodeURIComponent(rarity)}`,
      );
      for (const card of cards) {
        if (basicEnergy.has(card.id) || !/^\d+$/.test(card.localId)) continue;
        // Card ids are "<set id>-<number>", and set ids can hold dashes.
        if (!card.id.endsWith(`-${card.localId}`)) continue;
        const setId = card.id.slice(0, -card.localId.length - 1);
        const set = counts.get(setId) ?? { common_count: 0, uncommon_count: 0, rare_count: 0 };
        set[column]++;
        counts.set(setId, set);
      }
    }
  }

  const sets = db.prepare("select tcgdex_id from card_sets").all() as { tcgdex_id: string }[];
  const update = db.prepare(
    "update card_sets set common_count = ?, uncommon_count = ?, rare_count = ? where tcgdex_id = ?",
  );
  transaction(db, () => {
    for (const { tcgdex_id } of sets) {
      const set = counts.get(tcgdex_id);
      update.run(set?.common_count ?? 0, set?.uncommon_count ?? 0, set?.rare_count ?? 0, tcgdex_id);
    }
  });
  console.log(`rarities: counted for ${counts.size} sets`);
}

// pokemontcg.io's sets by TCGdex set id, and its cards per set (fetched when
// first asked for).
type Ptcg = {
  set: (tcgdexSetId: string) => PtcgSet | undefined;
  cards: (ptcgSetId: string) => Promise<PtcgCard[]>;
};

const norm = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

// "004", "SV004" and "TG04" as "4", "sv4" and "tg4". TCGdex encodes the
// "?" Unown's number as "%3F".
function cardNumber(number: string) {
  let decoded = number;
  try {
    decoded = decodeURIComponent(number);
  } catch {
    // Not encoded after all.
  }
  return decoded.toLowerCase().replace(/^([a-z]*)0+(?=\d)/, "$1");
}

async function loadPtcg(db: DatabaseSync): Promise<Ptcg> {
  const ptcgSets = await getJson<PtcgSet[]>(`${PTCG_DATA}/sets/en.json`);
  const byId = new Map(ptcgSets.map((set) => [set.id, set]));
  const byName = new Map(ptcgSets.map((set) => [norm(set.name), set]));
  const ours = db.prepare("select tcgdex_id, name, released_on from card_sets").all() as {
    tcgdex_id: string;
    name: string;
    released_on: string | null;
  }[];

  const matched = new Map<string, PtcgSet>();
  const used = new Set<string>();
  for (const set of ours) {
    const alias = PTCG_SETS[set.tcgdex_id];
    const found = alias ? byId.get(alias) : byName.get(norm(set.name));
    if (found) {
      matched.set(set.tcgdex_id, found);
      used.add(found.id);
    }
  }
  // "Base Set" is "Base" there and "Unleashed" "HS—Unleashed": the release
  // day settles those, when only one set is left on it.
  for (const set of ours) {
    if (matched.has(set.tcgdex_id) || !set.released_on) continue;
    const day = set.released_on.replaceAll("-", "/");
    const left = ptcgSets.filter((candidate) => candidate.releaseDate === day && !used.has(candidate.id));
    if (left.length === 1) {
      matched.set(set.tcgdex_id, left[0]);
      used.add(left[0].id);
    }
  }

  const cards = new Map<string, Promise<PtcgCard[]>>();
  return {
    set: (tcgdexSetId) => matched.get(tcgdexSetId),
    cards: (ptcgSetId) => {
      if (!cards.has(ptcgSetId)) {
        cards.set(
          ptcgSetId,
          findJson<PtcgCard[]>(`${PTCG_DATA}/cards/en/${ptcgSetId}.json`).then((found) => found ?? []),
        );
      }
      return cards.get(ptcgSetId)!;
    },
  };
}

// The same card at pokemontcg.io: the same name and number, else the only
// card of that name in the set ("Classic Collection" sets number theirs
// differently). A wrong scan is worse than none, so nothing looser.
function findPtcgCard(cards: PtcgCard[], card: { name: string; local_id: string }) {
  const named = cards.filter((candidate) => norm(candidate.name) === norm(card.name));
  return (
    named.find((candidate) => cardNumber(candidate.number) === cardNumber(card.local_id)) ??
    (named.length === 1 ? named[0] : undefined)
  );
}

type CatalogRow = {
  tcgdex_id: string;
  set_id: string;
  name: string;
  local_id: string;
  image_url: string | null;
};

const onDisk = (tcgdexId: string) =>
  IMAGE_SIZES.every((size) => findCatalogImage(tcgdexId, size));

// A card's two scans, from TCGdex or else pokemontcg.io. True once both are
// on disk.
async function saveScans(card: CatalogRow, ptcg: Ptcg) {
  for (const size of IMAGE_SIZES) {
    if (findCatalogImage(card.tcgdex_id, size)) continue;
    const fromTcgdex =
      card.image_url !== null &&
      (await download(`${card.image_url}/${size}.webp`, catalogImagePath(card.tcgdex_id, size, "webp")));
    if (fromTcgdex) continue;
    const set = ptcg.set(card.set_id);
    const found = set && findPtcgCard(await ptcg.cards(set.id), card);
    const url = found && (size === "low" ? found.images.small : found.images.large);
    if (!url || !(await download(url, catalogImagePath(card.tcgdex_id, size, "png")))) return false;
  }
  return true;
}

// Every scan missing on disk, whatever has_image says: a database copied from
// another machine arrives without its images.
async function pullImages(db: DatabaseSync, ptcg: Ptcg) {
  const cards = db
    .prepare(
      `select cc.tcgdex_id, s.tcgdex_id as set_id, cc.name, cc.local_id, cc.image_url
       from catalog_cards cc join card_sets s on s.id = cc.card_set_id`,
    )
    .all() as CatalogRow[];
  const missing = cards.filter((card) => !onDisk(card.tcgdex_id));

  let saved = 0;
  await eachLimited("images", missing, async (card) => {
    if (await saveScans(card, ptcg)) saved++;
  });

  // The flags follow the disk, so they're right after any run.
  const mark = db.prepare("update catalog_cards set has_image = ? where tcgdex_id = ?");
  let scanned = 0;
  transaction(db, () => {
    for (const card of cards) {
      const has = onDisk(card.tcgdex_id);
      if (has) scanned++;
      mark.run(has ? 1 : 0, card.tcgdex_id);
    }
  });
  console.log(`images: ${saved} saved, ${scanned} of ${cards.length} cards have scans`);
}

// The sets' logos, from TCGdex or else pokemontcg.io, and their symbols from
// pokemontcg.io.
async function pullSetImages(db: DatabaseSync, ptcg: Ptcg) {
  const sets = db
    .prepare("select tcgdex_id, logo_url from card_sets")
    .all() as { tcgdex_id: string; logo_url: string | null }[];

  const jobs: (() => Promise<unknown>)[] = [];
  for (const set of sets) {
    const other = ptcg.set(set.tcgdex_id);
    if (!findSetImage(set.tcgdex_id, "logo")) {
      jobs.push(async () => {
        const fromTcgdex =
          set.logo_url !== null &&
          (await download(`${set.logo_url}.webp`, setImagePath(set.tcgdex_id, "logo", "webp")));
        if (!fromTcgdex && other?.images.logo) {
          await download(other.images.logo, setImagePath(set.tcgdex_id, "logo", "png"));
        }
      });
    }
    if (!findSetImage(set.tcgdex_id, "symbol") && other?.images.symbol) {
      const url = other.images.symbol;
      jobs.push(() => download(url, setImagePath(set.tcgdex_id, "symbol", "png")));
    }
  }
  await eachLimited("set images", jobs, (job) => job());

  const mark = db.prepare("update card_sets set has_logo = ?, has_symbol = ? where tcgdex_id = ?");
  let logos = 0;
  let symbols = 0;
  transaction(db, () => {
    for (const set of sets) {
      const logo = Boolean(findSetImage(set.tcgdex_id, "logo"));
      const symbol = Boolean(findSetImage(set.tcgdex_id, "symbol"));
      logos += Number(logo);
      symbols += Number(symbol);
      mark.run(logo ? 1 : 0, symbol ? 1 : 0, set.tcgdex_id);
    }
  });
  console.log(`set images: ${logos} logos and ${symbols} symbols for ${sets.length} sets`);
}

export async function pullCatalog() {
  const db = openDb();
  try {
    const { sets, skipped } = await pullSets(db);
    await pullCards(db, sets, skipped);
    await countRarities(db);
    const ptcg = await loadPtcg(db);
    await pullImages(db, ptcg);
    await pullSetImages(db, ptcg);
    const { cards, pokemon } = db
      .prepare(
        `select (select count(*) from catalog_cards) as cards,
                (select count(distinct pokemon_id) from catalog_card_pokemon) as pokemon`,
      )
      .get() as { cards: number; pokemon: number };
    console.log(`catalog: ${cards} cards for ${pokemon} Pokémon`);
  } finally {
    db.close();
  }
}
