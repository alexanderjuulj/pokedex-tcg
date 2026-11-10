import type React from "react";
import { Dialog, Spinner } from "@/components/ui";
import { usePurchaseItems, type Purchase } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import type { FormDialogProps } from "@/hooks/useFormDialog";
import PurchaseForm from "../PurchaseForm/PurchaseForm";

const PurchaseDialog: React.FC<FormDialogProps<Purchase>> = ({ item, open, onOpenChange }) => {
  // The form starts from the purchase's lines and writes their prices in the
  // collection's currency, so it waits for both.
  const lines = usePurchaseItems();
  const money = useCurrency();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={item ? "Edit purchase" : "New purchase"}>
      {lines.isLoading || money.isLoading ? (
        <Spinner />
      ) : (
        <PurchaseForm
          purchase={item}
          items={item ? (lines.data ?? []).filter((line) => line.purchase_id === item.id) : []}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
};

export default PurchaseDialog;
