import type React from "react";
import { Field as BaseField } from "@base-ui/react/field";
import styles from "./Field.module.scss";

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

// Rendered as a <label> so clicking the label focuses native controls too,
// matching the pre-Base-UI behavior. The visible label is then a <span>, so
// nativeLabel is off (Base UI warns otherwise).
const Field: React.FC<FieldProps> = ({ label, children }) => {
  return (
    <BaseField.Root render={<label />} className={styles.field}>
      <BaseField.Label
        render={<span />}
        nativeLabel={false}
        className={styles.field_label}
      >
        {label}
      </BaseField.Label>
      {children}
    </BaseField.Root>
  );
};

export default Field;
