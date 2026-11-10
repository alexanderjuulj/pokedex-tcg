import type React from "react";
import { Dialog } from "@/components/ui";
import CurrencyForm from "../CurrencyForm/CurrencyForm";

type CurrencyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CurrencyDialog: React.FC<CurrencyDialogProps> = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange} title="Currency">
    <CurrencyForm onDone={() => onOpenChange(false)} />
  </Dialog>
);

export default CurrencyDialog;
