// What an English booster pack of each era holds, by series (as TCGdex
// names them), for the pack odds: its commons, its uncommons and its
// reverse holos (any common, uncommon or rare of the set). The rest of the
// pack is a rare or better, and from Sun & Moon to Sword & Shield a basic
// Energy. Scarlet & Violet's are official (4 commons, 3 uncommons and 3
// foils, one of them rare or better); the older ones are the usual
// accounts of them, close enough for "about 1 in 9 packs".
export type PackSlots = { common: number; uncommon: number; reverse: number };

const WOTC: PackSlots = { common: 7, uncommon: 3, reverse: 0 };
const NINE_CARDS: PackSlots = { common: 5, uncommon: 2, reverse: 1 };
const TEN_CARDS: PackSlots = { common: 5, uncommon: 3, reverse: 1 };
const WITH_ENERGY: PackSlots = { common: 4, uncommon: 3, reverse: 1 };
const TWO_REVERSE: PackSlots = { common: 4, uncommon: 3, reverse: 2 };

export const PACK_SLOTS: Record<string, PackSlots> = {
  Base: WOTC,
  Gym: WOTC,
  Neo: WOTC,
  // The first reverse holos, in place of a common.
  "Legendary Collection": { common: 6, uncommon: 3, reverse: 1 },
  "E-Card": NINE_CARDS,
  EX: NINE_CARDS,
  "Diamond & Pearl": TEN_CARDS,
  Platinum: TEN_CARDS,
  "HeartGold & SoulSilver": TEN_CARDS,
  "Call of Legends": TEN_CARDS,
  "Black & White": TEN_CARDS,
  XY: TEN_CARDS,
  "Sun & Moon": WITH_ENERGY,
  "Sword & Shield": WITH_ENERGY,
  // The second reverse holo is now and then a rarer card instead.
  "Scarlet & Violet": TWO_REVERSE,
  "Mega Evolution": TWO_REVERSE,
};

// How far back a set is still likely on a shop's shelf, for a Pokémon's
// "From the last 2 years" odds.
export const RECENT_YEARS = 2;

// Sets whose packs aren't their era's, by TCGdex id, so they get no odds:
// smaller packs (Detective Pikachu's four cards, Dragon Vault, Double Crisis,
// Celebrations), a deck or a collection rather than boosters (Kalos Starter
// Set, Southern Islands, My First Battle), a subset that comes in another
// set's packs in its own slot (Radiant Collection), and the odd ones out.
// Subsets with no commons or uncommons (Trainer Galleries, Shiny Vaults)
// get none anyway.
export const OWN_PACKS = new Set([
  "si1",
  "sp",
  "bog",
  "ex5.5",
  "exu",
  "ru1",
  "dv1",
  "rc",
  "xy0",
  "xya",
  "dc1",
  "det1",
  "fut2020",
  "cel25",
  "cel25cc",
  "mfb",
  "30th",
  "30th-c",
]);
