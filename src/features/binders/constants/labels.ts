import type { BinderKind, PocketsPerPage } from "../types";

export const BINDER_KIND_LABELS: Record<BinderKind, string> = {
  pokedex: "Pokédex order",
  free: "In the order added",
};

export const POCKETS_LABELS: Record<PocketsPerPage, string> = {
  4: "4 pockets (2 × 2)",
  9: "9 pockets (3 × 3)",
  12: "12 pockets (3 × 4)",
  16: "16 pockets (4 × 4)",
};
