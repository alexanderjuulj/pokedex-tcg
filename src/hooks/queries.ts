import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  TableName,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/database.types";
import { api } from "@/lib/api";
import { BINDER_INVALIDATES, CARD_INVALIDATES } from "@/constants/invalidates";

// A Pokédex entry with how many of its cards we own.
export type Pokemon = Tables<"pokemon_overview">;
// One of our cards, with its catalogue details filled in.
export type OwnedCard = Tables<"owned_cards">;
// A printed card in the catalogue, as listed under one Pokémon.
export type CatalogCard = Tables<"pokemon_catalog_cards">;
// A set, with how many Pokémon of the goal (what the Pokédex binders cover)
// it holds and how many of those are still missing.
export type CardSet = Tables<"set_overview">;
// A virtual binder, with how many cards it holds.
export type Binder = Tables<"binder_overview">;

// Joined rows embed their references as `Ref`s: XWithRefs = X & { item: Ref }.
export type Ref = { id: number; name: string };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

// All 1,025 in one cached query; pages filter it client-side.
export function usePokedex() {
  return useQuery({
    queryKey: ["pokemon_overview"],
    queryFn: () => api.list("pokemon_overview", { order: ["id"] }),
  });
}

export function usePokemon(id: number) {
  return useQuery({
    queryKey: ["pokemon_overview", id],
    queryFn: () => api.get("pokemon_overview", id),
  });
}

// The collection is small enough to fetch whole, newest first.
export function useOwnedCards() {
  return useQuery({
    queryKey: ["owned_cards"],
    queryFn: () => api.list("owned_cards", { order: ["-created_at"] }),
  });
}

// One Pokémon's cards, its featured card first.
export function usePokemonCards(pokemonId: number) {
  return useQuery({
    queryKey: ["owned_cards", { pokemonId }],
    queryFn: () =>
      api.list("owned_cards", {
        where: { pokemon_id: pokemonId },
        order: ["-is_featured", "created_at"],
      }),
  });
}

export function useOwnedCard(id: number) {
  return useQuery({
    queryKey: ["owned_cards", id],
    queryFn: () => api.get("owned_cards", id),
  });
}

// Every printed card of one Pokémon, oldest set first. Up to a few hundred
// (Pikachu), so it's fetched per Pokémon rather than all 7,000 at once.
export function usePokemonCatalog(pokemonId: number) {
  return useQuery({
    queryKey: ["pokemon_catalog_cards", { pokemonId }],
    queryFn: () =>
      api.list("pokemon_catalog_cards", {
        where: { pokemon_id: pokemonId },
        order: ["released_on", "tcgdex_id"],
      }),
  });
}

// Every set with Pokémon cards, newest first. About 200.
export function useSets() {
  return useQuery({
    queryKey: ["set_overview"],
    queryFn: () => api.list("set_overview", { order: ["-released_on", "name"] }),
  });
}

export function useSet(id: number) {
  return useQuery({
    queryKey: ["set_overview", id],
    queryFn: () => api.get("set_overview", id),
  });
}

// One set's Pokémon cards: a row per card and Pokémon on it.
export function useSetCatalog(cardSetId: number) {
  return useQuery({
    queryKey: ["pokemon_catalog_cards", { cardSetId }],
    queryFn: () =>
      api.list("pokemon_catalog_cards", {
        where: { card_set_id: cardSetId },
        order: ["pokemon_id"],
      }),
  });
}

// The binders, the Pokédex ones first.
export function useBinders() {
  return useQuery({
    queryKey: ["binder_overview"],
    queryFn: () => api.list("binder_overview", { order: ["-kind", "created_at"] }),
  });
}

export function useBinder(id: number) {
  return useQuery({
    queryKey: ["binder_overview", id],
    queryFn: () => api.get("binder_overview", id),
  });
}

// The Pokémon on one catalogue card: two or more on a tag-team card.
export function useCatalogCardPokemon(catalogCardId: number | null) {
  return useQuery({
    queryKey: ["pokemon_catalog_cards", { catalogCardId }],
    queryFn: () =>
      api.list("pokemon_catalog_cards", { where: { id: catalogCardId! } }),
    enabled: catalogCardId !== null,
    select: (rows) => rows.map((row) => row.pokemon_id!),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

// Singular labels for the create/update toasts. Only cards are writable
// through the API; the rest is reference data from the pulls.
const TABLE_LABELS: Record<TableName, string> = {
  cards: "Card",
  binders: "Binder",
  pokemon: "Pokémon",
  card_sets: "Set",
  catalog_cards: "Catalogue card",
  catalog_card_pokemon: "Catalogue link",
};

export function useTableMutations<T extends TableName>(
  table: T,
  invalidate: string[],
  // silent: no success toasts, for rapid taps like ticking off a list.
  // Errors still toast.
  options: { silent?: boolean } = {},
) {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    Promise.all(
      invalidate.map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );

  const label = TABLE_LABELS[table];
  const success = (message: string) =>
    options.silent ? {} : { successMessage: message };

  const create = useMutation({
    mutationFn: (values: TablesInsert<T>) => api.create(table, values),
    onSuccess,
    meta: {
      ...success(`${label} added`),
      errorMessage: `Could not add ${label.toLowerCase()}`,
    },
  });

  const update = useMutation({
    mutationFn: ({ id, values }: { id: number; values: TablesUpdate<T> }) =>
      api.update(table, id, values),
    onSuccess,
    meta: {
      ...success(`${label} saved`),
      errorMessage: `Could not save ${label.toLowerCase()}`,
    },
  });

  // No meta: useConfirmDelete toasts deletes itself.
  const remove = useMutation({
    mutationFn: (id: number) => api.remove(table, id),
    onSuccess,
  });

  return { create, update, remove };
}

// Puts a card in its Pokémon's slot (server/rpc.ts), swapping out the old one
// in the same transaction.
export function useSetFeaturedCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.rpc<{ id: number }>("set_featured_card", { id }),
    onSuccess: () =>
      Promise.all(
        CARD_INVALIDATES.map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      ),
    meta: {
      successMessage: "Featured card set",
      errorMessage: "Could not set the featured card",
    },
  });
}

// Puts a card in a free binder's first empty pocket (server/rpc.ts).
export function usePutInBinder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { card_id: number; binder_id: number }) =>
      api.rpc<{ card_id: number; binder_id: number; binder_pocket: number }>(
        "put_in_binder",
        values,
      ),
    onSuccess: () =>
      Promise.all(
        BINDER_INVALIDATES.map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      ),
    meta: { errorMessage: "Could not put the card in the binder" },
  });
}

// A Pokédex binder the setup planned (features/binders/plan.ts).
export type PokedexBinderPlan = {
  name: string;
  first_pokemon_id: number;
  last_pokemon_id: number;
  pockets_per_page: number;
  page_count: number | null;
};

// Makes the planned Pokédex binders in one transaction (server/rpc.ts).
export function useAddPokedexBinders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (binders: PokedexBinderPlan[]) =>
      api.rpc<{ ids: number[] }>("add_pokedex_binders", { binders }),
    onSuccess: () =>
      Promise.all(
        BINDER_INVALIDATES.map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      ),
    meta: { errorMessage: "Could not make the binders" },
  });
}
