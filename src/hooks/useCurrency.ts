import { DEFAULT_CURRENCY } from "@/constants/currencies";
import { useSettings } from "@/hooks/queries";
import { currencySymbol, formatPrice, priceInput } from "@/lib/money";

// The collection's currency (a setting), and its amounts written in it. Until
// the settings load it's the default: pages wait on isLoading, so an amount
// never flashes in the wrong one.
export function useCurrency() {
  const settings = useSettings();
  const code = settings.data?.currency ?? DEFAULT_CURRENCY;
  return {
    code,
    isLoading: settings.isLoading,
    format: (hundredths: number) => formatPrice(hundredths, code),
    input: (hundredths: number | null) => priceInput(hundredths, code),
    symbol: currencySymbol(code),
    // A price field's placeholder: "39.95", or "39,95" in kroner.
    example: priceInput(3995, code),
  };
}
