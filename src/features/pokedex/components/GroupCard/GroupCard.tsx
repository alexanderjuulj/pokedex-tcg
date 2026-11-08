import type React from "react";
import { cn } from "@/lib/utils";
import PokemonArt from "../PokemonArt/PokemonArt";
import styles from "./GroupCard.module.scss";

type GroupCardProps = {
  label: string;
  // Above the label: a region's generation.
  eyebrow?: string;
  // Three of its Pokémon, to recognise it by.
  artwork: number[];
  // How many Pokémon it has.
  total: number;
  // How far along the collection is, as a bar. Without it, `detail` or the
  // total.
  caught?: number;
  detail?: string;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

// A group of Pokémon (a region, or a class like the legendaries) to filter
// the Pokédex by or to pick for collecting, and how far along it is.
const GroupCard: React.FC<GroupCardProps> = ({
  label,
  eyebrow,
  artwork,
  total,
  caught,
  detail,
  active,
  disabled = false,
  onSelect,
}) => (
  <button
    type="button"
    className={cn(styles.group, active && styles.group__active)}
    aria-pressed={active}
    disabled={disabled}
    onClick={onSelect}
  >
    <span className={styles.group_heading}>
      {eyebrow && <span className={styles.group_eyebrow}>{eyebrow}</span>}
      <span className={styles.group_name}>{label}</span>
    </span>
    <span className={styles.group_artwork}>
      {artwork.map((id) => (
        <PokemonArt key={id} pokemonId={id} name="" eager className={styles.group_art} />
      ))}
    </span>
    {caught === undefined ? (
      <span className={styles.group_count}>{detail ?? `${total} Pokémon`}</span>
    ) : (
      <span className={styles.group_progress}>
        <span className={styles.group_track}>
          <span className={styles.group_fill} style={{ width: `${(caught / total) * 100}%` }} />
        </span>
        <span className={styles.group_count}>
          {caught}/{total}
        </span>
      </span>
    )}
  </button>
);

export default GroupCard;
