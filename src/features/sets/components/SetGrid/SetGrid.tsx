import type React from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui";
import type { CardSet } from "@/hooks/queries";
import { formatReleased } from "@/lib/pokemon";
import SetLogo from "../SetLogo/SetLogo";
import SetSymbol from "../SetSymbol/SetSymbol";
import styles from "./SetGrid.module.scss";

type SetGridProps = {
  sets: CardSet[];
  // Under the date. Default: how many of the Pokémon still missing it holds.
  note?: (set: CardSet) => React.ReactNode;
  // Opens each set's page on this Pokémon's cards only.
  pokemonId?: number;
};

const needBadge = (set: CardSet) => {
  const missing = set.missing_count ?? 0;
  if (!set.pokemon_count) return <Badge variant="neutral">Other regions only</Badge>;
  return missing > 0 ? (
    <Badge variant="primary">{missing} you need</Badge>
  ) : (
    <Badge variant="success">Got them all</Badge>
  );
};

// Sets as tiles, with the logo and symbol to match against packs and cards.
const SetGrid: React.FC<SetGridProps> = ({ sets, note = needBadge, pokemonId }) => (
  <div className={styles.grid}>
    {sets.map((set) => (
      <Link
        key={set.id}
        to={`/sets/${set.id}${pokemonId ? `?pokemon=${pokemonId}` : ""}`}
        className={styles.set}
      >
        <span className={styles.set_logo}>
          <SetLogo set={set} />
        </span>
        <span className={styles.set_name}>
          <SetSymbol set={set} />
          <span className={styles.set_nameText}>{set.name}</span>
        </span>
        <span className={styles.set_meta}>{formatReleased(set.released_on)}</span>
        {note(set)}
      </Link>
    ))}
  </div>
);

export default SetGrid;
