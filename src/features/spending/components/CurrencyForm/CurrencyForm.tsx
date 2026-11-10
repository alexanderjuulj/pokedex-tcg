import type React from "react";
import { useState } from "react";
import { Button, Field, Flex, Form, Select, Text } from "@/components/ui";
import { CURRENCIES } from "@/constants/currencies";
import { SETTINGS_INVALIDATES } from "@/constants/invalidates";
import { useTableMutations } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { currencySymbol, formatPrice } from "@/lib/money";

const CURRENCY_ITEMS = Object.entries(CURRENCIES).map(([code, { label }]) => ({
  value: code,
  label: `${label} (${currencySymbol(code)})`,
}));

type CurrencyFormProps = {
  onDone: () => void;
};

// The collection's currency, a setting for the whole family. The amounts stay
// as typed: only the currency they're shown in changes.
const CurrencyForm: React.FC<CurrencyFormProps> = ({ onDone }) => {
  const money = useCurrency();
  const { update } = useTableMutations("settings", SETTINGS_INVALIDATES);
  const [currency, setCurrency] = useState(money.code);
  const [error, setError] = useState<string | null>(null);
  // One set through the API that the list doesn't have still shows.
  const items = CURRENCIES[money.code]
    ? CURRENCY_ITEMS
    : [...CURRENCY_ITEMS, { value: money.code, label: money.code }];

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await update.mutateAsync({ id: 1, values: { currency } });
      onDone();
    } catch (submitError) {
      setError((submitError as Error).message);
    }
  };

  return (
    <Form onSubmit={onSubmit} error={error}>
      <Field label="Currency">
        <Select value={currency} onValueChange={setCurrency} items={items} required />
      </Field>
      <Text size="2" color="gray">
        {`A booster pack at ${formatPrice(495, currency)}, an Elite Trainer Box at ${formatPrice(4995, currency)}. Switching shows the amounts already saved in the new currency: it doesn't convert them.`}
      </Text>
      <Flex direction={{ initial: "column", xs: "row" }}>
        <Button type="submit" disabled={update.isPending || money.isLoading}>
          Save
        </Button>
      </Flex>
    </Form>
  );
};

export default CurrencyForm;
