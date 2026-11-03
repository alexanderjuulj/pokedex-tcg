import type React from "react";
import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import Button from "../Button/Button";
import Flex from "../Flex";
import styles from "./AlertDialog.module.scss";

type AlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Renders the confirm button in the danger variant (deletes etc.).
  danger?: boolean;
  // Disables the confirm button while the action is in flight.
  pending?: boolean;
  onConfirm: () => void;
};

const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  pending = false,
  onConfirm,
}) => {
  return (
    <BaseAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseAlertDialog.Portal>
        <BaseAlertDialog.Backdrop className={styles.backdrop} />
        <BaseAlertDialog.Popup className={styles.popup}>
          <BaseAlertDialog.Title className={styles.title}>
            {title}
          </BaseAlertDialog.Title>
          {description && (
            <BaseAlertDialog.Description className={styles.description}>
              {description}
            </BaseAlertDialog.Description>
          )}
          <Flex justify="end" gap="3" className={styles.actions}>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button
              variant={danger ? "danger" : "primary"}
              onClick={onConfirm}
              disabled={pending}
            >
              {confirmLabel}
            </Button>
          </Flex>
        </BaseAlertDialog.Popup>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  );
};

export default AlertDialog;
