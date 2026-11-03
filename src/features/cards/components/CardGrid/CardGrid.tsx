import type React from "react";
import { Link } from "react-router";
import { Star } from "lucide-react";
import type { OwnedCard } from "@/hooks/queries";
import { formatCardNumber } from "@/lib/pokemon";
import CardImage from "../CardImage/CardImage";
import styles from "./CardGrid.module.scss";

type CardGridProps = {
  cards: OwnedCard[];
  // On the Cards page, where they're mixed: which Pokémon each is for.
  showPokemon?: boolean;
  // On a Pokémon's page: the star on the card in its slot.
  showFeatured?: boolean;
};

const CardGrid: React.FC<CardGridProps> = ({ cards, showPokemon = false, showFeatured = false }) => (
  <div className={styles.grid}>
    {cards.map((card) => (
      <Link key={card.id} to={`/cards/${card.id}`} className={styles.item}>
        <span className={styles.item_image}>
          <CardImage
            catalogCardId={card.catalog_card_id}
            hasImage={card.has_image}
            size="low"
            alt={card.name ?? ""}
          />
          {showFeatured && card.is_featured && (
            <span className={styles.item_featured} title="In the Pokédex slot">
              <Star size={14} fill="currentColor" aria-label="Featured" />
            </span>
          )}
        </span>
        <span className={styles.item_name}>
          {showPokemon && card.name !== card.pokemon_name
            ? `${card.name} · ${card.pokemon_name}`
            : card.name}
        </span>
        <span className={styles.item_set}>
          {card.set_name ?? "Entered by hand"} · {formatCardNumber(card.number, card.set_card_count)}
        </span>
      </Link>
    ))}
  </div>
);

export default CardGrid;
