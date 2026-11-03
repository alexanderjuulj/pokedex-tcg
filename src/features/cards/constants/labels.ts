import type { CardCondition, CardFinish, CardLanguage, GradingCompany } from "../types";

export const FINISH_LABELS: Record<CardFinish, string> = {
  normal: "Normal",
  holo: "Holo",
  reverse_holo: "Reverse holo",
};

export const LANGUAGE_LABELS: Record<CardLanguage, string> = {
  en: "English",
  ja: "Japanese",
  de: "German",
  fr: "French",
  it: "Italian",
  es: "Spanish",
  pt: "Portuguese",
  nl: "Dutch",
  ko: "Korean",
  zh: "Chinese",
  other: "Other",
};

// Cardmarket's scale, best first.
export const CONDITION_LABELS: Record<CardCondition, string> = {
  mint: "Mint",
  near_mint: "Near mint",
  excellent: "Excellent",
  good: "Good",
  light_played: "Light played",
  played: "Played",
  poor: "Poor",
};

export const GRADING_LABELS: Record<GradingCompany, string> = {
  psa: "PSA",
  bgs: "BGS",
  cgc: "CGC",
  other: "Other",
};
