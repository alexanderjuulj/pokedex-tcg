import type React from "react";
import { Trash2 } from "lucide-react";
import { Button, Field, Flex, Grid, Input, Select, Text, type SelectItem } from "@/components/ui";
import { useCurrency } from "@/hooks/useCurrency";
import { PRODUCT_LABELS } from "../../constants";
import { withProduct, type PurchaseLineDraft } from "../../drafts";
import type { PurchaseProduct } from "../../types";
import styles from "./PurchaseItemFields.module.scss";

const PRODUCT_ITEMS = Object.entries(PRODUCT_LABELS).map(([value, label]) => ({ value, label }));

// Products that go by a name of their own: "Charizard ex Premium Collection".
const NAMED: PurchaseProduct[] = ["tin", "collection_box", "other"];

type PurchaseItemFieldsProps = {
  line: PurchaseLineDraft;
  // The sets to pick from, "No one set" first.
  setItems: SelectItem[];
  onChange: (line: PurchaseLineDraft) => void;
  // Missing while it's the only line.
  onRemove?: () => void;
};

const PurchaseItemFields: React.FC<PurchaseItemFieldsProps> = ({ line, setItems, onChange, onRemove }) => {
  const money = useCurrency();
  const set = (patch: Partial<PurchaseLineDraft>) => onChange({ ...line, ...patch });
  const mixed = line.setId === "none";

  return (
    <div className={styles.line}>
      <Grid columns={{ initial: "1", xs: "2" }} gap="4">
        <Field label="Product">
          <Select
            value={line.product}
            onValueChange={(value) => onChange(withProduct(line, value as PurchaseProduct))}
            items={PRODUCT_ITEMS}
            required
          />
        </Field>
        <Field label="Set">
          <Select
            value={line.setId}
            onValueChange={(setId) => set({ setId })}
            items={setItems}
            placeholder="Pick a set"
            searchable
            required
          />
        </Field>
      </Grid>
      {(mixed || NAMED.includes(line.product)) && (
        <Field label={mixed ? "What it is" : "Its name"}>
          <Input
            value={line.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={mixed ? "A tin of mixed packs, a bag of bulk…" : "Charizard ex Premium Collection"}
            required={mixed}
          />
        </Field>
      )}
      <Grid columns={line.product === "booster" ? "2" : "3"} gap="3">
        <Field label="How many">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={line.quantity}
            onChange={(e) => set({ quantity: e.target.value })}
            required
          />
        </Field>
        <Field label={`Price each (${money.symbol})`}>
          <Input
            inputMode="decimal"
            value={line.price}
            onChange={(e) => set({ price: e.target.value })}
            placeholder={money.example}
            required
          />
        </Field>
        {line.product !== "booster" && (
          <Field label="Packs in one">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={line.packs}
              onChange={(e) => set({ packs: e.target.value })}
              required
            />
          </Field>
        )}
      </Grid>
      {onRemove && (
        <Flex align="center" justify="between" gap="3">
          <Text size="1" color="gray">
            {line.cardCount > 0 &&
              `${line.cardCount} ${line.cardCount === 1 ? "card says it was" : "cards say they were"} pulled from this. Removed, they won't say where they came from.`}
          </Text>
          <Button variant="ghost" onClick={onRemove} aria-label="Remove this line">
            <Trash2 size={18} aria-hidden />
            Remove
          </Button>
        </Flex>
      )}
    </div>
  );
};

export default PurchaseItemFields;
