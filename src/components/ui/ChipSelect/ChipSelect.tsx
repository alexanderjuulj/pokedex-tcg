import type React from "react";
import { X } from "lucide-react";
import Flex from "../Flex";
import Select from "../Select/Select";
import Text from "../Text";
import styles from "./ChipSelect.module.scss";

export type ChipSelectItem = { value: string; label: string };

type ChipSelectProps = {
  // Styled like a Field label. Not wrapped in <Field>: that renders a
  // <label>, which would turn a tap on a chip's text into a tap on the
  // first chip.
  label: string;
  items: ChipSelectItem[];
  // The chosen values, in the order they were added.
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  // Extra controls beside the add select, e.g. a "Link from text" button.
  actions?: React.ReactNode;
};

// A multi-select for touch: chosen items as chips (tap to remove) and a
// searchable select to add more.
const ChipSelect: React.FC<ChipSelectProps> = ({
  label,
  items,
  value,
  onValueChange,
  placeholder = "Add…",
  emptyText = "None yet.",
  actions,
}) => {
  const labelOf = (itemValue: string) =>
    items.find((item) => item.value === itemValue)?.label ?? itemValue;

  return (
    <div className={styles.field}>
      <span className={styles.field_label}>{label}</span>
      {value.length > 0 ? (
        <Flex wrap="wrap" gap="2">
          {value.map((itemValue) => (
            <button
              key={itemValue}
              type="button"
              className={styles.chip}
              aria-label={`Remove ${labelOf(itemValue)}`}
              onClick={() =>
                onValueChange(value.filter((other) => other !== itemValue))
              }
            >
              {labelOf(itemValue)}
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          ))}
        </Flex>
      ) : (
        <Text size="2" color="gray">
          {emptyText}
        </Text>
      )}
      <Flex direction={{ initial: "column", xs: "row" }} gap="2">
        <Flex flexGrow="1" direction="column">
          <Select
            searchable
            value=""
            onValueChange={(added) => added && onValueChange([...value, added])}
            placeholder={placeholder}
            items={items.filter((item) => !value.includes(item.value))}
          />
        </Flex>
        {actions}
      </Flex>
    </div>
  );
};

export default ChipSelect;
