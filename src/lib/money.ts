// Amounts are stored in hundredths of the currency (cents), as integers, so
// sums never drift. Which currency is a setting (settings.currency): the
// helpers here take its code, and useCurrency passes the collection's.

import { CURRENCIES } from "@/constants/currencies";

// How the currency is written; English for one this app doesn't list.
const localeOf = (currency: string) => CURRENCIES[currency]?.locale ?? "en";

// "€39.95", or "€450" for a whole amount.
export function formatPrice(hundredths: number, currency: string): string {
  const whole = hundredths % 100 === 0;
  return (hundredths / 100).toLocaleString(localeOf(currency), {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

// "€", "$", "kr.": for field labels.
export function currencySymbol(currency: string): string {
  return (
    new Intl.NumberFormat(localeOf(currency), { style: "currency", currency })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

// The currency's decimal mark: "." for euros and dollars here, "," for kroner.
const decimalMark = (currency: string) =>
  new Intl.NumberFormat(localeOf(currency)).formatToParts(1.5).find((part) => part.type === "decimal")
    ?.value ?? ".";

// What's typed in a price field → hundredths; null when it isn't an amount.
// Takes "39,95" and "39.95" whatever the currency, and "1.234,50" or
// "1 234" with thousands separators. Empty is null too: the caller decides
// whether that's 0.
export function parsePrice(text: string): number | null {
  let value = text.trim().replace(/[\s€$£]|kr\.?$/gi, "");
  if (value === "") return null;
  // The last "," or "." with one or two digits after it is the decimal mark;
  // any other is a thousands separator.
  const decimal = /[.,](\d{1,2})$/.exec(value);
  const fraction = decimal ? decimal[1] : "";
  if (decimal) value = value.slice(0, decimal.index);
  value = value.replace(/[.,]/g, "");
  if (!/^\d+$/.test(value)) return null;
  return Number(value) * 100 + Number(fraction.padEnd(2, "0") || 0);
}

// For a price field when editing: 3995 → "39.95" ("39,95" in kroner),
// 45000 → "450".
export function priceInput(hundredths: number | null, currency: string): string {
  if (hundredths === null) return "";
  const text = (hundredths / 100).toFixed(2).replace(/\.00$/, "");
  return text.replace(".", decimalMark(currency));
}
