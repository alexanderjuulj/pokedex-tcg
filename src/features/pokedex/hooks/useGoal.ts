import { useBinders } from "@/hooks/queries";
import { formatList } from "@/lib/utils";
import { REGIONS } from "../constants";

type Range = { first: number; last: number };

const overlaps = (a: Range, b: Range) => a.first <= b.last && a.last >= b.first;

// The collection's goal: a card for every Pokémon a Pokédex binder still being
// collected keeps a pocket for. A finished binder (finished_on) stays, with
// its pages and cards, but leaves the goal. The setup makes the first
// binders; set_overview counts the same way in SQL. Until there is a Pokédex
// binder, finished or not, the app is not set up (SetupGate).
export function useGoal() {
  const binders = useBinders();
  const pokedex = (binders.data ?? []).filter((binder) => binder.kind === "pokedex");
  const toRange = (binder: (typeof pokedex)[number]): Range => ({
    first: binder.first_pokemon_id!,
    last: binder.last_pokemon_id!,
  });
  const ranges = pokedex.filter((binder) => !binder.finished_on).map(toRange);
  const finishedRanges = pokedex.filter((binder) => binder.finished_on).map(toRange);

  const regions = REGIONS.filter((region) => ranges.some((range) => overlaps(range, region)));
  const finished = REGIONS.filter(
    (region) =>
      !regions.includes(region) && finishedRanges.some((range) => overlaps(range, region)),
  );
  const labels = regions.map((region) => region.label);
  return {
    isLoading: binders.isLoading,
    error: binders.error,
    isSetUp: pokedex.length > 0,
    // Whether a Pokédex binder is still being collected.
    isCollecting: ranges.length > 0,
    inGoal: (pokemonId: number) =>
      ranges.some((range) => pokemonId >= range.first && pokemonId <= range.last),
    // The regions being collected, the finished ones, and the rest (which a
    // new Pokédex binder can take).
    regions,
    finished,
    others: REGIONS.filter((region) => !regions.includes(region) && !finished.includes(region)),
    // "Kanto and Johto", for "Of the 54 Pokémon from Kanto and Johto"; "Kanto
    // or Johto" for "No Kanto or Johto Pokémon".
    label: formatList(labels),
    labelOr: formatList(labels, "or"),
    // Every Pokédex binder's regions, finished too: what a card in one was
    // for (the Spending page's "Pokémon you need").
    binderLabel: formatList([...regions, ...finished].map((region) => region.label)),
  };
}
