import type React from "react";
import { EmptyState, Flex, Spinner, Text } from "@/components/ui";
import { usePokemonCatalog, useSets, type CardSet, type CatalogCard } from "@/hooks/queries";
import { SetGrid } from "@/features/sets/components";
import { formatPackOdds, packOdds } from "@/features/sets/odds";
import { RECENT_YEARS } from "@/features/sets/constants";
import { todayIso } from "@/lib/utils";
import styles from "./PokemonSets.module.scss";

type PokemonSetsProps = {
  pokemonId: number;
  pokemonName: string;
};

// The sets a Pokémon is in, newest first: where to look for it. Each tile
// says how rare its cards there are (a common is an easy pull, a special
// illustration rare a long shot) and, for a booster set, about how many packs
// it takes, and the set with the best odds is named above them.
const PokemonSets: React.FC<PokemonSetsProps> = ({ pokemonId, pokemonName }) => {
  const catalog = usePokemonCatalog(pokemonId);
  const sets = useSets();

  if (catalog.isLoading || sets.isLoading) return <Spinner />;
  const error = catalog.error ?? sets.error;
  if (error) return <EmptyState message={`Failed to load: ${error.message}`} />;

  const cardsBySet = new Map<number, CatalogCard[]>();
  for (const card of catalog.data ?? []) {
    cardsBySet.set(card.card_set_id!, [...(cardsBySet.get(card.card_set_id!) ?? []), card]);
  }
  const holding = (sets.data ?? []).filter((set) => cardsBySet.has(set.id!));
  const boosters = holding.filter((set) => set.in_boosters);
  const other = holding.filter((set) => !set.in_boosters);

  const odds = new Map(boosters.map((set) => [set.id!, packOdds(set, cardsBySet.get(set.id!) ?? [])]));
  const bestOf = (list: CardSet[]) =>
    list.reduce<{ set: CardSet; odds: number } | null>((top, set) => {
      const chance = odds.get(set.id!) ?? null;
      return chance !== null && (!top || chance > top.odds) ? { set, odds: chance } : top;
    }, null);
  const best = bestOf(boosters);
  // The best odds are often in a set long out of print. Those of the last
  // two years are the ones a shop still has.
  const today = todayIso();
  const cutoff = `${Number(today.slice(0, 4)) - RECENT_YEARS}${today.slice(4)}`;
  const recent = bestOf(boosters.filter((set) => (set.released_on ?? "") >= cutoff));
  const oddsLine = (top: { set: CardSet; odds: number }) => (
    <>
      <strong>{top.set.name}</strong> ({top.set.released_on?.slice(0, 4)}),{" "}
      {formatPackOdds(top.odds).toLowerCase()}.
    </>
  );

  const note = (set: CardSet) => {
    const cards = cardsBySet.get(set.id!) ?? [];
    const named = [...new Set(cards.map((card) => card.rarity).filter(Boolean))];
    const chance = odds.get(set.id!) ?? null;
    return (
      <>
        <span className={styles.rarities}>
          {named.length ? named.join(" · ") : cards.length === 1 ? "1 card" : `${cards.length} cards`}
        </span>
        {chance !== null && <span className={styles.odds}>{formatPackOdds(chance)}</span>}
      </>
    );
  };

  if (!holding.length) return <EmptyState message={`No set has a ${pokemonName} card.`} />;

  return (
    <Flex direction="column" gap="5">
      {[
        { label: "Booster sets", list: boosters, best },
        { label: "Promos & more", list: other, best: null },
      ]
        .filter((group) => group.list.length)
        .map((group) => (
          <Flex key={group.label} direction="column" gap="3">
            <Text size="2" weight="bold" color="gray">
              {group.label} · {group.list.length}
            </Text>
            {group.best && (
              <Flex direction="column" gap="1">
                <Text size="2">Best odds: {oddsLine(group.best)}</Text>
                {recent && recent.set !== group.best.set && (
                  <Text size="2">From the last {RECENT_YEARS} years: {oddsLine(recent)}</Text>
                )}
                <Text size="1" color="gray">
                  An estimate, from how many commons and uncommons each set has. Rarer cards
                  aren&apos;t counted.
                </Text>
              </Flex>
            )}
            <SetGrid sets={group.list} note={note} pokemonId={pokemonId} />
          </Flex>
        ))}
    </Flex>
  );
};

export default PokemonSets;
