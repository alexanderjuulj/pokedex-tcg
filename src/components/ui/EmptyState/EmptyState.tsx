import type React from "react";
import styles from "./EmptyState.module.scss";

type EmptyStateProps = {
  message: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({ message }) => {
  return <p className={styles.empty}>{message}</p>;
};

export default EmptyState;
