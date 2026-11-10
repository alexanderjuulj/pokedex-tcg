import type React from "react";
import { Flex, Text } from "@/components/ui";
import type { Purchase, PurchaseItem } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { formatDay } from "@/lib/utils";
import { costPerPack } from "@/features/spending/spending";
import styles from "../../PurchaseSingle.module.scss";

type PurchaseFactsProps = {
  purchase: Purchase;
  items: PurchaseItem[];
};

const PurchaseFacts: React.FC<PurchaseFactsProps> = ({ purchase, items }) => {
  const money = useCurrency();
  const perPack = costPerPack(items);
  const packs = purchase.pack_count ?? 0;
  const facts: [string, string][] = [
    ["Bought", formatDay(purchase.bought_on!)],
    ["Where", purchase.shop ?? "—"],
    ["Products", money.format(purchase.price ?? 0)],
    ["Shipping", purchase.shipping ? money.format(purchase.shipping) : "None"],
    ["Total", money.format(purchase.total ?? 0)],
    [
      "Packs",
      perPack === null ? "None" : `${packs}, ${money.format(perPack)} each`,
    ],
  ];

  return (
    <Flex direction="column" gap="3" minWidth="0">
      <div className={styles.single_facts}>
        {facts.map(([label, value]) => (
          <div key={label}>
            <span className={styles.single_label}>{label}</span>
            {value}
          </div>
        ))}
      </div>
      {purchase.notes && (
        <Flex direction="column" gap="2">
          <Text size="2" weight="bold">
            Notes
          </Text>
          <p className={styles.single_notes}>{purchase.notes}</p>
        </Flex>
      )}
    </Flex>
  );
};

export default PurchaseFacts;
