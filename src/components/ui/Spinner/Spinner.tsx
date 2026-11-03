import type React from "react";
import { cn } from "@/lib/utils";
import styles from "./Spinner.module.scss";

type SpinnerProps = {
  fullscreen?: boolean;
};

const Spinner: React.FC<SpinnerProps> = ({ fullscreen = false }) => {
  return (
    <div className={cn(styles.wrap, fullscreen && styles.wrap__fullscreen)}>
      <span className={styles.spinner} aria-label="Loading" />
    </div>
  );
};

export default Spinner;
