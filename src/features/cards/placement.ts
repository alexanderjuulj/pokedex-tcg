import type { Binder, OwnedCard } from "@/hooks/queries";
import { freePlace, pokemonPlace, type BinderPlace } from "@/features/binders/layout";

// Which binder a card goes in, picked in the card form:
// - "slot": its Pokémon's pocket in the Pokédex binder. A Pokémon's first card
//   always takes it (a trigger), and another card can take it over
//   (set_featured_card).
// - "binder:<id>": the first empty pocket of a free binder (put_in_binder).
// - "none": kept outside the binders (`kept_outside`), in a top loader or a
//   box; `location` then says where.
//
// The card in a Pokémon's slot can be kept outside too: it still holds the
// slot (the Pokémon is caught), but its pocket stays empty, and a loose card
// added later starts there. A graded card is always outside: a slab doesn't
// fit in a pocket.
export type Placement = "slot" | "none" | `binder:${number}`;

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

export const binderIdOf = (placement: Placement) =>
  placement.startsWith("binder:") ? Number(placement.slice("binder:".length)) : null;

// The choices for a card of this Pokémon, and the one to start from: where it
// is now, or for a new card where it belongs. The Pokédex pocket for a
// Pokémon's first card (or when the card in its slot is kept outside), else
// the first free binder (duplicates and other regions' cards), else none.
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
  // Whether "slot" takes the pocket over from another card (set_featured_card)
  // rather than getting it by itself.
  swapsSlot: boolean;
} {
  const slot = pokemonPlace(pokemonId, binders);
  const holdsSlot = Boolean(card?.is_featured && card.pokemon_id === pokemonId);
  const holder = cards.find(
    (other) => other.pokemon_id === pokemonId && other.is_featured && other.id !== card?.id,
  );
  // This card has the slot, or gets it as the Pokémon's first.
  const ownsSlot = slot && !holder ? slot : null;
  const stillCounts = ownsSlot
    ? `It still counts for this Pokémon, and its pocket in ${ownsSlot.binder.name} stays free for a loose card.`
    : null;

  if (graded) {
    return {
      items: [NONE],
      initial: "none",
      hint: () =>
        stillCounts
          ? `A slab doesn't fit in a pocket. ${stillCounts}`
          : "A slab doesn't fit in a binder pocket.",
      swapsSlot: false,
    };
  }

  if (ownsSlot) {
    return {
      items: [{ value: "slot", label: placeLabel(ownsSlot) }, NONE],
      initial: holdsSlot && card?.kept_outside ? "none" : "slot",
      hint: (placement) =>
        placement === "none"
          ? `Kept outside the binder, in a top loader say. ${stillCounts}`
          : holdsSlot
            ? "It's this Pokémon's card in the Pokédex. Another of its cards can take the slot from its own page."
            : "A Pokémon's first card goes in its pocket in the Pokédex binder.",
      swapsSlot: false,
    };
  }

  const free = binders.filter((binder) => binder.kind === "free");
  const items: Choice[] = free.map((binder) => {
    const here = card?.binder_id === binder.id && card.binder_pocket;
    const place = freePlace(binder, here || nextPocket(binder, cards, card?.id ?? null));
    return { value: `binder:${binder.id!}`, label: placeLabel(place) };
  });
  // The card in the slot is kept outside, so the pocket is empty: a loose card
  // belongs there first.
  const pocketFree = Boolean(holder?.kept_outside);
  if (slot && pocketFree) {
    items.unshift({ value: "slot", label: placeLabel(slot) });
  } else if (slot) {
    items.push({ value: "slot", label: `${placeLabel(slot)}, instead of the card there` });
  }
  items.push(NONE);

  const current: Placement | null = card
    ? card.binder_id
      ? `binder:${card.binder_id}`
      : "none"
    : null;
  const initial: Placement =
    current ?? (slot && pocketFree ? "slot" : free.length ? `binder:${free[0].id!}` : "none");
  return {
    items,
    initial,
    hint: () =>
      slot && pocketFree
        ? "Its Pokédex pocket is empty: the card in its slot is kept outside the binder."
        : null,
    swapsSlot: true,
  };
}
