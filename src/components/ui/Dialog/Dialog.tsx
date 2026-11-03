import type React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import Flex from "../Flex";
import styles from "./Dialog.module.scss";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  // Content (usually a form). Unmounted while closed, so forms start fresh
  // on every open.
  children: React.ReactNode;
};

// General-purpose modal with the same surface as AlertDialog; the body
// scrolls when the content is taller than the viewport.
const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
}) => {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={styles.backdrop} />
        <BaseDialog.Popup className={styles.popup}>
          <Flex justify="between" align="start" gap="3">
            <div>
              <BaseDialog.Title className={styles.title}>
                {title}
              </BaseDialog.Title>
              {description && (
                <BaseDialog.Description className={styles.description}>
                  {description}
                </BaseDialog.Description>
              )}
            </div>
            <BaseDialog.Close className={styles.close} aria-label="Close">
              <X size={22} strokeWidth={1.75} />
            </BaseDialog.Close>
          </Flex>
          <div className={styles.body}>{children}</div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
};

export default Dialog;
