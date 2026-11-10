import type { PokedexBinderPlan } from "@/hooks/queries";
import { REGIONS } from "@/features/pokedex/constants";
import type { Region } from "@/features/pokedex/types";
import { rangePageCount } from "./layout";

// Splitting the regions to collect over Pokédex binders of one size, for the
// setup and for adding regions later.

export type BinderSize = { pocketsPerPage: number; pageCount: number };

// A planned binder, with how many of its pages its Pokémon fill.
export type PlannedBinder = PokedexBinderPlan & { pages_used: number };

type Range = { first: number; last: number };

// In Pokédex order:
// - A binder keeps one unbroken run of numbers, so regions that aren't
//   neighbours never share one.
// - Neighbours share a binder while they fit (each region still starts on a
//   fresh page), unless every region is to get its own.
// - A region that doesn't fit what's left starts a new binder, and one too big
//   for a whole binder fills as many as it needs.
export function planPokedexBinders(
  picked: Region[],
  size: BinderSize,
  ownBinderEach: boolean,
  regionPages = true,
): PlannedBinder[] {
  const { pocketsPerPage: perPage, pageCount: capacity } = size;
  if (!(perPage > 0 && capacity > 0)) return [];

  const ranges: Range[] = [];
  let current: Range | null = null;
  for (const region of REGIONS.filter((candidate) => picked.includes(candidate.value))) {
    const joins =
      current !== null &&
      !ownBinderEach &&
      current.last + 1 === region.first &&
      rangePageCount(current.first, region.last, perPage, regionPages) <= capacity;
    if (joins) {
      current!.last = region.last;
      continue;
    }
    const perBinder = capacity * perPage;
    for (let first = region.first; first <= region.last; first += perBinder) {
      current = { first, last: Math.min(first + perBinder - 1, region.last) };
      ranges.push(current);
    }
  }

  return ranges.map((range) => ({
    name: binderName(range, ranges),
    first_pokemon_id: range.first,
    last_pokemon_id: range.last,
    pockets_per_page: perPage,
    page_count: capacity,
    region_pages: regionPages,
    pages_used: rangePageCount(range.first, range.last, perPage, regionPages),
  }));
}

// "Kanto & Johto", "Kanto, Johto & Hoenn"; a region split over several
// binders is numbered: "Kanto 1", "Kanto 2 & Johto".
function binderName(range: Range, ranges: Range[]): string {
  const overlaps = (a: Range, b: Range) => a.first <= b.last && a.last >= b.first;
  const labels = REGIONS.filter((region) => overlaps(region, range)).map((region) => {
    const parts = ranges.filter((candidate) => overlaps(candidate, region));
    return parts.length > 1 ? `${region.label} ${parts.indexOf(range) + 1}` : region.label;
  });
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} & ${labels.at(-1)}` : labels[0];
}
