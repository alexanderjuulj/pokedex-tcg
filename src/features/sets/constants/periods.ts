import { RECENT_YEARS } from "./packs";

// The Sets page's period (?since=): old sets hold many of the Pokémon you
// need, but their packs are hard to come by, so the list can stop at a year.
// "recent" is the pack odds' "from the last 2 years": what a shop still has.
export const PERIOD_ITEMS = [
  { value: "any", label: "Any year" },
  { value: "recent", label: `Last ${RECENT_YEARS} years` },
  { value: "2020", label: "Since 2020" },
  { value: "2016", label: "Since 2016" },
  { value: "2010", label: "Since 2010" },
];
