import type React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import styles from "./Checkbox.module.scss";

type CheckboxProps = {
  label: React.ReactNode;
  // Standalone: controlled with checked/onCheckedChange. Inside a
  // CheckboxGroup: pass `value` and the group tracks the state.
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  value?: string;
};

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onCheckedChange,
  value,
}) => (
  <label className={styles.item}>
    <BaseCheckbox.Root
      checked={checked}
      onCheckedChange={(next) => onCheckedChange?.(next)}
      value={value}
      className={styles.checkbox}
    >
      <BaseCheckbox.Indicator className={styles.indicator}>
        <CheckIcon />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
    {label}
  </label>
);

export default Checkbox;
