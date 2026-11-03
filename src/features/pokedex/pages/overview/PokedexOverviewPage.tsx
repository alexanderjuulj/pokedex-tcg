import type React from "react";
import { useState } from "react";
import {
  EmptyState,
  Flex,
  Grid,
  SearchInput,
  Spinner,
  Tabs,
  Text,
} from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import { usePokedex, type Pokemon } from "@/hooks/queries";
import { useTabParam } from "@/hooks/useTabParam";
import { matchesPokemon } from "@/lib/pokemon";
import { fold } from "@/lib/utils";
import { RegionCard } from "@/features/pokedex/components";
import { REGIONS } from "@/features/pokedex/constants";
import { useGoal } from "@/features/pokedex/hooks";
import { PokedexGrid } from "./components";
import styles from "./PokedexOverview.module.scss";

const TABS = ["all", "caught", "missing"];
// "goal", the default, is every region with a Pokédex binder together.
const REGION_VALUES = ["goal", ...REGIONS.map((region) => region.value)];

const isCaught = (pokemon: Pokemon) => (pokemon.card_count ?? 0) > 0;
const inRange = (pokemon: Pokemon, range: { first: number; last: number }) =>
  pokemon.id! >= range.first && pokemon.id! <= range.last;

const PokedexOverviewPage: React.FC = () => {
  const { data, isLoading, error } = usePokedex();
  const goal = useGoal();
  const [tab, setTab] = useTabParam(TABS);
  const [region, setRegion] = useTabParam(REGION_VALUES, "goal", "region");
  const [search, setSearch] = useState("");

  const all = data ?? [];
  const collecting = all.filter((pokemon) => goal.inGoal(pokemon.id!));
  const caughtGoal = collecting.filter(isCaught).length;
  const caughtOther = all.filter((pokemon) => isCaught(pokemon) && !goal.inGoal(pokemon.id!)).length;
  const header = (
    <PageHeader
      headline="Pokédex"
      desc={
        data
          ? `${caughtGoal} of ${collecting.length} caught` +
            (caughtOther ? ` · ${caughtOther} from other regions` : "")
          : undefined
      }
    />
  );

  if (isLoading || goal.isLoading) {
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

  const selected = REGIONS.find((candidate) => candidate.value === region);
  const query = fold(search.trim());
  // Without a region, the goal; a search then looks through every region.
  const base = selected
    ? all.filter((pokemon) => inRange(pokemon, selected))
    : query
      ? all
      : collecting;
  const shown = base.filter(
    (pokemon) => !query || matchesPokemon(pokemon.id!, pokemon.name ?? "", query),
  );
  const caught = shown.filter(isCaught);
  const missing = shown.filter((pokemon) => !isCaught(pokemon));
  const regionCard = (candidate: (typeof REGIONS)[number]) => (
    <RegionCard
      key={candidate.value}
      region={candidate}
      caught={all.filter((pokemon) => isCaught(pokemon) && inRange(pokemon, candidate)).length}
      active={candidate.value === region}
      onSelect={() => setRegion(candidate.value === region ? "goal" : candidate.value)}
    />
  );
  const grid = (pokemon: Pokemon[], emptyMessage: string) =>
    pokemon.length ? (
      <PokedexGrid pokemon={pokemon} />
    ) : (
      <EmptyState
        message={query ? `No Pokémon here matches "${search.trim()}".` : emptyMessage}
      />
    );

  return (
    <PageLayout>
      {header}
      <Grid columns="2" gap="3">
        {goal.regions.map(regionCard)}
      </Grid>
      {goal.others.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="2" weight="bold" color="gray">
            Other regions
          </Text>
          <div className={styles.more}>{goal.others.map(regionCard)}</div>
        </Flex>
      )}
      <Flex direction="column" gap="3">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          label="Search the Pokédex"
          placeholder="Name or number…"
        />
        <Tabs
          value={tab}
          onValueChange={setTab}
          items={[
            {
              value: "all",
              label: "All",
              count: shown.length,
              content: grid(shown, "No Pokémon here."),
            },
            {
              value: "caught",
              label: "Caught",
              count: caught.length,
              content: grid(caught, "None caught yet. Open a Pokémon to add its first card."),
            },
            {
              value: "missing",
              label: "Missing",
              count: missing.length,
              content: grid(missing, "Every one caught!"),
            },
          ]}
        />
      </Flex>
    </PageLayout>
  );
};

export default PokedexOverviewPage;
