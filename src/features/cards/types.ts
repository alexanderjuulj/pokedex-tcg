// Feature-side unions for the cards table's text columns (the generated DB
// types are plain strings; the check constraints enforce these values).
export type CardFinish = "normal" | "holo" | "reverse_holo";
export type CardLanguage = "en" | "ja" | "de" | "fr" | "it" | "es" | "pt" | "nl" | "ko" | "zh" | "other";
export type CardCondition =
  | "mint"
  | "near_mint"
  | "excellent"
  | "good"
  | "light_played"
  | "played"
  | "poor";
export type GradingCompany = "psa" | "bgs" | "cgc" | "other";
// How a card left the collection (cards.gone_how).
export type CardGoneHow = "sold" | "given" | "traded";
