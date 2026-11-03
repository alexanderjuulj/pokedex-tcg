import type { Binder, OwnedCard } from "@/hooks/queries";
import { freePlace, pokemonPlace, type BinderPlace } from "@/features/binders/layout";

// Which binder a card goes in, picked in the card form:
// - "slot": its Pokémon's pocket in the Pokédex binder. A Pokémon's first card
//   always takes it (a trigger), and another card can take it over
//   (set_featured_card).
// - "binder:<id>": the first empty pocket of a free binder (put_in_binder).
// - "none": in no binder; `location` then says where it is.
//
// A graded card is in a slab, which doesn't fit in a pocket, so it's never in
// a binder. As a Pokémon's first card it still takes the slot (it counts for
// the Pokémon), but its pocket stays empty, and a loose card fills it.
export type Placement = "slot" | "none" | `binder:${number}`;

type Choice = { value: Placement; label: string };

const placeLabel = (place: BinderPlace) =>
  `${place.binder.name} · page ${place.page}, pocket ${place.pocket}`;

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
// Pokémon's first card (or when the card in its slot is graded), else the
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
  hint: string | null;
  // Whether "slot" takes the pocket over from another card (set_featured_card)
  // rather than getting it by itself.
  swapsSlot: boolean;
} {
  const slot = pokemonPlace(pokemonId, binders);
  const holdsSlot = Boolean(card?.is_featured && card.pokemon_id === pokemonId);
  const holder = cards.find(
    (other) => other.pokemon_id === pokemonId && other.is_featured && other.id !== card?.id,
  );

  if (graded) {
    return {
      items: [{ value: "none", label: "Not in a binder" }],
      initial: "none",
      hint:
        slot && !holder
          ? `A slab doesn't fit in a pocket. It still counts for this Pokémon, and its pocket in ${slot.binder.name} stays free for a loose card.`
          : "A slab doesn't fit in a binder pocket.",
      swapsSlot: false,
    };
  }

  // The slot card, or the Pokémon's first: its Pokédex pocket is the only
  // place for it.
  if (slot && !holder) {
    return {
      items: [{ value: "slot", label: placeLabel(slot) }],
      initial: "slot",
      hint: holdsSlot
        ? "It's this Pokémon's card in the Pokédex. To take it out, put another of its cards in the slot."
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
  // The card in the slot is graded, so the pocket is empty: a loose card
  // belongs there first.
  const pocketFree = Boolean(holder?.grading_company);
  if (slot && pocketFree) {
    items.unshift({ value: "slot", label: placeLabel(slot) });
  } else if (slot) {
    items.push({ value: "slot", label: `${placeLabel(slot)}, instead of the card there` });
  }
  items.push({ value: "none", label: "Not in a binder" });

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
    hint:
      slot && pocketFree
        ? "Its Pokédex pocket is empty: the card in its slot is graded, so it's kept outside the binder."
        : null,
    swapsSlot: true,
  };
}
