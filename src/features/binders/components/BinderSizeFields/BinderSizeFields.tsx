import type React from "react";
import { Checkbox, Field, Flex, Grid, Input, Select, Text } from "@/components/ui";
import { POCKETS_LABELS } from "../../constants";

const POCKET_ITEMS = Object.entries(POCKETS_LABELS).map(([value, label]) => ({ value, label }));

type BinderSizeFieldsProps = {
  pockets: string;
  onPocketsChange: (value: string) => void;
  pages: string;
  onPagesChange: (value: string) => void;
  ownBinderEach: boolean;
  onOwnBinderEachChange: (value: boolean) => void;
};

// The size of the binders to fill: pockets per page and how many pages.
const BinderSizeFields: React.FC<BinderSizeFieldsProps> = ({
  pockets,
  onPocketsChange,
  pages,
  onPagesChange,
  ownBinderEach,
  onOwnBinderEachChange,
}) => {
  const cards = Number(pockets) * Number(pages);
  return (
    <Flex direction="column" gap="3">
      <Grid columns={{ initial: "1", xs: "2" }} gap="3">
        <Field label="Pockets per page">
          <Select value={pockets} onValueChange={onPocketsChange} items={POCKET_ITEMS} required />
        </Field>
        <Field label="Pages">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={pages}
            onChange={(event) => onPagesChange(event.target.value)}
            required
          />
        </Field>
      </Grid>
      <Text size="2" color="gray">
        {`Count both sides of every sheet: a 360-card binder with 9 pockets has 40 pages.` +
          (Number.isInteger(cards) && cards > 0 ? ` This one holds ${cards} cards.` : "")}
      </Text>
      <Checkbox
        label="Give each region its own binder"
        checked={ownBinderEach}
        onCheckedChange={onOwnBinderEachChange}
      />
    </Flex>
  );
};

export default BinderSizeFields;
