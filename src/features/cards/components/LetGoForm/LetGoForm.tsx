import type React from "react";
import { useState } from "react";
import { Button, DateInput, Field, Flex, Form, Input, Select, Text } from "@/components/ui";
import { CARD_INVALIDATES } from "@/constants/invalidates";
import { usePokemonCards, useTableMutations, type Card } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { parsePrice } from "@/lib/money";
import { formatCardNumber } from "@/lib/pokemon";
import { toast } from "@/lib/toast";
import { emptyToNull, todayIso } from "@/lib/utils";
import { inPokedexBinder } from "@/features/binders/layout";
import { GONE_LABELS } from "../../constants";
import type { CardGoneHow } from "../../types";

const HOW_ITEMS = Object.entries(GONE_LABELS).map(([value, label]) => ({ value, label }));

type LetGoFormProps = {
  // A card in the collection to let go, or a gone one to change how it went.
  card: Card;
  onDone: () => void;
};

// Sells, gives away or trades a card: it leaves the collection but stays on
// record (gone_cards). The update takes it out of its slot and pocket, and a
// trigger hands the slot to its Pokémon's oldest card still here.
const LetGoForm: React.FC<LetGoFormProps> = ({ card, onDone }) => {
  const money = useCurrency();
  const { update } = useTableMutations("cards", CARD_INVALIDATES, { silent: true });
  const [how, setHow] = useState<string>(card.gone_how ?? "sold");
  const [goneOn, setGoneOn] = useState(card.gone_on ?? todayIso());
  const [goneTo, setGoneTo] = useState(card.gone_to ?? "");
  const [price, setPrice] = useState(money.input(card.sold_for));
  const [error, setError] = useState<string | null>(null);

  // Its pocket in a Pokédex binder, if it fills one: who takes it over, the
  // oldest card of its Pokémon in no Pokédex binder (a trigger).
  const others = (usePokemonCards(card.pokemon_id!).data ?? [])
    .filter((other) => other.id !== card.id && !inPokedexBinder(other))
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  const next = others[0];
  const slotHint =
    card.gone_on || !inPokedexBinder(card)
      ? null
      : next
        ? [
            `It's ${card.pokemon_name}'s card in the Pokédex. Your oldest other ${card.pokemon_name} card takes its place: ${next.name} (${next.set_name ?? "entered by hand"} ${formatCardNumber(next.number, next.set_card_count)}).`,
            // Kept outside (a top loader), it fills the pocket from there.
            next.kept_outside && "It's kept outside the binders, so the pocket stays empty.",
          ]
            .filter(Boolean)
            .join(" ")
        : `It's your only ${card.pokemon_name} card, so ${card.pokemon_name} goes back to missing in the Pokédex.`;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const soldFor = how === "sold" && price.trim() ? parsePrice(price) : null;
    if (how === "sold" && price.trim() && soldFor === null) {
      setError(`The price should be an amount, like ${money.example}.`);
      return;
    }
    try {
      await update.mutateAsync({
        id: card.id!,
        values: {
          gone_on: goneOn,
          gone_how: how,
          gone_to: emptyToNull(goneTo),
          sold_for: soldFor,
          // Out of its binder and pocket: the gone_on check insists.
          binder_id: null,
          binder_pocket: null,
          kept_outside: true,
        },
      });
      toast.success(
        card.gone_on ? "Saved" : `${card.name} ${GONE_LABELS[how as CardGoneHow].toLowerCase()}`,
      );
      onDone();
    } catch (submitError) {
      setError((submitError as Error).message);
    }
  };

  return (
    <Form onSubmit={onSubmit} error={error}>
      <Field label="What happened">
        <Select value={how} onValueChange={setHow} items={HOW_ITEMS} required />
      </Field>
      <Field label={how === "sold" ? "Sold to" : how === "given" ? "Given to" : "Traded with"}>
        <Input
          value={goneTo}
          onChange={(e) => setGoneTo(e.target.value)}
          placeholder={how === "sold" ? "A buyer on Cardmarket, a friend…" : "A friend, a cousin…"}
        />
      </Field>
      <Flex direction={{ initial: "column", xs: "row" }} gap="4">
        <Field label="On">
          <DateInput value={goneOn} onChange={setGoneOn} required />
        </Field>
        {how === "sold" && (
          <Field label={`For (${money.symbol})`}>
            <Input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={money.example}
            />
          </Field>
        )}
      </Flex>
      {slotHint && <Text size="2">{slotHint}</Text>}
      <Text size="2" color="gray">
        {card.gone_on
          ? "It stays out of the collection. To have it back, use Bring it back on its page."
          : "It leaves the collection and its binder, but it's kept under Cards → Gone, with the purchase it came from. A sale shows on the Spending page."}
      </Text>
      <Flex direction={{ initial: "column", xs: "row" }}>
        <Button type="submit" disabled={update.isPending || money.isLoading}>
          {card.gone_on ? "Save" : how === "sold" ? "Sell it" : how === "given" ? "Give it away" : "Trade it"}
        </Button>
      </Flex>
    </Form>
  );
};

export default LetGoForm;
