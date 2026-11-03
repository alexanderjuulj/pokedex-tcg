import type React from "react";
import { PokeBall } from "@/components/ui";
import type { CardSet } from "@/hooks/queries";
import { imageLoading } from "@/lib/images";
import { setImageUrl } from "@/lib/pokemon";
import { cn } from "@/lib/utils";
import styles from "./SetLogo.module.scss";

type SetLogoProps = {
  set: Pick<CardSet, "id" | "name" | "has_logo">;
  className?: string;
};

// The logo printed on the set's packs, fitted into the box it's given. A Poké
// Ball for the sets neither source has a logo of (mostly promos and kits).
const SetLogo: React.FC<SetLogoProps> = ({ set, className }) => {
  if (set.id === null || !set.has_logo) {
    return (
      <span className={cn(styles.logo, styles.logo__none, className)} role="img" aria-label={set.name ?? ""}>
        <PokeBall className={styles.logo_ball} />
      </span>
    );
  }
  const src = setImageUrl(set.id, "logo");
  return (
    <img
      src={src}
      {...imageLoading(src)}
      alt={set.name ?? ""}
      draggable={false}
      className={cn(styles.logo, className)}
    />
  );
};

export default SetLogo;
