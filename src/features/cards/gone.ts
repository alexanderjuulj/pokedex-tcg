import type { Card } from "@/hooks/queries";
import { formatDate } from "@/lib/utils";
import type { CardGoneHow } from "./types";

// "Sold to Emil for €5 on 10 Nov", "Given away on 10 Nov", "Traded with
// Emil on 10 Nov": how a card left, from what was noted. `price` writes an
// amount in the collection's currency (useCurrency().format).
export function goneSummary(
  card: Pick<Card, "gone_on" | "gone_how" | "gone_to" | "sold_for">,
  price: (hundredths: number) => string,
): string {
  const to = card.gone_to;
  const how = card.gone_how as CardGoneHow;
  const what =
    how === "sold"
      ? ["Sold", to && `to ${to}`, card.sold_for !== null && `for ${price(card.sold_for)}`]
      : how === "given"
        ? [to ? `Given to ${to}` : "Given away"]
        : ["Traded", to && `with ${to}`];
  return [...what, `on ${formatDate(card.gone_on)}`].filter(Boolean).join(" ");
}
