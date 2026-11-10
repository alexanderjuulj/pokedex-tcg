import type React from "react";
import { Link } from "react-router";
import type { PurchaseItem } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { SetLogo } from "@/features/sets/components";
import { PRODUCT_LABELS } from "@/features/spending/constants";
import { costPerPack, itemLabel } from "@/features/spending/spending";
import type { PurchaseProduct } from "@/features/spending/types";
import styles from "./PurchaseItems.module.scss";

type PurchaseItemsProps = {
  items: PurchaseItem[];
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// What a purchase held, each line with its share of the shipping. A set's line
// opens the set on its cards, to log what came out of the packs.
const PurchaseItems: React.FC<PurchaseItemsProps> = ({ items }) => {
  const money = useCurrency();
  return (
    <div className={styles.items}>
      {items.map((item) => {
        const perPack = costPerPack([item]);
        const each = money.format(item.unit_price!);
        const price = item.quantity! > 1 ? `${item.quantity} × ${each}` : each;
        const details = [
          [
            item.name && item.set_name,
            item.name || item.card_set_id === null
              ? PRODUCT_LABELS[item.product as PurchaseProduct]
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          item.shipping_share ? `${price} and ${money.format(item.shipping_share)} shipping` : price,
          perPack !== null &&
            `${plural(item.pack_count!, "pack", "packs")}, ${money.format(perPack)} each`,
          item.card_count ? `${plural(item.card_count, "card", "cards")} pulled` : null,
        ].filter(Boolean);
        const content = (
          <>
            <SetLogo
              set={{ id: item.card_set_id, name: item.set_name, has_logo: item.has_logo }}
              className={styles.item_logo}
            />
            <span className={styles.item_text}>
              <span className={styles.item_title}>{itemLabel(item)}</span>
              {details.map((detail) => (
                <span key={String(detail)} className={styles.item_detail}>
                  {detail}
                </span>
              ))}
            </span>
            <span className={styles.item_cost}>{money.format(item.cost!)}</span>
          </>
        );
        return item.card_set_id === null ? (
          <div key={item.id} className={styles.item}>
            {content}
          </div>
        ) : (
          <Link
            key={item.id}
            to={`/sets/${item.card_set_id}`}
            className={cn(styles.item, styles.item__link)}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
};

export default PurchaseItems;
