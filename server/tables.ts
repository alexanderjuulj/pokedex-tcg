import type { TableName, ViewName } from "../src/lib/database.types";

// The generic routes only expose what is listed here: tables get full CRUD,
// views are read-only. schema_migrations is deliberately absent.
export const TABLES: readonly TableName[] = ["cards", "binders", "purchases", "settings"];
export const VIEWS: readonly ViewName[] = [
  "pokemon_overview",
  "owned_cards",
  "card_details",
  "gone_cards",
  "pokemon_catalog_cards",
  "set_overview",
  "binder_overview",
  "pokedex_pockets",
  "purchase_overview",
  "purchase_item_overview",
];
