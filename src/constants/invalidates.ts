// Query-key prefixes to invalidate after each entity's create/update/delete.
// Own file (not the form components) because exporting constants from a
// component file breaks Vite Fast Refresh (react-refresh/only-export-components).

// A card changes the Pokédex and set counts and the catalogue's owned ticks too.
export const CARD_INVALIDATES = [
  "owned_cards",
  "pokemon_overview",
  "pokemon_catalog_cards",
  "set_overview",
  "binder_overview",
];

// A binder's cards show on the card pages too, and the Pokédex binders are the
// goal the sets count.
export const BINDER_INVALIDATES = ["binder_overview", "owned_cards", "set_overview"];
