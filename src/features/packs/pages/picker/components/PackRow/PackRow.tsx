import type React from "react";
import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui";
import type { CardSet } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { SetLogo } from "@/features/sets/components";
import { formatPackOdds, packsInARow, type PackValue } from "@/features/sets/odds";
import { AmountInput } from "@/features/packs/components";
import { formatAbout, formatChance } from "@/features/packs/format";
import styles from "./PackRow.module.scss";

type PackRowProps = {
  rank: number;
  set: CardSet;
  // Null while its cards load (loading) or when its packs can't be told.
  value: PackValue | null;
  loading: boolean;
  // The pack to go for: the first, among several.
  best: boolean;
  // Others have a price and this one hasn't, so it's ranked after them.
  unpriced: boolean;
  // Per pack, in hundredths.
  price: number | null;
  onPriceChange: (price: number | null) => void;
  onRemove: () => void;
  pokemonName: (pokemonId: number) => string;
};

// A pack on offer: its rank, what decides (the cost of a Pokémon you need, or
// what a pack gives) and its price. Tapped, the rest: the best chances, what
// more packs add, the set.
const PackRow: React.FC<PackRowProps> = ({
  rank,
  set,
  value,
  loading,
  best,
  unpriced,
  price,
  onPriceChange,
  onRemove,
  pokemonName,
}) => {
  const money = useCurrency();
  const [open, setOpen] = useState(false);
  const gives = value && value.expected > 0 ? value.expected : null;
  const perPokemon = gives !== null && price !== null ? Math.round(price / gives) : null;

  // Said only when it matters: most packs hold one you need.
  const warning = loading
    ? null
    : !value
      ? "No odds for this set's packs"
      : gives === null
        ? "None of the ones you need are commons or uncommons here"
        : value.chanceAny < 0.6
          ? `Only ${formatPackOdds(value.chanceAny).toLowerCase()} has one you need`
          : null;

  return (
    <div className={cn(styles.row, best && styles.row__best)}>
      <button
        type="button"
        className={styles.row_head}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className={styles.row_rank}>{rank}</span>
        <SetLogo set={set} className={styles.row_logo} />
        <span className={styles.row_name}>
          <span className={styles.row_title}>{set.name}</span>
          <span className={styles.row_meta}>
            {set.released_on?.slice(0, 4)}
            {open ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />}
          </span>
        </span>
        <span className={styles.row_metric}>
          {loading ? (
            <span className={styles.row_caption}>…</span>
          ) : perPokemon !== null ? (
            <>
              <span className={styles.row_number}>{money.format(perPokemon)}</span>
              <span className={styles.row_caption}>per Pokémon</span>
            </>
          ) : gives !== null ? (
            <>
              <span className={styles.row_number}>≈ {formatAbout(gives)}</span>
              <span className={styles.row_caption}>a pack</span>
            </>
          ) : (
            <span className={styles.row_number}>—</span>
          )}
        </span>
      </button>
      <div className={styles.row_line}>
        <span className={cn(warning && styles.row_warning)}>
          {warning ??
            (perPokemon !== null && gives !== null
              ? `≈ ${formatAbout(gives)} a pack`
              : unpriced
                ? "No price yet"
                : "")}
        </span>
        <AmountInput
          value={price}
          onChange={onPriceChange}
          placeholder={`Price (${money.symbol})`}
          aria-label={`Price of a ${set.name} pack`}
        />
      </div>
      {open && (
        <div className={styles.row_details}>
          {value && value.pokemon.length > 0 && (
            <>
              <span>{bestChances(value.pokemon, pokemonName)}</span>
              <span>
                {`Next packs: ${packsInARow(value, 4)
                  .slice(1)
                  .map(formatAbout)
                  .join(" · ")}, as the ones you got come again`}
              </span>
              {value.chanceAny >= 0.6 && (
                <span>{`${formatPackOdds(value.chanceAny)} ${value.chanceAny < 0.85 ? "have" : "has"} one you need`}</span>
              )}
            </>
          )}
          <span>{`The set holds ${set.missing_count ?? 0} of the Pokémon you need, rares too`}</span>
          <span className={styles.row_actions}>
            <Link to={`/sets/${set.id}`}>Open the set</Link>
            <Button variant="ghost" onClick={onRemove}>
              Remove
            </Button>
          </span>
        </div>
      )}
    </div>
  );
};

// "Best chances: Skarmory 11%, Arbok 6%, Nidoqueen 6%"; in most sets many
// share the same odds (one common each), and then it says so.
function bestChances(entries: PackValue["pokemon"], pokemonName: (pokemonId: number) => string) {
  const top = entries.slice(0, 3);
  const names = top.map((entry) => pokemonName(entry.pokemonId));
  if (top.length > 1 && top[0].odds - top[top.length - 1].odds < 0.005) {
    const alike = entries.filter((entry) => top[0].odds - entry.odds < 0.005).length;
    const more = alike > top.length ? ` and ${alike - top.length} more` : "";
    return `Best chances: ${names.join(", ")}${more}, ${formatChance(top[0].odds)} a pack each`;
  }
  return `Best chances: ${top.map((entry, index) => `${names[index]} ${formatChance(entry.odds)}`).join(", ")}`;
}

export default PackRow;
