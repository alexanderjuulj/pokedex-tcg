import type { Region } from "../types";

// The National Pokédex by the region each Pokémon is from.
export const REGIONS: {
  value: Region;
  label: string;
  generation: string;
  first: number;
  last: number;
  // Shown on the region's card: its three starters (Hisui has none of its
  // own: three of its new Pokémon).
  starters: number[];
}[] = [
  { value: "kanto", label: "Kanto", generation: "Generation I", first: 1, last: 151, starters: [1, 4, 7] },
  { value: "johto", label: "Johto", generation: "Generation II", first: 152, last: 251, starters: [152, 155, 158] },
  { value: "hoenn", label: "Hoenn", generation: "Generation III", first: 252, last: 386, starters: [252, 255, 258] },
  { value: "sinnoh", label: "Sinnoh", generation: "Generation IV", first: 387, last: 493, starters: [387, 390, 393] },
  { value: "unova", label: "Unova", generation: "Generation V", first: 494, last: 649, starters: [495, 498, 501] },
  { value: "kalos", label: "Kalos", generation: "Generation VI", first: 650, last: 721, starters: [650, 653, 656] },
  { value: "alola", label: "Alola", generation: "Generation VII", first: 722, last: 809, starters: [722, 725, 728] },
  { value: "galar", label: "Galar", generation: "Generation VIII", first: 810, last: 898, starters: [810, 813, 816] },
  { value: "hisui", label: "Hisui", generation: "Generation VIII", first: 899, last: 905, starters: [899, 900, 901] },
  { value: "paldea", label: "Paldea", generation: "Generation IX", first: 906, last: 1025, starters: [906, 909, 912] },
];

// The collection's goal is the regions with a Pokédex binder (useGoal).
