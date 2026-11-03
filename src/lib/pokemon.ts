// Shared Pokédex and card logic: numbers, images and units.

import { fold, parseDate } from "./utils";

// The official artwork, served with the app from public/pokemon/. It isn't in
// the repository: pnpm pokemon:art downloads it.
export const artUrl = (pokemonId: number) =>
  `/pokemon/${String(pokemonId).padStart(3, "0")}.webp`;

// The catalogue's card scans, served by the API (server/images.ts). "low"
// (245px wide) for grids, "high" (600px) for a single card.
export const cardImageUrl = (catalogCardId: number, size: "low" | "high") =>
  `/api/card-images/${catalogCardId}/${size}`;

// A set's logo or symbol, served by the API like the scans.
export const setImageUrl = (cardSetId: number, image: "logo" | "symbol") =>
  `/api/set-images/${cardSetId}/${image}`;

export const formatDexNumber = (pokemonId: number) =>
  `#${String(pokemonId).padStart(3, "0")}`;

// Searching Pokémon: a number matches from its start ("2" finds #2, #20–29,
// #200–251), a name anywhere in it. The query is already folded.
export function matchesPokemon(pokemonId: number, name: string, query: string) {
  const number = query.replace(/^#0*/, "");
  if (/^\d+$/.test(number)) return String(pokemonId).startsWith(number);
  return fold(name).includes(query);
}

export const formatHeight = (heightDm: number) =>
  `${(heightDm / 10).toLocaleString("en-GB")} m`;

export const formatWeight = (weightHg: number) =>
  `${(weightHg / 10).toLocaleString("en-GB")} kg`;

// "4/102" as printed; promos ("SWSH050") and hand-entered numbers as they are.
export function formatCardNumber(
  number: string | null,
  setCardCount: number | null,
): string {
  if (!number) return "—";
  return /^\d+$/.test(number) && setCardCount ? `${number}/${setCardCount}` : number;
}

// When a set came out: "Sep 2023".
export const formatReleased = (releasedOn: string | null) =>
  releasedOn
    ? parseDate(releasedOn).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "Undated";
