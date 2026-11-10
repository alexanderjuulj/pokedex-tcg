import type { Binder, OwnedCard, Pokemon } from "@/hooks/queries";
import { REGIONS } from "@/features/pokedex/constants";

// Pages and pockets of the virtual binders. Pages and pockets count from 1, as
// written on the card pages ("page 3, pocket 7").

export type BinderPlace = { binder: Binder; page: number; pocket: number };

// What a Pokédex binder's pockets depend on.
export type PokedexEntry = Pick<Pokemon, "id" | "primary_type" | "secondary_type" | "class">;

// Whether a Pokédex binder keeps a pocket for this Pokémon: of its range,
// the ones of its type and class, if it has one. binder_pokemon in SQL.
export function keepsPocketFor(binder: Binder, pokemon: PokedexEntry) {
  const id = pokemon.id!;
  return (
    binder.kind === "pokedex" &&
    id >= binder.first_pokemon_id! &&
    id <= binder.last_pokemon_id! &&
    (!binder.pokemon_type ||
      pokemon.primary_type === binder.pokemon_type ||
      pokemon.secondary_type === binder.pokemon_type) &&
    (!binder.pokemon_class || pokemon.class === binder.pokemon_class)
  );
}

// A binder's Pokémon (in Pokédex order) on its pages: each region on a fresh
// page when regionPages, else one run. A page's last pockets stay empty
// (null) before a fresh page.
export function pagesOf(members: number[], perPage: number, regionPages: boolean) {
  const runs = regionPages
    ? REGIONS.map((region) => members.filter((id) => id >= region.first && id <= region.last)).filter(
        (run) => run.length,
      )
    : [members];
  return runs.flatMap((run) =>
    Array.from({ length: Math.ceil(run.length / perPage) }, (_, page) =>
      Array.from({ length: perPage }, (_, pocket) => run[page * perPage + pocket] ?? null),
    ),
  );
}

// How many pages a region binder for this range fills, each region on a
// fresh page unless regionPages is false, for planning the setup's binders.
export const rangePageCount = (first: number, last: number, perPage: number, regionPages = true) =>
  pagesOf(
    Array.from({ length: last - first + 1 }, (_, index) => first + index),
    perPage,
    regionPages,
  ).length;

// A free binder's pocket number (counted through the binder) on its page.
export const freePlace = (binder: Binder, binderPocket: number): BinderPlace => ({
  binder,
  page: Math.ceil(binderPocket / binder.pockets_per_page!),
  pocket: ((binderPocket - 1) % binder.pockets_per_page!) + 1,
});

// Whether a card fills its Pokémon's pocket in a Pokédex binder: in it, or
// from outside it when kept outside (a top loader, a slab).
export const inPokedexBinder = (card: Pick<OwnedCard, "binder_kind">) =>
  card.binder_kind === "pokedex";

export const placeUrl = (place: BinderPlace) =>
  `/binders/${place.binder.id}?page=${place.page}&pocket=${place.pocket}`;

// The binders' pages and pockets, which for a Pokédex binder depend on its
// Pokémon: built from the binders and the Pokédex (useBinderLayout).
export function binderLayout(binders: Binder[], pokedex: PokedexEntry[]) {
  const entries = new Map(pokedex.map((pokemon) => [pokemon.id!, pokemon]));
  const memberCache = new Map<number, number[]>();
  const pageCache = new Map<number, (number | null)[][]>();

  // The Pokémon a Pokédex binder keeps a pocket for, in Pokédex order.
  const members = (binder: Binder) => {
    let list = memberCache.get(binder.id!);
    if (!list) {
      list = pokedex.filter((pokemon) => keepsPocketFor(binder, pokemon)).map((pokemon) => pokemon.id!);
      memberCache.set(binder.id!, list);
    }
    return list;
  };

  // Each page's pockets: the number of the Pokémon it's kept for, or null.
  const pages = (binder: Binder) => {
    let list = pageCache.get(binder.id!);
    if (!list) {
      list = pagesOf(members(binder), binder.pockets_per_page!, Boolean(binder.region_pages));
      pageCache.set(binder.id!, list);
    }
    return list;
  };

  // A Pokémon's pocket in a Pokédex binder.
  const place = (binder: Binder, pokemonId: number): BinderPlace | null => {
    const list = pages(binder);
    for (let page = 0; page < list.length; page++) {
      const pocket = list[page].indexOf(pokemonId);
      if (pocket !== -1) return { binder, page: page + 1, pocket: pocket + 1 };
    }
    return null;
  };

  return {
    binders,
    members,
    pages,
    place,

    // The page each region starts on, to jump to it.
    sections: (binder: Binder) =>
      REGIONS.flatMap((region) => {
        const first = members(binder).find((id) => id >= region.first && id <= region.last);
        const at = first === undefined ? null : place(binder, first);
        return at ? [{ label: region.label, page: at.page }] : [];
      }),

    // "29 of 40 pages", with the binder's size when it's known.
    pagesLabel: (binder: Binder) => {
      const used = pages(binder).length;
      return binder.page_count ? `${used} of ${binder.page_count} pages` : `${used} pages`;
    },

    // How many pages it would fill with another size or layout.
    pageCount: (binder: Binder, perPage: number, regionPages: boolean) =>
      pagesOf(members(binder), perPage, regionPages).length,

    // The Pokédex binders keeping a pocket for this Pokémon, the ones being
    // collected first.
    bindersFor: (pokemonId: number) => {
      const pokemon = entries.get(pokemonId);
      return pokemon
        ? binders
            .filter((binder) => keepsPocketFor(binder, pokemon))
            .sort((a, b) => Number(Boolean(a.finished_on)) - Number(Boolean(b.finished_on)))
        : [];
    },

    // Where a card is: in a Pokédex binder its Pokémon's pocket (none when
    // it fills it from outside: a top loader, a slab), in a free binder the
    // pocket it was put in.
    cardPlace: (
      card: Pick<OwnedCard, "pokemon_id" | "kept_outside" | "binder_id" | "binder_pocket">,
    ): BinderPlace | null => {
      const binder = binders.find((candidate) => candidate.id === card.binder_id);
      if (!binder || card.kept_outside) return null;
      if (binder.kind === "pokedex") return place(binder, card.pokemon_id!);
      return card.binder_pocket ? freePlace(binder, card.binder_pocket) : null;
    },
  };
}

export type BinderLayout = ReturnType<typeof binderLayout>;
