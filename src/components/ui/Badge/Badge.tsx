import type React from "react";
import { cn } from "@/lib/utils";
import styles from "./Badge.module.scss";

type BadgeProps = {
  variant?: "success" | "warning" | "error" | "neutral" | "info" | "primary";
  dot?: "success" | "warning" | "error";
  title?: string;
  className?: string;
  children: React.ReactNode;
};

const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  dot,
  title,
  className,
  children,
}) => {
  return (
    <span
      className={cn(styles.badge, styles[`badge__${variant}`], className)}
      title={title}
    >
      {dot && (
        <span className={cn(styles.badge_dot, styles[`badge_dot__${dot}`])} />
      )}
      {children}
    </span>
  );
};

export default Badge;
