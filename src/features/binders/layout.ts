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

// Whether a card fills its Pokémon's pocket in a Pokédex binder: in it, or
// from outside it when kept outside (a top loader, a slab).
export const inPokedexBinder = (card: Pick<OwnedCard, "binder_kind">) =>
  card.binder_kind === "pokedex";

// Whether a Pokédex binder keeps a pocket for this Pokémon: its range, as
// binder_pokemon has it in SQL.
export const keepsPocketFor = (binder: Binder, pokemonId: number) =>
  binder.kind === "pokedex" &&
  pokemonId >= binder.first_pokemon_id! &&
  pokemonId <= binder.last_pokemon_id!;

// The Pokédex binders keeping a pocket for this Pokémon, the ones being
// collected first.
export const pokedexBindersFor = (pokemonId: number, binders: Binder[]) =>
  binders
    .filter((binder) => keepsPocketFor(binder, pokemonId))
    .sort((a, b) => Number(Boolean(a.finished_on)) - Number(Boolean(b.finished_on)));

// A Pokémon's pocket in a Pokédex binder: its page and place on it.
export function pocketPlace(binder: Binder, pokemonId: number): BinderPlace | null {
  if (!keepsPocketFor(binder, pokemonId)) return null;
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

// Where a card is: in a Pokédex binder its Pokémon's pocket (none when it
// holds it from outside: a top loader, a slab), in a free binder the pocket
// it was put in.
export function cardPlace(
  card: Pick<OwnedCard, "pokemon_id" | "kept_outside" | "binder_id" | "binder_pocket">,
  binders: Binder[],
): BinderPlace | null {
  const binder = binders.find((candidate) => candidate.id === card.binder_id);
  if (!binder || card.kept_outside) return null;
  if (binder.kind === "pokedex") return pocketPlace(binder, card.pokemon_id!);
  return card.binder_pocket ? freePlace(binder, card.binder_pocket) : null;
}

export const placeUrl = (place: BinderPlace) =>
  `/binders/${place.binder.id}?page=${place.page}&pocket=${place.pocket}`;
