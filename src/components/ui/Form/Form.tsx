import type React from "react";
import { Form as BaseForm } from "@base-ui/react/form";
import styles from "./Form.module.scss";

type FormProps = React.FormHTMLAttributes<HTMLFormElement> & {
  error?: string | null;
};

const Form: React.FC<FormProps> = ({ error, children, ...rest }) => {
  return (
    <BaseForm className={styles.form} {...rest}>
      {children}
      {error && <p className={styles.form_error}>{error}</p>}
    </BaseForm>
  );
};

export default Form;
