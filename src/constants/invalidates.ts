// Query-key prefixes to invalidate after each entity's create/update/delete.
// Own file (not the form components) because exporting constants from a
// component file breaks Vite Fast Refresh (react-refresh/only-export-components).

// A card changes the Pokédex and set counts and the catalogue's owned ticks
// too, and the purchases count the cards pulled from them.
export const CARD_INVALIDATES = [
  "owned_cards",
  "card_details",
  "gone_cards",
  "pokemon_overview",
  "pokemon_catalog_cards",
  "set_overview",
  "binder_overview",
  "purchase_overview",
  "purchase_item_overview",
];

// A binder's cards show on the card pages too, and the Pokédex binders are the
// goal the sets count.
export const BINDER_INVALIDATES = ["binder_overview", "owned_cards", "set_overview"];

// A purchase's lines are listed with it, and a deleted line leaves its cards
// saying nothing about where they came from.
export const PURCHASE_INVALIDATES = [
  "purchase_overview",
  "purchase_item_overview",
  "owned_cards",
  "card_details",
];

// The currency shows on every amount, but they all read it from this query.
export const SETTINGS_INVALIDATES = ["settings"];
