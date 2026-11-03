import type React from "react";
import { useState } from "react";
import { PenLine } from "lucide-react";
import { Button, EmptyState, Flex, SearchInput, Spinner, Text } from "@/components/ui";
import { usePokemonCatalog, type CatalogCard } from "@/hooks/queries";
import { fold } from "@/lib/utils";
import { CatalogGrid } from "@/features/cards/components";

type CatalogTabProps = {
  pokemonId: number;
  onPick: (card: CatalogCard) => void;
  onAddByHand: () => void;
};

// Every printed card of the Pokémon, grouped by series (Base, Neo, EX, ...)
// in the order they came out.
const CatalogTab: React.FC<CatalogTabProps> = ({ pokemonId, onPick, onAddByHand }) => {
  const { data, isLoading, error } = usePokemonCatalog(pokemonId);
  const [search, setSearch] = useState("");

  if (isLoading) return <Spinner />;
  if (error) return <EmptyState message={`Failed to load: ${error.message}`} />;

  const query = fold(search.trim());
  const cards = (data ?? []).filter(
    (card) =>
      !query ||
      [card.name, card.set_name, card.series, card.local_id, card.rarity, card.released_on?.slice(0, 4)]
        .some((text) => text && fold(text).includes(query)),
  );
  const series = new Map<string, CatalogCard[]>();
  for (const card of cards) {
    const name = card.series ?? "Other";
    series.set(name, [...(series.get(name) ?? []), card]);
  }

  const addByHand = (
    <Button variant="secondary" onClick={onAddByHand}>
      <PenLine size={18} aria-hidden />
      Not listed? Add it by hand
    </Button>
  );

  return (
    <Flex direction="column" gap="5">
      <SearchInput
        value={search}
        onValueChange={setSearch}
        label="Search the cards"
        placeholder="Set, name, number or year…"
      />
      {cards.length === 0 && (
        <EmptyState
          message={query ? `No card matches "${search.trim()}".` : "The catalogue has no cards of this Pokémon."}
        />
      )}
      {[...series].map(([name, seriesCards]) => (
        <Flex key={name} direction="column" gap="3">
          <Text size="2" weight="bold" color="gray">
            {name} · {seriesCards.length}
          </Text>
          <CatalogGrid cards={seriesCards} onPick={onPick} />
        </Flex>
      ))}
      <Flex>{addByHand}</Flex>
    </Flex>
  );
};

export default CatalogTab;
