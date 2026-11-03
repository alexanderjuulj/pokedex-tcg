import React from "react";
import { Progress } from "@base-ui/react/progress";
import { cn } from "@/lib/utils";
import styles from "./ProgressBar.module.scss";

interface ProgressBarProps {
  // Without a label the value spans the full width and inherits the
  // surrounding text style (for use inside a card that already has a title).
  label?: string;
  pct: number | null;
  display: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, pct, display }) => {
  return (
    <Progress.Root className={styles.Progress} value={pct}>
      {label != null && (
        <Progress.Label className={styles.Label}>{label}</Progress.Label>
      )}
      <Progress.Value
        className={cn(styles.Value, label == null && styles.ValueBare)}
      >
        {() => display}
      </Progress.Value>
      <Progress.Track className={styles.Track}>
        <Progress.Indicator className={styles.Indicator} />
      </Progress.Track>
    </Progress.Root>
  );
};

export default ProgressBar;
