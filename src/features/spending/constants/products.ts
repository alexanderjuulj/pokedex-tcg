import type { PurchaseProduct } from "../types";

// In the product picker.
export const PRODUCT_LABELS: Record<PurchaseProduct, string> = {
  booster: "Booster pack",
  blister: "Blister",
  bundle: "Booster bundle",
  elite_trainer_box: "Elite Trainer Box",
  booster_box: "Booster box",
  tin: "Tin",
  collection_box: "Collection box",
  other: "Something else",
};

// After a set's name: "Surging Sparks booster pack".
export const PRODUCT_NAMES: Record<PurchaseProduct, string> = {
  booster: "booster pack",
  blister: "blister",
  bundle: "booster bundle",
  elite_trainer_box: "Elite Trainer Box",
  booster_box: "booster box",
  tin: "tin",
  collection_box: "collection box",
  other: "",
};

// The booster packs usually in one, as a new line's start: the field can say
// otherwise (a mini tin has 2, an older Elite Trainer Box 8). Something else
// (a bag of bulk, a deck) has none, so it stays out of the cost per pack.
export const PRODUCT_PACKS: Record<PurchaseProduct, number> = {
  booster: 1,
  blister: 3,
  bundle: 6,
  elite_trainer_box: 9,
  booster_box: 36,
  tin: 3,
  collection_box: 4,
  other: 0,
};

// A new card of a set says it was pulled from the newest purchase of that set
// within these days. Older ones are still in the list to pick.
export const PULLED_FROM_DAYS = 30;
