// The currencies the Spending page can be in (settings.currency), each
// written as an English-speaking user of it writes amounts: "€12.50",
// "$12.50", "12,50 kr.". Any ISO 4217 code works: add one here to offer it.
export const CURRENCIES: Record<string, { label: string; locale: string }> = {
  EUR: { label: "Euro", locale: "en-IE" },
  USD: { label: "US dollar", locale: "en-US" },
  GBP: { label: "British pound", locale: "en-GB" },
  CAD: { label: "Canadian dollar", locale: "en-CA" },
  AUD: { label: "Australian dollar", locale: "en-AU" },
  NZD: { label: "New Zealand dollar", locale: "en-NZ" },
  CHF: { label: "Swiss franc", locale: "de-CH" },
  DKK: { label: "Danish krone", locale: "da-DK" },
  SEK: { label: "Swedish krona", locale: "sv-SE" },
  NOK: { label: "Norwegian krone", locale: "nb-NO" },
  PLN: { label: "Polish złoty", locale: "pl-PL" },
};

// The settings table's default too.
export const DEFAULT_CURRENCY = "EUR";
