import type React from "react";
import { cn } from "@/lib/utils";
import styles from "./Button.module.scss";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  type = "button",
  className,
  ...rest
}) => {
  return (
    <button
      type={type}
      className={cn(styles.btn, styles[`btn__${variant}`], className)}
      {...rest}
    />
  );
};

export default Button;
