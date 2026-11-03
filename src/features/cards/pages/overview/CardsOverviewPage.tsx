import type React from "react";
import { useState } from "react";
import { EmptyState, Flex, SearchInput, Spinner } from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import { useOwnedCards } from "@/hooks/queries";
import { fold } from "@/lib/utils";
import { CardGrid } from "@/features/cards/components";

const CardsOverviewPage: React.FC = () => {
  const { data, isLoading, error } = useOwnedCards();
  const [search, setSearch] = useState("");

  const cards = data ?? [];
  const pokemonCount = new Set(cards.map((card) => card.pokemon_id)).size;
  const header = (
    <PageHeader
      headline="Cards"
      desc={
        data
          ? `${cards.length} ${cards.length === 1 ? "card" : "cards"} for ${pokemonCount} Pokémon`
          : undefined
      }
    />
  );

  if (isLoading) {
    return (
      <PageLayout>
        {header}
        <Spinner />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        {header}
        <EmptyState message={`Failed to load: ${error.message}`} />
      </PageLayout>
    );
  }

  if (cards.length === 0) {
    return (
      <PageLayout>
        {header}
        <EmptyState message="No cards yet. Open a Pokémon in the Pokédex and pick its first card." />
      </PageLayout>
    );
  }

  const query = fold(search.trim());
  const shown = query
    ? cards.filter((card) =>
        [card.name, card.pokemon_name, card.set_name, card.location]
          .some((text) => text && fold(text).includes(query)),
      )
    : cards;

  return (
    <PageLayout>
      {header}
      <Flex direction="column" gap="4">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          label="Search cards"
          placeholder="Card, Pokémon, set or binder…"
        />
        {shown.length ? (
          <CardGrid cards={shown} showPokemon />
        ) : (
          <EmptyState message={`No card matches "${search.trim()}".`} />
        )}
      </Flex>
    </PageLayout>
  );
};

export default CardsOverviewPage;
