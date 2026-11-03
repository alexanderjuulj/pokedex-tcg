import type React from "react";
import { cn } from "@/lib/utils";
import styles from "./StatusDot.module.scss";

type StatusDotProps = {
  status: "ok" | "down" | "unknown";
  label?: string;
};

const LABELS: Record<StatusDotProps["status"], string> = {
  ok: "Up",
  down: "Down",
  unknown: "No data",
};

const StatusDot: React.FC<StatusDotProps> = ({ status, label }) => {
  return (
    <span className={styles.status} title={label ?? LABELS[status]}>
      <span className={cn(styles.status_dot, styles[`status_dot__${status}`])} />
      <span className={styles.status_label}>{label ?? LABELS[status]}</span>
    </span>
  );
};

export default StatusDot;
