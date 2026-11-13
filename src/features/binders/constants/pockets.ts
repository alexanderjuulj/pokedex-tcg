import type { PocketsPerPage } from "../types";

// How many pockets wide a page is (12 is 3 × 4: three across, four down).
export const POCKET_COLUMNS: Record<PocketsPerPage, number> = {
  4: 2,
  9: 3,
  12: 3,
  16: 4,
};
