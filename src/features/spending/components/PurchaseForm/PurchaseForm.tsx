import type React from "react";
import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Button,
  DateInput,
  Field,
  Flex,
  Form,
  Grid,
  Input,
  Spinner,
  Text,
  Textarea,
} from "@/components/ui";
import {
  useSavePurchase,
  useSets,
  type Purchase,
  type PurchaseItem,
  type PurchaseSave,
} from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { parsePrice } from "@/lib/money";
import { emptyToNull, todayIso } from "@/lib/utils";
import {
  draftTotals,
  lineFromItem,
  lineValues,
  newLine,
  type PurchaseLineDraft,
} from "../../drafts";
import PurchaseItemFields from "../PurchaseItemFields/PurchaseItemFields";

type PurchaseFormProps = {
  // null = add.
  purchase: Purchase | null;
  // Its lines, when editing.
  items: PurchaseItem[];
  onDone: () => void;
};

const PurchaseForm: React.FC<PurchaseFormProps> = ({ purchase, items, onDone }) => {
  const save = useSavePurchase(!purchase);
  const sets = useSets();
  // Loaded already: PurchaseDialog waits for the settings.
  const money = useCurrency();
  const [boughtOn, setBoughtOn] = useState(purchase?.bought_on ?? todayIso());
  const [shop, setShop] = useState(purchase?.shop ?? "");
  const [shipping, setShipping] = useState(purchase?.shipping ? money.input(purchase.shipping) : "");
  const [notes, setNotes] = useState(purchase?.notes ?? "");
  const [lines, setLines] = useState<PurchaseLineDraft[]>(() =>
    items.length ? items.map((item) => lineFromItem(item, money.code)) : [newLine()],
  );
  const [error, setError] = useState<string | null>(null);

  const setItems = [
    { value: "none", label: "No one set (a mix)" },
    ...(sets.data ?? []).map((set) => ({
      value: String(set.id),
      label: set.released_on ? `${set.name} (${set.released_on.slice(0, 4)})` : set.name!,
    })),
  ];
  const totals = draftTotals(lines, shipping);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const shippingValue = shipping.trim() === "" ? 0 : parsePrice(shipping);
    if (shippingValue === null) {
      setError(`The shipping should be an amount, like ${money.example}.`);
      return;
    }
    const values: PurchaseSave["items"] = [];
    for (const [index, line] of lines.map((line) => lineValues(line, money.example)).entries()) {
      if ("error" in line) {
        setError(
          lines.length > 1
            ? `Line ${index + 1}: ${line.error}.`
            : `${line.error[0].toUpperCase()}${line.error.slice(1)}.`,
        );
        return;
      }
      values.push(line.values);
    }
    try {
      await save.mutateAsync({
        id: purchase?.id ?? null,
        bought_on: boughtOn,
        shop: emptyToNull(shop),
        shipping: shippingValue,
        notes: emptyToNull(notes),
        items: values,
      });
      onDone();
    } catch (submitError) {
      setError((submitError as Error).message);
    }
  };

  if (sets.isLoading) return <Spinner />;

  return (
    <Form onSubmit={onSubmit} error={error}>
      <Grid columns={{ initial: "1", xs: "2" }} gap="4">
        <Field label="Bought on">
          <DateInput value={boughtOn} onChange={setBoughtOn} required />
        </Field>
        <Field label="Where">
          <Input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder="A shop, a web shop, a market…"
          />
        </Field>
      </Grid>
      <Flex direction="column" gap="3">
        <Text size="2" weight="bold">
          What was in it
        </Text>
        {lines.map((line) => (
          <PurchaseItemFields
            key={line.key}
            line={line}
            setItems={setItems}
            onChange={(next) =>
              setLines((current) => current.map((other) => (other.key === line.key ? next : other)))
            }
            onRemove={
              lines.length > 1
                ? () => setLines((current) => current.filter((other) => other.key !== line.key))
                : undefined
            }
          />
        ))}
        <Flex>
          <Button
            variant="secondary"
            onClick={() => setLines((current) => [...current, newLine(current.at(-1))])}
          >
            <Plus size={18} aria-hidden />
            Add a line
          </Button>
        </Flex>
      </Flex>
      <Flex direction="column" gap="2">
        <Field label={`Shipping (${money.symbol})`}>
          <Input
            inputMode="decimal"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Text size="2" color="gray">
          For an order sent home. It&apos;s shared by what&apos;s in it, by price: a box takes more
          of it than a pack.
        </Text>
      </Flex>
      <Flex direction="column" gap="1">
        <Text size="3" weight="bold">
          {`Total ${money.format(totals.total)}`}
        </Text>
        {totals.total > 0 && (
          <Text size="2" color="gray">
            {[
              totals.shipping > 0 &&
                `${money.format(totals.price)} and ${money.format(totals.shipping)} shipping`,
              totals.perPack !== null &&
                `${totals.packs} ${totals.packs === 1 ? "pack" : "packs"}, ${money.format(totals.perPack)} each`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        )}
      </Flex>
      <Field label="Notes">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Who it was for, a birthday, a good deal…"
        />
      </Field>
      <Flex direction={{ initial: "column", xs: "row" }}>
        <Button type="submit" disabled={save.isPending}>
          {purchase ? "Save" : "Add purchase"}
        </Button>
      </Flex>
    </Form>
  );
};

export default PurchaseForm;
