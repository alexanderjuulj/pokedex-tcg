import type React from "react";
import { cn } from "@/lib/utils";
import styles from "./Textarea.module.scss";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea: React.FC<TextareaProps> = ({ className, rows = 3, ...rest }) => {
  return <textarea className={cn(styles.textarea, className)} rows={rows} {...rest} />;
};

export default Textarea;
