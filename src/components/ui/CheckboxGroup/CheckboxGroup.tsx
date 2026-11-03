import type React from "react";
import { useId } from "react";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import Checkbox from "../Checkbox/Checkbox";
import styles from "./CheckboxGroup.module.scss";

export type CheckboxGroupItem = {
  value: string;
  label: React.ReactNode;
};

type CheckboxGroupProps = {
  // Styled like a Field label. Not wrapped in <Field>: that renders a
  // <label>, and every checkbox here is a label of its own.
  label: string;
  value: string[];
  onValueChange: (value: string[]) => void;
  items: CheckboxGroupItem[];
};

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  value,
  onValueChange,
  items,
}) => {
  const labelId = useId();
  return (
    <div className={styles.field}>
      <span id={labelId} className={styles.field_label}>
        {label}
      </span>
      <BaseCheckboxGroup
        aria-labelledby={labelId}
        value={value}
        onValueChange={onValueChange}
        className={styles.group}
      >
        {items.map((item) => (
          <Checkbox key={item.value} value={item.value} label={item.label} />
        ))}
      </BaseCheckboxGroup>
    </div>
  );
};

export default CheckboxGroup;
