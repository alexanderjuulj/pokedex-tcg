import type React from "react";
import { Plus } from "lucide-react";
import { Button, Dialog, Flex, Text } from "@/components/ui";
import type { CatalogCard } from "@/hooks/queries";
import type { FormDialogProps } from "@/hooks/useFormDialog";
import { formatCardNumber } from "@/lib/pokemon";
import CardImage from "../CardImage/CardImage";
import styles from "./CatalogCardDialog.module.scss";

type CatalogCardDialogProps = FormDialogProps<CatalogCard> & {
  onAdd: (card: CatalogCard) => void;
};

// A printed card up close before adding it: the large scan and its details.
const CatalogCardDialog: React.FC<CatalogCardDialogProps> = ({
  item: card,
  open,
  onOpenChange,
  onAdd,
}) => {
  const owned = card?.owned_count ?? 0;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={card?.name ?? "Card"}
      description={
        card
          ? `${card.set_name} · ${formatCardNumber(card.local_id, card.set_card_count)}`
          : undefined
      }
    >
      {card && (
        <Flex direction="column" gap="4">
          <CardImage
            catalogCardId={card.id}
            hasImage={card.has_image}
            size="high"
            alt={card.name ?? ""}
            className={styles.scan}
          />
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">
              {[card.rarity, card.released_on?.slice(0, 4)].filter(Boolean).join(" · ")}
            </Text>
            {card.illustrator && (
              <Text size="2" color="gray">
                {`Illustrated by ${card.illustrator}`}
              </Text>
            )}
            {owned > 0 && (
              <Text size="2" weight="bold">
                {owned === 1 ? "You have this card." : `You have ${owned} of this card.`}
              </Text>
            )}
          </Flex>
          <Flex direction={{ initial: "column", xs: "row" }}>
            <Button
              onClick={() => {
                onOpenChange(false);
                onAdd(card);
              }}
            >
              <Plus size={18} aria-hidden />
              {owned > 0 ? "Add another" : "Add to collection"}
            </Button>
          </Flex>
        </Flex>
      )}
    </Dialog>
  );
};

export default CatalogCardDialog;
