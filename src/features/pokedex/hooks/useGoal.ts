import { useBinders, usePokedexPockets } from "@/hooks/queries";
import { formatList } from "@/lib/utils";
import { REGIONS } from "../constants";

type Range = { first: number; last: number };

const overlaps = (a: Range, b: Range) => a.first <= b.last && a.last >= b.first;

// The collection's goal: the pockets of the Pokédex binders still being
// collected, each for one Pokémon of the binder's regions (and type or
// class). A Pokémon is needed while one of them is empty: a Water binder
// needs its own Squirtle even with one in Kanto's. A finished binder
// (finished_on) stays, with its pages and cards, but leaves the goal.
// set_overview counts the same way in SQL (pokedex_pockets). Until there is
// a Pokédex binder, finished or not, the app is not set up (SetupGate).
export function useGoal() {
  const binders = useBinders();
  const pockets = usePokedexPockets();
  const pokedex = (binders.data ?? []).filter((binder) => binder.kind === "pokedex");
  const active = pokedex.filter((binder) => !binder.finished_on);

  // The regions of the region binders (no type or class), being collected or
  // finished, for the Pokédex's region cards and the regions left to pick.
  const regionRanges = (finished: boolean): Range[] =>
    pokedex
      .filter((binder) => !binder.pokemon_type && !binder.pokemon_class)
      .filter((binder) => Boolean(binder.finished_on) === finished)
      .map((binder) => ({ first: binder.first_pokemon_id!, last: binder.last_pokemon_id! }));
  const ranges = regionRanges(false);
  const finishedRanges = regionRanges(true);
  const regions = REGIONS.filter((region) => ranges.some((range) => overlaps(range, region)));
  const finished = REGIONS.filter(
    (region) =>
      !regions.includes(region) && finishedRanges.some((range) => overlaps(range, region)),
  );

  const collected = (pockets.data ?? []).filter((pocket) => !pocket.finished_on);
  const goal = new Set(collected.map((pocket) => pocket.pokemon_id!));
  const needed = new Set(
    collected.filter((pocket) => pocket.card_id === null).map((pocket) => pocket.pokemon_id!),
  );
  const names = active.map((binder) => binder.name!);

  return {
    isLoading: binders.isLoading || pockets.isLoading,
    error: binders.error ?? pockets.error,
    isSetUp: pokedex.length > 0,
    // Whether a Pokédex binder is still being collected.
    isCollecting: active.length > 0,
    // A binder being collected keeps a pocket for it.
    inGoal: (pokemonId: number) => goal.has(pokemonId),
    // One of those pockets is empty.
    needed: (pokemonId: number) => needed.has(pokemonId),
    // The regions being collected, the finished ones, and the rest (which a
    // new region binder can take).
    regions,
    finished,
    others: REGIONS.filter((region) => !regions.includes(region) && !finished.includes(region)),
    // The binders being collected: "Kanto & Johto", "Kanto & Johto and Water
    // Pokémon"; with "or" for "None for Kanto & Johto or Water Pokémon".
    label: formatList(names),
    labelOr: formatList(names, "or"),
    // Every Pokédex binder, finished too: what a card in one was for (the
    // Spending page's "Pokémon you need").
    binderLabel: formatList(pokedex.map((binder) => binder.name!)),
  };
}
