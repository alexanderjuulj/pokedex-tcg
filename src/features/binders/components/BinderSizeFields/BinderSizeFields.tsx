import type React from "react";
import { Checkbox, Field, Flex, Grid, Input, Select, Text } from "@/components/ui";
import { POCKETS_LABELS } from "../../constants";

const POCKET_ITEMS = Object.entries(POCKETS_LABELS).map(([value, label]) => ({ value, label }));

type BinderSizeFieldsProps = {
  pockets: string;
  onPocketsChange: (value: string) => void;
  pages: string;
  onPagesChange: (value: string) => void;
  // For several regions: each its own binder, each on a fresh page. Left
  // out where there's one binder of one kind (a type, a class).
  ownBinderEach?: boolean;
  onOwnBinderEachChange?: (value: boolean) => void;
  regionPages: boolean;
  onRegionPagesChange: (value: boolean) => void;
};

// The size of the binders to fill: pockets per page and how many pages.
const BinderSizeFields: React.FC<BinderSizeFieldsProps> = ({
  pockets,
  onPocketsChange,
  pages,
  onPagesChange,
  ownBinderEach,
  onOwnBinderEachChange,
  regionPages,
  onRegionPagesChange,
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
      {onOwnBinderEachChange && (
        <Checkbox
          label="Give each region its own binder"
          checked={Boolean(ownBinderEach)}
          onCheckedChange={onOwnBinderEachChange}
        />
      )}
      <Checkbox
        label="Each region on a fresh page"
        checked={regionPages}
        onCheckedChange={onRegionPagesChange}
      />
    </Flex>
  );
};

export default BinderSizeFields;
