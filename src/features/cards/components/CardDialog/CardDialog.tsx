import type React from "react";
import { Dialog } from "@/components/ui";
import type { CatalogCard, OwnedCard } from "@/hooks/queries";
import type { FormDialogProps } from "@/hooks/useFormDialog";
import CardForm from "../CardForm/CardForm";

// Adding: the Pokémon it's added for, and the printed card picked from its
// catalogue (null or missing: entered by hand).
export type CardDialogDefaults = {
  pokemonId?: number;
  catalogCard?: CatalogCard | null;
};

const CardDialog: React.FC<FormDialogProps<OwnedCard, CardDialogDefaults>> = ({
  item,
  defaults,
  open,
  onOpenChange,
}) => {
  const close = () => onOpenChange(false);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Edit card" : defaults.catalogCard ? "Add card" : "Add a card by hand"}
    >
      <CardForm
        card={item}
        pokemonId={item?.pokemon_id ?? defaults.pokemonId ?? 0}
        catalogCard={item ? null : (defaults.catalogCard ?? null)}
        onDone={close}
      />
    </Dialog>
  );
};

export default CardDialog;
