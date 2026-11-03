import type React from "react";
import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "@/lib/utils";
import styles from "./Input.module.scss";

// ComponentProps includes `ref` (a plain prop in React 19).
type InputProps = React.ComponentProps<"input">;

const Input: React.FC<InputProps> = ({ className, ...rest }) => {
  return <BaseInput className={cn(styles.input, className)} {...rest} />;
};

export default Input;
