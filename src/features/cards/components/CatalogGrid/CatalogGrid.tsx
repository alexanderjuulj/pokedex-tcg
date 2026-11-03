import type React from "react";
import { Check } from "lucide-react";
import type { CatalogCard } from "@/hooks/queries";
import { formatCardNumber } from "@/lib/pokemon";
import { cn } from "@/lib/utils";
import CardImage from "../CardImage/CardImage";
import styles from "./CatalogGrid.module.scss";

// The two lines under a card.
export type CatalogCaption = { title: string; detail: string };

// Under a Pokémon's cards: the set each is from.
const setCaption = (card: CatalogCard): CatalogCaption => ({
  title: card.set_name ?? "",
  detail:
    formatCardNumber(card.local_id, card.set_card_count) +
    (card.released_on ? ` · ${card.released_on.slice(0, 4)}` : ""),
});

type CatalogGridProps = {
  cards: CatalogCard[];
  onPick: (card: CatalogCard) => void;
  caption?: (card: CatalogCard) => CatalogCaption;
  // Faded: the cards that are less of a find (a set's caught Pokémon).
  muted?: boolean;
};

// Printed cards to pick from, with the ones we own ticked.
const CatalogGrid: React.FC<CatalogGridProps> = ({
  cards,
  onPick,
  caption = setCaption,
  muted = false,
}) => (
  <div className={cn(styles.grid, muted && styles.grid__muted)}>
    {cards.map((card) => {
      const { title, detail } = caption(card);
      return (
        // A tag-team card can be listed once for each Pokémon on it.
        <button
          key={`${card.id}-${card.pokemon_id}`}
          type="button"
          className={styles.item}
          onClick={() => onPick(card)}
          aria-label={`Add ${card.name}, ${card.set_name}`}
        >
          <span className={styles.item_image}>
            <CardImage
              catalogCardId={card.id}
              hasImage={card.has_image}
              size="low"
              alt={card.name ?? ""}
            />
            {(card.owned_count ?? 0) > 0 && (
              <span className={styles.item_owned} title="In the collection">
                <Check size={14} strokeWidth={3} aria-hidden />
                {(card.owned_count ?? 0) > 1 && card.owned_count}
              </span>
            )}
          </span>
          <span className={styles.item_title}>{title}</span>
          <span className={styles.item_detail}>{detail}</span>
        </button>
      );
    })}
  </div>
);

export default CatalogGrid;
