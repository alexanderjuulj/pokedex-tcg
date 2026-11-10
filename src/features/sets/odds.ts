import type { CardSet, CatalogCard } from "@/hooks/queries";
import { OWN_PACKS, PACK_SLOTS, type PackSlots } from "./constants";

// How likely a pack of a set is to hold a Pokémon: what share of the set's
// commons the pack's common slots take, the same for its uncommons, and the
// reverse holos on top. Only commons and uncommons: the pull rates of the
// rarer cards aren't published and change from set to set, and a Pokémon's
// best pack is nearly always one where it's a common anyway.

// The main run, as the pull counts it: "4", not "RC4" or "TG04".
const inMainRun = (card: CatalogCard) => /^\d+$/.test(card.local_id ?? "");

// The chance that none of `wanted` cards is among `slots` different cards
// drawn from `pool`.
function missAll(wanted: number, pool: number, slots: number) {
  let miss = 1;
  for (let i = 0; i < slots && miss > 0; i++) {
    miss *= Math.max(0, pool - wanted - i) / (pool - i);
  }
  return miss;
}

// What a set's packs are made of: its era's slots and the set's pools.
type PackModel = {
  slots: PackSlots;
  commonPool: number;
  uncommonPool: number;
  // Any common, uncommon or rare, for the reverse holos.
  reversePool: number;
};

// Null when there's no telling: the set isn't sold in its era's boosters, or
// the pull hasn't counted its cards yet.
function packModel(set: CardSet): PackModel | null {
  const slots = set.series ? PACK_SLOTS[set.series] : undefined;
  if (!set.in_boosters || !slots || OWN_PACKS.has(set.tcgdex_id ?? "")) return null;
  const { common_count: commonPool, uncommon_count: uncommonPool, rare_count: rarePool } = set;
  if (commonPool === null || uncommonPool === null || rarePool === null) return null;
  return { slots, commonPool, uncommonPool, reversePool: commonPool + uncommonPool + rarePool };
}

// Whether a set's packs can be scored at all.
export const hasPackOdds = (set: CardSet) => packModel(set) !== null;

// The chance a pack holds at least one of `commons` of the set's commons and
// `uncommons` of its uncommons.
function holdsAny(model: PackModel, commons: number, uncommons: number) {
  const miss =
    missAll(commons, model.commonPool, model.slots.common) *
    missAll(uncommons, model.uncommonPool, model.slots.uncommon) *
    (1 - (commons + uncommons) / model.reversePool) ** model.slots.reverse;
  return 1 - miss;
}

const countRarity = (cards: CatalogCard[], rarity: string) =>
  cards.filter((card) => card.rarity === rarity).length;

// The chance a pack holds at least one of these cards (one Pokémon's cards
// in the set), or null when there's no telling: no model for the set's
// packs, or the cards are all rarer than uncommon.
export function packOdds(set: CardSet, cards: CatalogCard[]): number | null {
  const model = packModel(set);
  if (!model) return null;
  const main = cards.filter(inMainRun);
  const commons = countRarity(main, "Common");
  const uncommons = countRarity(main, "Uncommon");
  if (!commons && !uncommons) return null;
  // The counts come from the whole set and the cards from the catalogue: if
  // they disagree, the odds would be nonsense.
  if (commons > model.commonPool || uncommons > model.uncommonPool) return null;
  return holdsAny(model, commons, uncommons);
}

// What a pack of a set holds of the Pokémon you need.
export type PackValue = {
  // Each of them a pack can hold, with the chance it does, likeliest first.
  pokemon: { pokemonId: number; odds: number }[];
  // How many of them one pack gives, on average.
  expected: number;
  // The chance it gives at least one.
  chanceAny: number;
};

// A pack's value for the Pokémon you need, from the set's catalogue cards,
// or null when there's no telling.
export function packValue(
  set: CardSet,
  cards: CatalogCard[],
  needed: (pokemonId: number) => boolean,
): PackValue | null {
  const model = packModel(set);
  if (!model) return null;
  const wanted = cards.filter((card) => inMainRun(card) && needed(card.pokemon_id!));
  // A card with two Pokémon on it is listed under both, but it's one card.
  const distinct = [...new Map(wanted.map((card) => [card.id, card])).values()];
  const commons = countRarity(distinct, "Common");
  const uncommons = countRarity(distinct, "Uncommon");
  if (commons > model.commonPool || uncommons > model.uncommonPool) return null;

  const byPokemon = new Map<number, CatalogCard[]>();
  for (const card of wanted) {
    byPokemon.set(card.pokemon_id!, [...(byPokemon.get(card.pokemon_id!) ?? []), card]);
  }
  const pokemon = [...byPokemon]
    .map(([pokemonId, list]) => ({
      pokemonId,
      odds: holdsAny(model, countRarity(list, "Common"), countRarity(list, "Uncommon")),
    }))
    .filter((entry) => entry.odds > 0)
    .sort((a, b) => b.odds - a.odds);
  return {
    pokemon,
    expected: pokemon.reduce((sum, entry) => sum + entry.odds, 0),
    chanceAny: commons || uncommons ? holdsAny(model, commons, uncommons) : 0,
  };
}

// The Pokémon you need the 1st, 2nd … nth pack of a set gives, on average:
// fewer each time, as the ones the packs before it gave come again.
export function packsInARow(value: PackValue, count: number): number[] {
  return Array.from({ length: count }, (_, before) =>
    value.pokemon.reduce((sum, entry) => sum + (1 - entry.odds) ** before * entry.odds, 0),
  );
}

// "About 1 in 9 packs". Above half, "1 in 2" would undersell it.
export function formatPackOdds(odds: number) {
  if (odds >= 0.85) return "Nearly every pack";
  if (odds >= 0.6) return "Most packs";
  return `About 1 in ${Math.max(2, Math.round(1 / odds))} packs`;
}
