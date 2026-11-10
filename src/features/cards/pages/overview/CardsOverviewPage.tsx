import type React from "react";
import { useState } from "react";
import { EmptyState, Flex, SearchInput, Spinner, Tabs } from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import { useGoneCards, useOwnedCards, type Card } from "@/hooks/queries";
import { useTabParam } from "@/hooks/useTabParam";
import { fold } from "@/lib/utils";
import { CardGrid } from "@/features/cards/components";

const TABS = ["collection", "gone"];

const CardsOverviewPage: React.FC = () => {
  const { data, isLoading, error } = useOwnedCards();
  const gone = useGoneCards();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useTabParam(TABS);

  const cards = data ?? [];
  const goneCards = gone.data ?? [];
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

  if (isLoading || gone.isLoading) {
    return (
      <PageLayout>
        {header}
        <Spinner />
      </PageLayout>
    );
  }

  const failed = error ?? gone.error;
  if (failed) {
    return (
      <PageLayout>
        {header}
        <EmptyState message={`Failed to load: ${failed.message}`} />
      </PageLayout>
    );
  }

  if (cards.length === 0 && goneCards.length === 0) {
    return (
      <PageLayout>
        {header}
        <EmptyState message="No cards yet. Open a Pokémon in the Pokédex and pick its first card." />
      </PageLayout>
    );
  }

  const query = fold(search.trim());
  const matching = (list: Card[]) =>
    query
      ? list.filter((card) =>
          [card.name, card.pokemon_name, card.set_name, card.location, card.gone_to].some(
            (text) => text && fold(text).includes(query),
          ),
        )
      : list;
  const results = (list: Card[], empty: string) => {
    const shown = matching(list);
    if (shown.length) return <CardGrid cards={shown} showPokemon />;
    return <EmptyState message={query ? `No card matches "${search.trim()}".` : empty} />;
  };

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
        <Tabs
          value={tab}
          onValueChange={setTab}
          items={[
            {
              value: "collection",
              label: "Collection",
              count: matching(cards).length,
              content: results(cards, "Every card has gone."),
            },
            {
              value: "gone",
              label: "Gone",
              count: matching(goneCards).length,
              content: results(
                goneCards,
                "No card sold, given away or traded. To let one go, open it and pick Sell or give away in its menu.",
              ),
            },
          ]}
        />
      </Flex>
    </PageLayout>
  );
};

export default CardsOverviewPage;
