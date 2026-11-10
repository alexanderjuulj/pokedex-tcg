import type { OwnedCard, Purchase, PurchaseItem } from "@/hooks/queries";
import { daysBetween, formatDate, formatList, todayIso } from "@/lib/utils";
import { PRODUCT_NAMES, PULLED_FROM_DAYS } from "./constants";
import type { PurchaseProduct } from "./types";

// What the cards have cost: the sums behind the Spending page, a purchase's
// page and a card's "Pulled from". The views give each line its share of the
// shipping (by price), so the sums here only add up.

type Titled = Pick<PurchaseItem, "name" | "set_name" | "product">;

// What a line is, without how many: its own name ("Charizard ex Premium
// Collection"), else the set's and the product's ("Surging Sparks Elite
// Trainer Box").
export function itemTitle(item: Titled): string {
  if (item.name) return item.name;
  const product = PRODUCT_NAMES[item.product as PurchaseProduct];
  return [item.set_name, product].filter(Boolean).join(" ") || "Something else";
}

// "3 × Surging Sparks booster pack".
export const itemLabel = (item: Titled & Pick<PurchaseItem, "quantity">) =>
  item.quantity && item.quantity > 1 ? `${item.quantity} × ${itemTitle(item)}` : itemTitle(item);

// "Surging Sparks Elite Trainer Box and 3 × Prismatic Evolutions booster
// pack", the first three lines and how many more.
export function purchaseSummary(items: PurchaseItem[]): string {
  const labels = items.slice(0, 3).map(itemLabel);
  const more = items.length - labels.length;
  return more ? `${labels.join(", ")} and ${more} more` : formatList(labels);
}

const sum = <T>(rows: T[], value: (row: T) => number | null) =>
  rows.reduce((total, row) => total + (value(row) ?? 0), 0);

// What a booster pack cost, with its share of the shipping, over the lines
// that hold packs. Null without any.
export function costPerPack(items: PurchaseItem[]): number | null {
  const withPacks = items.filter((item) => (item.pack_count ?? 0) > 0);
  const packs = sum(withPacks, (item) => item.pack_count);
  return packs ? Math.round(sum(withPacks, (item) => item.cost) / packs) : null;
}

// The lines with cards logged from them. The others are packs not opened yet
// (or not logged), which would make every Pokémon look dearer.
const opened = (items: PurchaseItem[]) => items.filter((item) => (item.card_count ?? 0) > 0);

// What one Pokémon cost: the opened lines' cost over the Pokémon their cards
// put in the Pokédex, new from any region (slot_count) or the goal's, the
// ones you need (goal_count). Null without any.
export function costPerPokemon(
  items: PurchaseItem[],
  count: "slot_count" | "goal_count",
): number | null {
  const lines = opened(items);
  const pokemon = sum(lines, (item) => item[count]);
  return pokemon ? Math.round(sum(lines, (item) => item.cost) / pokemon) : null;
}

// What the lines with no card logged yet cost: left out of costPerPokemon.
export const unopenedCost = (items: PurchaseItem[]) =>
  sum(items.filter((item) => !item.card_count), (item) => item.cost);

// The Spending page's totals. "This year" is the calendar year of today.
export function spendingTotals(purchases: Purchase[], items: PurchaseItem[]) {
  const year = todayIso().slice(0, 4);
  const thisYear = purchases.filter((purchase) => purchase.bought_on?.startsWith(year));
  return {
    total: sum(purchases, (purchase) => purchase.total),
    shipping: sum(purchases, (purchase) => purchase.shipping),
    thisYear: sum(thisYear, (purchase) => purchase.total),
    thisYearCount: thisYear.length,
    packs: sum(purchases, (purchase) => purchase.pack_count),
    perPack: costPerPack(items),
    cards: sum(purchases, (purchase) => purchase.card_count),
    // Pokémon new in the Pokédex, and of those the goal's.
    newPokemon: sum(purchases, (purchase) => purchase.slot_count),
    perNewPokemon: costPerPokemon(items, "slot_count"),
    goalPokemon: sum(purchases, (purchase) => purchase.goal_count),
    perGoalPokemon: costPerPokemon(items, "goal_count"),
    unopened: unopenedCost(items),
  };
}

export type SetSpending = {
  // Null: the lines of no one set (mixes, bulk), together.
  cardSetId: number | null;
  name: string;
  hasLogo: boolean;
  packs: number;
  cost: number;
  perPack: number | null;
  cards: number;
  // The goal's Pokémon its cards caught, and what each cost.
  goalPokemon: number;
  perGoalPokemon: number | null;
};

// What each set has cost, with the shipping, the most first.
export function spendingBySet(items: PurchaseItem[]): SetSpending[] {
  const bySet = new Map<number | null, PurchaseItem[]>();
  for (const item of items) {
    bySet.set(item.card_set_id, [...(bySet.get(item.card_set_id) ?? []), item]);
  }
  return [...bySet.entries()]
    .map(([cardSetId, lines]) => ({
      cardSetId,
      name: cardSetId === null ? "Mixes & other" : (lines[0].set_name ?? "A set"),
      hasLogo: Boolean(lines[0].has_logo),
      packs: sum(lines, (line) => line.pack_count),
      cost: sum(lines, (line) => line.cost),
      perPack: costPerPack(lines),
      cards: sum(lines, (line) => line.card_count),
      goalPokemon: sum(lines, (line) => line.goal_count),
      perGoalPokemon: costPerPokemon(lines, "goal_count"),
    }))
    .sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name));
}

// "Surging Sparks Elite Trainer Box · 10 Nov · Cardmarket", for picking it.
export const pulledFromLabel = (item: PurchaseItem) =>
  [itemTitle(item), formatDate(item.bought_on), item.shop].filter(Boolean).join(" · ");

// The card form's "Pulled from": every purchase line, newest first. A card
// being added starts at the newest line of its set bought within the last
// PULLED_FROM_DAYS (opening a pack, its cards go in one by one); an edited one
// at the line it has.
export function pulledFromChoices(
  items: PurchaseItem[],
  card: OwnedCard | null,
  cardSetId: number | null,
) {
  const today = todayIso();
  const recent = card
    ? undefined
    : items.find(
        (item) =>
          cardSetId !== null &&
          item.card_set_id === cardSetId &&
          daysBetween(item.bought_on!, today) <= PULLED_FROM_DAYS,
      );
  const initial = card?.purchase_item_id ?? recent?.id ?? null;
  return {
    items: [
      { value: "none", label: "Not from a purchase" },
      ...items.map((item) => ({ value: String(item.id), label: pulledFromLabel(item) })),
    ],
    initial: initial === null ? "none" : String(initial),
  };
}
