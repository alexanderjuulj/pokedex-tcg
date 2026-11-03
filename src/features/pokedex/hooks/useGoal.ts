import { useBinders } from "@/hooks/queries";
import { formatList } from "@/lib/utils";
import { REGIONS } from "../constants";

type Range = { first: number; last: number };

const overlaps = (a: Range, b: Range) => a.first <= b.last && a.last >= b.first;

// The collection's goal: a card for every Pokémon a Pokédex binder keeps a
// pocket for. The setup makes the first binders; set_overview counts the same
// way in SQL. Until there is one, the app is not set up (SetupGate).
export function useGoal() {
  const binders = useBinders();
  const ranges: Range[] = (binders.data ?? [])
    .filter((binder) => binder.kind === "pokedex")
    .map((binder) => ({ first: binder.first_pokemon_id!, last: binder.last_pokemon_id! }));
  const regions = REGIONS.filter((region) => ranges.some((range) => overlaps(range, region)));
  const labels = regions.map((region) => region.label);
  return {
    isLoading: binders.isLoading,
    error: binders.error,
    isSetUp: ranges.length > 0,
    inGoal: (pokemonId: number) =>
      ranges.some((range) => pokemonId >= range.first && pokemonId <= range.last),
    // The regions with a Pokédex binder, and the rest.
    regions,
    others: REGIONS.filter((region) => !regions.includes(region)),
    // "Kanto and Johto", for "Of the 54 Pokémon from Kanto and Johto"; "Kanto
    // or Johto" for "No Kanto or Johto Pokémon".
    label: formatList(labels),
    labelOr: formatList(labels, "or"),
  };
}
