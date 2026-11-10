import type { PackValue } from "@/features/sets/odds";

// What to buy with a budget, from the packs on offer: one pack at a time, the
// one that adds the most Pokémon you need for its price. Each pack bought
// makes the next one of the same set (and of any set sharing its Pokémon)
// worth less, as what it likely gave would only come again.

export type Offer = {
  // The set's TCGdex id.
  key: string;
  value: PackValue;
  // Per pack, in hundredths.
  price: number;
};

export type BudgetPlan = {
  // The packs to buy, the most first.
  packs: { key: string; count: number; expected: number }[];
  spent: number;
  // The Pokémon you need they'd give, on average.
  expected: number;
};

// Past this a pack adds next to nothing; and a cap, should a price be 0.
const MIN_GAIN = 0.01;
const MAX_PACKS = 200;

export function planBudget(offers: Offer[], budget: number): BudgetPlan {
  // The chance each Pokémon you need is still missing after the packs so far.
  const missing = new Map<number, number>();
  const bought = new Map<string, { count: number; expected: number }>();
  let left = budget;
  let expected = 0;

  for (let pack = 0; pack < MAX_PACKS; pack++) {
    let best: { offer: Offer; gain: number; score: number } | null = null;
    for (const offer of offers) {
      if (offer.price > left) continue;
      const gain = offer.value.pokemon.reduce(
        (sum, entry) => sum + (missing.get(entry.pokemonId) ?? 1) * entry.odds,
        0,
      );
      if (gain < MIN_GAIN) continue;
      const score = offer.price > 0 ? gain / offer.price : Infinity;
      if (!best || score > best.score) best = { offer, gain, score };
    }
    if (!best) break;

    for (const entry of best.offer.value.pokemon) {
      missing.set(entry.pokemonId, (missing.get(entry.pokemonId) ?? 1) * (1 - entry.odds));
    }
    const so = bought.get(best.offer.key) ?? { count: 0, expected: 0 };
    bought.set(best.offer.key, { count: so.count + 1, expected: so.expected + best.gain });
    left -= best.offer.price;
    expected += best.gain;
  }

  return {
    packs: [...bought]
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => b.count - a.count || b.expected - a.expected),
    spent: budget - left,
    expected,
  };
}
