import type { Binder, OwnedCard } from "@/hooks/queries";
import { REGIONS } from "@/features/pokedex/constants";

// Pages and pockets of the virtual binders. Pages and pockets count from 1, as
// written on the card pages ("page 3, pocket 7").

export type BinderPlace = { binder: Binder; page: number; pocket: number };

type Section = { label: string; first: number; last: number };

// A range of the Pokédex, cut where the regions change: in a Pokédex binder,
// each part starts on a fresh page.
function rangeSections(first: number, last: number): Section[] {
  return REGIONS.filter((region) => region.last >= first && region.first <= last).map(
    (region) => ({
      label: region.label,
      first: Math.max(region.first, first),
      last: Math.min(region.last, last),
    }),
  );
}

function sections(binder: Binder): Section[] {
  const first = binder.first_pokemon_id!;
  const last = binder.last_pokemon_id!;
  const cut = rangeSections(first, last);
  return cut.length ? cut : [{ label: binder.name ?? "", first, last }];
}

const pageCount = (section: Section, perPage: number) =>
  Math.ceil((section.last - section.first + 1) / perPage);

// A Pokédex binder's pages, with the binder's size when it's known: "29 of 40
// pages".
export function pagesLabel(binder: Binder) {
  const used = pokedexPages(binder).length;
  return binder.page_count ? `${used} of ${binder.page_count} pages` : `${used} pages`;
}

// How many pages a Pokédex binder for this range fills.
export const rangePageCount = (first: number, last: number, perPage: number) =>
  rangeSections(first, last).reduce((pages, section) => pages + pageCount(section, perPage), 0);

// Each page's pockets: the number of the Pokémon it's kept for, or null for
// the pockets left after a region's last Pokémon.
export function pokedexPages(binder: Binder): (number | null)[][] {
  const perPage = binder.pockets_per_page!;
  return sections(binder).flatMap((section) =>
    Array.from({ length: pageCount(section, perPage) }, (_, page) =>
      Array.from({ length: perPage }, (_, pocket) => {
        const pokemonId = section.first + page * perPage + pocket;
        return pokemonId <= section.last ? pokemonId : null;
      }),
    ),
  );
}

// The page each region starts on, to jump to it.
export function pokedexSections(binder: Binder) {
  let page = 1;
  return sections(binder).map((section) => {
    const start = { label: section.label, page };
    page += pageCount(section, binder.pockets_per_page!);
    return start;
  });
}

// The Pokédex binder that keeps a pocket for this Pokémon, and where.
export function pokemonPlace(pokemonId: number, binders: Binder[]): BinderPlace | null {
  const binder = binders.find(
    (candidate) =>
      candidate.kind === "pokedex" &&
      pokemonId >= candidate.first_pokemon_id! &&
      pokemonId <= candidate.last_pokemon_id!,
  );
  if (!binder) return null;
  const perPage = binder.pockets_per_page!;
  let page = 1;
  for (const section of sections(binder)) {
    if (pokemonId <= section.last) {
      const offset = pokemonId - section.first;
      return { binder, page: page + Math.floor(offset / perPage), pocket: (offset % perPage) + 1 };
    }
    page += pageCount(section, perPage);
  }
  return null;
}

// A free binder's pocket number (counted through the binder) on its page.
export const freePlace = (binder: Binder, binderPocket: number): BinderPlace => ({
  binder,
  page: Math.ceil(binderPocket / binder.pockets_per_page!),
  pocket: ((binderPocket - 1) % binder.pockets_per_page!) + 1,
});

// Where a card is: the card in its Pokémon's slot sits in its Pokédex binder
// (unless it's kept outside the binders: a top loader, a slab); any other
// card in the free binder it was put in, if any.
export function cardPlace(
  card: Pick<
    OwnedCard,
    "pokemon_id" | "is_featured" | "kept_outside" | "binder_id" | "binder_pocket"
  >,
  binders: Binder[],
): BinderPlace | null {
  if (card.is_featured && !card.kept_outside) {
    const place = pokemonPlace(card.pokemon_id!, binders);
    if (place) return place;
  }
  const binder = binders.find((candidate) => candidate.id === card.binder_id);
  return binder && card.binder_pocket ? freePlace(binder, card.binder_pocket) : null;
}

export const placeUrl = (place: BinderPlace) =>
  `/binders/${place.binder.id}?page=${place.page}&pocket=${place.pocket}`;
