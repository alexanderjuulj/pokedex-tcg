import type React from "react";
import { useState } from "react";
import { PokeBall } from "@/components/ui";
import { imageLoading } from "@/lib/images";
import { artUrl } from "@/lib/pokemon";
import { cn } from "@/lib/utils";
import styles from "./PokemonArt.module.scss";

type PokemonArtProps = {
  pokemonId: number;
  name: string;
  // A Pokémon not caught yet shows as a shadow.
  silhouette?: boolean;
  className?: string;
  eager?: boolean;
};

const PokemonArt: React.FC<PokemonArtProps> = ({
  pokemonId,
  name,
  silhouette = false,
  className,
  eager = false,
}) => {
  const src = artUrl(pokemonId);
  const load = imageLoading(src);
  // The artwork isn't in the repository (pnpm pokemon:art downloads it), so a
  // checkout without it shows a Poké Ball instead of a broken image.
  const [missing, setMissing] = useState(false);
  if (missing) return <PokeBall className={cn(styles.art, styles.art__missing, className)} />;
  return (
    <img
      src={src}
      alt={name}
      {...load}
      loading={eager ? "eager" : load.loading}
      draggable={false}
      onError={() => setMissing(true)}
      className={cn(styles.art, silhouette && styles.art__silhouette, className)}
    />
  );
};

export default PokemonArt;
