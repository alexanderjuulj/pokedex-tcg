import type { Binder, OwnedCard } from "@/hooks/queries";
import {
  freePlace,
  inPokedexBinder,
  pocketPlace,
  pokedexBindersFor,
  type BinderPlace,
} from "@/features/binders/layout";

// Which binder a card goes in, picked in the card form:
// - "pocket:<id>": its Pokémon's pocket in a Pokédex binder. An empty one
//   (the Pokémon's first card) or the one it fills already is simply set; one
//   another card fills is taken over (put_in_pocket), that card going
//   outside the binders.
// - "binder:<id>": the first empty pocket of a free binder (put_in_binder).
// - "none": kept outside the binders (`kept_outside`), in a top loader or a
//   box; `location` then says where.
//
// A card can fill its Pokémon's pocket from outside the binder too: it still
// counts, but the pocket shows empty, and a loose card added later starts
// there. A graded card is always outside: a slab doesn't fit in a pocket.
export type Placement = "none" | `pocket:${number}` | `binder:${number}`;

type Choice = { value: Placement; label: string };

const placeLabel = (place: BinderPlace) =>
  `${place.binder.name} · page ${place.page}, pocket ${place.pocket}`;

const NONE: Choice = { value: "none", label: "Not in a binder" };

// A free binder's first empty pocket, leaving out the card being placed.
function nextPocket(binder: Binder, cards: OwnedCard[], cardId: number | null) {
  const used = new Set(
    cards
      .filter((other) => other.binder_id === binder.id && other.id !== cardId)
      .map((other) => other.binder_pocket),
  );
  let pocket = 1;
  while (used.has(pocket)) pocket++;
  return pocket;
}

const idOf = (placement: Placement, prefix: "pocket:" | "binder:") =>
  placement.startsWith(prefix) ? Number(placement.slice(prefix.length)) : null;

// What the card's row says once placed, and what follows its save: taking a
// pocket over from another card, or a free binder's next pocket.
export type PlacementPlan = {
  values: { binder_id?: number | null; binder_pocket?: null; kept_outside?: boolean };
  then: { pocket: number } | { binder: number } | null;
};

// The choices for a card of this Pokémon, and the one to start from: where it
// is now, or for a new card where it belongs. Its Pokédex pocket for a
// Pokémon's first card (or when the card there is kept outside), else the
// first free binder (duplicates and other regions' cards), else none.
export function placementChoices(
  card: OwnedCard | null,
  pokemonId: number,
  graded: boolean,
  binders: Binder[],
  cards: OwnedCard[],
): {
  items: Choice[];
  initial: Placement;
  hint: (placement: Placement) => string | null;
  plan: (placement: Placement) => PlacementPlan;
} {
  // This Pokémon's pockets, each with the other card filling it, if any.
  const pockets = pokedexBindersFor(pokemonId, binders).map((binder) => ({
    binder,
    place: pocketPlace(binder, pokemonId)!,
    holder:
      cards.find(
        (other) =>
          other.binder_id === binder.id && other.pokemon_id === pokemonId && other.id !== card?.id,
      ) ?? null,
  }));
  // The pocket this card fills, or an empty one it gets (the Pokémon's
  // first card).
  const fills = card && card.pokemon_id === pokemonId && inPokedexBinder(card) ? card.binder_id : null;
  const own =
    pockets.find((pocket) => pocket.binder.id === fills) ??
    pockets.find((pocket) => !pocket.holder) ??
    null;
  const stillCounts = own
    ? `It still counts for this Pokémon, and its pocket in ${own.binder.name} stays free for a loose card.`
    : null;

  // Leaving whatever pocket it's in, for one that follows the save.
  const leaving = { binder_id: null, binder_pocket: null, kept_outside: true } as const;
  const plan = (placement: Placement): PlacementPlan => {
    const pocket = idOf(placement, "pocket:");
    const free = idOf(placement, "binder:");
    if (pocket !== null && pocket === own?.binder.id) {
      return { values: { binder_id: pocket, binder_pocket: null, kept_outside: false }, then: null };
    }
    if (pocket !== null) {
      return { values: card && !inPokedexBinder(card) ? {} : leaving, then: { pocket } };
    }
    if (free !== null) {
      if (card?.binder_id === free) return { values: {}, then: null };
      return { values: card && !inPokedexBinder(card) ? {} : leaving, then: { binder: free } };
    }
    // Outside the binders: holding its own pocket from there, if it has one.
    return {
      values: own
        ? { binder_id: own.binder.id!, binder_pocket: null, kept_outside: true }
        : leaving,
      then: null,
    };
  };

  if (graded) {
    return {
      items: [NONE],
      initial: "none",
      hint: () =>
        stillCounts
          ? `A slab doesn't fit in a pocket. ${stillCounts}`
          : "A slab doesn't fit in a binder pocket.",
      plan,
    };
  }

  if (own) {
    const value: Placement = `pocket:${own.binder.id!}`;
    const holds = fills === own.binder.id;
    return {
      items: [{ value, label: placeLabel(own.place) }, NONE],
      initial: holds && card?.kept_outside ? "none" : value,
      hint: (placement) =>
        placement === "none"
          ? `Kept outside the binder, in a top loader say. ${stillCounts}`
          : holds
            ? "It's this Pokémon's card in the Pokédex. Another of its cards can take the pocket from its own page."
            : "A Pokémon's first card goes in its pocket in the Pokédex binder.",
      plan,
    };
  }

  const freeBinders = binders.filter((binder) => binder.kind === "free");
  const items: Choice[] = freeBinders.map((binder) => {
    const here = card?.binder_id === binder.id && card.binder_pocket;
    const place = freePlace(binder, here || nextPocket(binder, cards, card?.id ?? null));
    return { value: `binder:${binder.id!}`, label: placeLabel(place) };
  });
  // A pocket whose card is kept outside shows empty: a loose card belongs
  // there first.
  const open = pockets.find((pocket) => pocket.holder?.kept_outside);
  for (const pocket of pockets) {
    const value: Placement = `pocket:${pocket.binder.id!}`;
    if (pocket === open) items.unshift({ value, label: placeLabel(pocket.place) });
    else items.push({ value, label: `${placeLabel(pocket.place)}, instead of the card there` });
  }
  items.push(NONE);

  const current: Placement | null = card
    ? card.binder_id && !inPokedexBinder(card)
      ? `binder:${card.binder_id}`
      : "none"
    : null;
  const initial: Placement =
    current ??
    (open
      ? `pocket:${open.binder.id!}`
      : freeBinders.length
        ? `binder:${freeBinders[0].id!}`
        : "none");
  return {
    items,
    initial,
    hint: () =>
      open
        ? `Its pocket in ${open.binder.name} is empty: the card there is kept outside the binder.`
        : null,
    plan,
  };
}
