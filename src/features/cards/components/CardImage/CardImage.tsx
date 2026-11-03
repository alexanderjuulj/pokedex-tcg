import type React from "react";
import { PokeBall } from "@/components/ui";
import { imageLoading } from "@/lib/images";
import { cardImageUrl } from "@/lib/pokemon";
import { cn } from "@/lib/utils";
import styles from "./CardImage.module.scss";

type CardImageProps = {
  catalogCardId: number | null;
  hasImage: boolean | null;
  size: "low" | "high";
  alt: string;
  className?: string;
};

// The card's scan from the catalogue, or a blank card for one without
// (entered by hand, or TCGdex has none).
const CardImage: React.FC<CardImageProps> = ({
  catalogCardId,
  hasImage,
  size,
  alt,
  className,
}) => {
  if (catalogCardId === null || !hasImage) {
    return (
      <span className={cn(styles.card, styles.card__blank, className)} role="img" aria-label={alt}>
        <PokeBall className={styles.card_ball} />
        <span className={styles.card_name}>{alt}</span>
      </span>
    );
  }
  const src = cardImageUrl(catalogCardId, size);
  return (
    <img
      src={src}
      alt={alt}
      {...imageLoading(src)}
      draggable={false}
      className={cn(styles.card, className)}
    />
  );
};

export default CardImage;
