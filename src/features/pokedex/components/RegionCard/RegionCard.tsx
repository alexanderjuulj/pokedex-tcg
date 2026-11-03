import type React from "react";
import { cn } from "@/lib/utils";
import type { REGIONS } from "@/features/pokedex/constants";
import PokemonArt from "../PokemonArt/PokemonArt";
import styles from "./RegionCard.module.scss";

type RegionCardProps = {
  region: (typeof REGIONS)[number];
  // How far along the collection is, as a bar. Without it, `detail` or how
  // many Pokémon the region has.
  caught?: number;
  detail?: string;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

// One generation, to filter the Pokédex by or to pick for collecting: its
// starters, and how far along the collection is.
const RegionCard: React.FC<RegionCardProps> = ({
  region,
  caught,
  detail,
  active,
  disabled = false,
  onSelect,
}) => {
  const total = region.last - region.first + 1;
  return (
    <button
      type="button"
      className={cn(styles.region, active && styles.region__active)}
      aria-pressed={active}
      disabled={disabled}
      onClick={onSelect}
    >
      <span className={styles.region_heading}>
        <span className={styles.region_generation}>{region.generation}</span>
        <span className={styles.region_name}>{region.label}</span>
      </span>
      <span className={styles.region_starters}>
        {region.starters.map((id) => (
          <PokemonArt key={id} pokemonId={id} name="" eager className={styles.region_starter} />
        ))}
      </span>
      {caught === undefined ? (
        <span className={styles.region_count}>{detail ?? `${total} Pokémon`}</span>
      ) : (
        <span className={styles.region_progress}>
          <span className={styles.region_track}>
            <span
              className={styles.region_fill}
              style={{ width: `${(caught / total) * 100}%` }}
            />
          </span>
          <span className={styles.region_count}>
            {caught}/{total}
          </span>
        </span>
      )}
    </button>
  );
};

export default RegionCard;
