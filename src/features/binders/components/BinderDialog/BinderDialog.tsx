import type React from "react";
import { Dialog } from "@/components/ui";
import type { Binder } from "@/hooks/queries";
import type { FormDialogProps } from "@/hooks/useFormDialog";
import BinderForm from "../BinderForm/BinderForm";

const BinderDialog: React.FC<FormDialogProps<Binder>> = ({ item, open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange} title={item ? "Edit binder" : "New binder"}>
    <BinderForm binder={item} onDone={() => onOpenChange(false)} />
  </Dialog>
);

export default BinderDialog;
