import type React from "react";
import { useMemo, useRef } from "react";
import { Select as BaseSelect } from "@base-ui/react/select";
import { Combobox } from "@base-ui/react/combobox";
import styles from "./Select.module.scss";

export type SelectItem = {
  value: string;
  label: React.ReactNode;
  // Shown before the label, both in the list and on the closed select.
  icon?: React.ReactNode;
};

type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  // When set, an empty value shows this text instead of selecting an item.
  placeholder?: string;
  required?: boolean;
  // Adds a filter input at the top of the popup, for long lists such as
  // projects or servers. Filtering matches string labels.
  searchable?: boolean;
};

const ChevronIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ItemContent: React.FC<{ item: SelectItem }> = ({ item }) => (
  <>
    {item.icon}
    <span className={styles.label}>{item.label}</span>
  </>
);

// Renders the closed select's value with the item's icon; falls back to the
// placeholder when nothing (or an unknown value) is selected.
const renderValue =
  (items: SelectItem[], placeholder?: string) =>
  (selected: string | null) => {
    const item = items.find((candidate) => candidate.value === selected);
    return item ? <ItemContent item={item} /> : placeholder;
  };

const SearchableSelect: React.FC<Omit<SelectProps, "searchable">> = ({
  value,
  onValueChange,
  items,
  placeholder,
  required,
}) => {
  // Focus the filter on open so typing searches instead of hitting the
  // trigger's typeahead. Not on touch: iOS won't raise the keyboard for focus
  // that doesn't come from the tap itself, so it would only look focused.
  const searchRef = useRef<HTMLInputElement>(null);
  const initialFocus = (openType: string) =>
    openType === "touch" || openType === "pen" ? false : searchRef.current;
  const collection = useMemo(
    () =>
      Combobox.createItems(items, {
        getValue: (item) => item.value,
        getLabel: (item) =>
          typeof item.label === "string" ? item.label : item.value,
      }),
    [items],
  );

  return (
    <Combobox.Root
      value={placeholder && value === "" ? null : value}
      onValueChange={(next) => onValueChange(next ?? "")}
      required={required}
      items={collection}
      autoHighlight
    >
      <Combobox.Trigger className={styles.trigger}>
        <span className={styles.value}>
          <Combobox.Value placeholder={placeholder}>
            {renderValue(items, placeholder)}
          </Combobox.Value>
        </span>
        <Combobox.Icon className={styles.icon}>
          <ChevronIcon />
        </Combobox.Icon>
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner
          className={styles.positioner}
          align="start"
          sideOffset={4}
        >
          <Combobox.Popup
            className={styles.search_popup}
            initialFocus={initialFocus}
          >
            <Combobox.Input
              ref={searchRef}
              className={styles.search}
              placeholder="Search…"
            />
            <Combobox.Empty className={styles.empty}>No matches</Combobox.Empty>
            <Combobox.List className={styles.list}>
              {(item: SelectItem) => (
                <Combobox.Item
                  key={item.value}
                  value={item.value}
                  className={styles.item}
                >
                  <Combobox.ItemIndicator className={styles.item_indicator}>
                    <CheckIcon />
                  </Combobox.ItemIndicator>
                  <span className={styles.item_text}>
                    <ItemContent item={item} />
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
};

const Select: React.FC<SelectProps> = ({ searchable, ...props }) => {
  if (searchable) return <SearchableSelect {...props} />;

  const { value, onValueChange, items, placeholder, required } = props;
  return (
    <BaseSelect.Root
      value={placeholder && value === "" ? null : value}
      onValueChange={(next) => onValueChange((next as string | null) ?? "")}
      required={required}
      items={items}
    >
      <BaseSelect.Trigger className={styles.trigger}>
        <BaseSelect.Value className={styles.value} placeholder={placeholder}>
          {renderValue(items, placeholder)}
        </BaseSelect.Value>
        <BaseSelect.Icon className={styles.icon}>
          <ChevronIcon />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className={styles.positioner} sideOffset={4}>
          <BaseSelect.Popup className={styles.popup}>
            {items.map((item) => (
              <BaseSelect.Item
                key={item.value}
                value={item.value}
                className={styles.item}
              >
                <BaseSelect.ItemIndicator className={styles.item_indicator}>
                  <CheckIcon />
                </BaseSelect.ItemIndicator>
                <span className={styles.item_text}>
                  {item.icon}
                  <BaseSelect.ItemText className={styles.label}>
                    {item.label}
                  </BaseSelect.ItemText>
                </span>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
};

export default Select;
