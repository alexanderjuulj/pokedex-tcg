import type { Binder } from "@/hooks/queries";
import { formatDexNumber } from "@/lib/pokemon";
import { CLASSES, REGIONS, TYPE_LABELS } from "@/features/pokedex/constants";
import type { PokemonType } from "@/features/pokedex/types";

// The regions a range spans: "every region", "Kanto", "Kanto–Johto".
export function regionSpan(first: number, last: number) {
  const spanned = REGIONS.filter((region) => region.first <= last && region.last >= first);
  if (spanned.length === REGIONS.length) return "every region";
  return spanned.length > 1
    ? `${spanned[0].label}–${spanned.at(-1)!.label}`
    : (spanned[0]?.label ?? "");
}

// What a Pokédex binder collects: "#001–#251" for a region binder, "Water
// type · every region", "Starters · Kanto–Johto".
export function binderRule(binder: Binder) {
  const first = binder.first_pokemon_id!;
  const last = binder.last_pokemon_id!;
  const kept = binder.pokemon_type
    ? `${TYPE_LABELS[binder.pokemon_type as PokemonType]} type`
    : binder.pokemon_class
      ? (CLASSES.find((entry) => entry.value === binder.pokemon_class)?.plural ?? binder.pokemon_class)
      : null;
  return kept
    ? `${kept} · ${regionSpan(first, last)}`
    : `${formatDexNumber(first)}–${formatDexNumber(last)}`;
}
