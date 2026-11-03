import type React from "react";
import { Dialog } from "@/components/ui";
import PokedexBinderForm from "../PokedexBinderForm/PokedexBinderForm";

type PokedexBinderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PokedexBinderDialog: React.FC<PokedexBinderDialogProps> = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange} title="Collect more regions">
    <PokedexBinderForm onDone={() => onOpenChange(false)} />
  </Dialog>
);

export default PokedexBinderDialog;
