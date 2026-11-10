// Feature-side union for purchase_items.product (the generated DB types are
// plain strings; the check constraint enforces these values).
export type PurchaseProduct =
  | "booster"
  | "blister"
  | "bundle"
  | "elite_trainer_box"
  | "booster_box"
  | "tin"
  | "collection_box"
  | "other";
