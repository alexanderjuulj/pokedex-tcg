import type { CardSet, CatalogCard } from "@/hooks/queries";
import { OWN_PACKS, PACK_SLOTS } from "./constants";

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

// The chance a pack holds at least one of these cards (one Pokémon's cards
// in the set), or null when there's no telling: the set isn't sold in its
// era's boosters, the pull hasn't counted its cards yet, or the cards are
// all rarer than uncommon.
export function packOdds(set: CardSet, cards: CatalogCard[]): number | null {
  const slots = set.series ? PACK_SLOTS[set.series] : undefined;
  if (!set.in_boosters || !slots || OWN_PACKS.has(set.tcgdex_id ?? "")) return null;
  const { common_count: commonPool, uncommon_count: uncommonPool, rare_count: rarePool } = set;
  if (commonPool === null || uncommonPool === null || rarePool === null) return null;

  const main = cards.filter(inMainRun);
  const commons = main.filter((card) => card.rarity === "Common").length;
  const uncommons = main.filter((card) => card.rarity === "Uncommon").length;
  if (!commons && !uncommons) return null;
  // The counts come from the whole set and the cards from the catalogue: if
  // they disagree, the odds would be nonsense.
  if (commons > commonPool || uncommons > uncommonPool) return null;

  const reversePool = commonPool + uncommonPool + rarePool;
  const miss =
    missAll(commons, commonPool, slots.common) *
    missAll(uncommons, uncommonPool, slots.uncommon) *
    (1 - (commons + uncommons) / reversePool) ** slots.reverse;
  return 1 - miss;
}

// "About 1 in 9 packs". Above half, "1 in 2" would undersell it.
export function formatPackOdds(odds: number) {
  if (odds >= 0.85) return "Nearly every pack";
  if (odds >= 0.6) return "Most packs";
  return `About 1 in ${Math.max(2, Math.round(1 / odds))} packs`;
}
