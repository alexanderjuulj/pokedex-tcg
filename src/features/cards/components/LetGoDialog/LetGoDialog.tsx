import type React from "react";
import { Dialog } from "@/components/ui";
import type { Card } from "@/hooks/queries";
import type { FormDialogProps } from "@/hooks/useFormDialog";
import LetGoForm from "../LetGoForm/LetGoForm";

const LetGoDialog: React.FC<FormDialogProps<Card>> = ({ item, open, onOpenChange }) => (
  <Dialog
    open={open}
    onOpenChange={onOpenChange}
    title={item?.gone_on ? "How it went" : "Sell or give away"}
  >
    {item && <LetGoForm card={item} onDone={() => onOpenChange(false)} />}
  </Dialog>
);

export default LetGoDialog;
