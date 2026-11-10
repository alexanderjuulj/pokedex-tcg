import type { PurchaseItem, PurchaseSave } from "@/hooks/queries";
import { parsePrice, priceInput } from "@/lib/money";
import { PRODUCT_PACKS } from "./constants";
import type { PurchaseProduct } from "./types";

// A purchase line as the purchase form edits it: the fields as typed.
export type PurchaseLineDraft = {
  // React's key, stable while lines are added and removed.
  key: number;
  // The saved line's id; null for a new one.
  id: number | null;
  product: PurchaseProduct;
  // A set's id, "none" for a mix, or "" until one is picked.
  setId: string;
  name: string;
  quantity: string;
  price: string;
  packs: string;
  // The cards pulled from the saved line, which lose the link if it goes.
  cardCount: number;
};

let nextKey = 1;

// A new line takes the set of the one before it: an order of a set's
// boosters and its Elite Trainer Box is two lines of one set.
export function newLine(previous?: PurchaseLineDraft): PurchaseLineDraft {
  return {
    key: nextKey++,
    id: null,
    product: "booster",
    setId: previous?.setId ?? "",
    name: "",
    quantity: "1",
    price: "",
    packs: String(PRODUCT_PACKS.booster),
    cardCount: 0,
  };
}

// A saved line, its price written in the collection's currency.
export function lineFromItem(item: PurchaseItem, currency: string): PurchaseLineDraft {
  return {
    key: nextKey++,
    id: item.id,
    product: item.product as PurchaseProduct,
    setId: item.card_set_id === null ? "none" : String(item.card_set_id),
    name: item.name ?? "",
    quantity: String(item.quantity ?? 1),
    price: priceInput(item.unit_price, currency),
    packs: String(item.packs ?? 0),
    cardCount: item.card_count ?? 0,
  };
}

// The packs follow the product while they're its usual number.
export function withProduct(line: PurchaseLineDraft, product: PurchaseProduct): PurchaseLineDraft {
  const usual = line.packs.trim() === String(PRODUCT_PACKS[line.product]);
  return { ...line, product, packs: usual ? String(PRODUCT_PACKS[product]) : line.packs };
}

const wholeNumber = (text: string, min: number) => {
  const value = Number(text.trim());
  return text.trim() !== "" && Number.isInteger(value) && value >= min ? value : null;
};

// A line as the save_purchase RPC takes it, or what's wrong with it.
// example: an amount as the currency writes it, for the message.
export function lineValues(
  line: PurchaseLineDraft,
  example: string,
): { values: PurchaseSave["items"][number] } | { error: string } {
  const name = line.name.trim();
  if (line.setId === "") return { error: "pick its set, or “No one set” for a mix" };
  if (line.setId === "none" && !name) return { error: "say what it is" };
  const quantity = wholeNumber(line.quantity, 1);
  if (quantity === null) return { error: "how many should be 1 or more" };
  const price = parsePrice(line.price);
  if (price === null) return { error: `the price should be an amount, like ${example}` };
  const packs = line.product === "booster" ? 1 : wholeNumber(line.packs, 0);
  if (packs === null) return { error: "the packs should be a whole number" };
  return {
    values: {
      id: line.id,
      product: line.product,
      card_set_id: line.setId === "none" ? null : Number(line.setId),
      name: name || null,
      quantity,
      unit_price: price,
      packs,
    },
  };
}

// The form's running total, as far as the lines can be read: what it costs,
// the packs in it and what one pack comes to with its share of the shipping.
export function draftTotals(lines: PurchaseLineDraft[], shippingText: string) {
  const shipping = parsePrice(shippingText) ?? 0;
  const read = lines.map((line) => {
    const quantity = wholeNumber(line.quantity, 1) ?? 0;
    const packs = line.product === "booster" ? 1 : (wholeNumber(line.packs, 0) ?? 0);
    return { price: quantity * (parsePrice(line.price) ?? 0), packs: quantity * packs };
  });
  const price = read.reduce((total, line) => total + line.price, 0);
  const packs = read.reduce((total, line) => total + line.packs, 0);
  const withPacks = read.filter((line) => line.packs > 0);
  const packPrice = withPacks.reduce((total, line) => total + line.price, 0);
  // Shipping by price, as purchase_item_overview shares it.
  const packShipping =
    price > 0 ? (shipping * packPrice) / price : (shipping * withPacks.length) / (read.length || 1);
  return {
    price,
    shipping,
    total: price + shipping,
    packs,
    perPack: packs ? Math.round((packPrice + packShipping) / packs) : null,
  };
}
