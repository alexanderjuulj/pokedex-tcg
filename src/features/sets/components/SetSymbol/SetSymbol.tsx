import type React from "react";
import type { CardSet } from "@/hooks/queries";
import { imageLoading } from "@/lib/images";
import { setImageUrl } from "@/lib/pokemon";
import { cn } from "@/lib/utils";
import styles from "./SetSymbol.module.scss";

type SetSymbolProps = {
  set: Pick<CardSet, "id" | "name" | "has_symbol">;
  className?: string;
};

// The set's mark as printed in a corner of its cards, to tell which set a
// card in hand is from. Nothing for the sets without one.
const SetSymbol: React.FC<SetSymbolProps> = ({ set, className }) => {
  if (set.id === null || !set.has_symbol) return null;
  const src = setImageUrl(set.id, "symbol");
  return (
    <img
      src={src}
      {...imageLoading(src)}
      alt={`${set.name} symbol`}
      draggable={false}
      className={cn(styles.symbol, className)}
    />
  );
};

export default SetSymbol;
