import type React from "react";
import { EmptyState, Flex, Spinner, Text } from "@/components/ui";
import { usePokemonCatalog, useSets, type CardSet, type CatalogCard } from "@/hooks/queries";
import { SetGrid } from "@/features/sets/components";
import styles from "./PokemonSets.module.scss";

type PokemonSetsProps = {
  pokemonId: number;
  pokemonName: string;
};

// The sets a Pokémon is in, newest first: where to look for it. Each tile
// says how rare its cards there are (a common is an easy pull, a special
// illustration rare a long shot) and opens the set on its cards.
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

  const rarities = (set: CardSet) => {
    const cards = cardsBySet.get(set.id!) ?? [];
    const named = [...new Set(cards.map((card) => card.rarity).filter(Boolean))];
    return (
      <span className={styles.rarities}>
        {named.length ? named.join(" · ") : cards.length === 1 ? "1 card" : `${cards.length} cards`}
      </span>
    );
  };

  if (!holding.length) return <EmptyState message={`No set has a ${pokemonName} card.`} />;

  return (
    <Flex direction="column" gap="5">
      {[
        { label: "Booster sets", list: boosters },
        { label: "Promos & more", list: other },
      ]
        .filter((group) => group.list.length)
        .map((group) => (
          <Flex key={group.label} direction="column" gap="3">
            <Text size="2" weight="bold" color="gray">
              {group.label} · {group.list.length}
            </Text>
            <SetGrid sets={group.list} note={rarities} pokemonId={pokemonId} />
          </Flex>
        ))}
    </Flex>
  );
};

export default PokemonSets;
