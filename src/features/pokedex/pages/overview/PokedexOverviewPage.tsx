import type React from "react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
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
import { cn, fold } from "@/lib/utils";
import { GroupCard } from "@/features/pokedex/components";
import { CLASSES, REGIONS } from "@/features/pokedex/constants";
import { useGoal } from "@/features/pokedex/hooks";
import { PokedexGrid } from "./components";
import styles from "./PokedexOverview.module.scss";

const TABS = ["all", "caught", "missing"];

const isCaught = (pokemon: Pokemon) => (pokemon.card_count ?? 0) > 0;
const inRange = (pokemon: Pokemon, range: { first: number; last: number }) =>
  pokemon.id! >= range.first && pokemon.id! <= range.last;

const PokedexOverviewPage: React.FC = () => {
  const { data, isLoading, error } = usePokedex();
  const goal = useGoal();
  const [tab, setTab] = useTabParam(TABS);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");

  // One filter at a time: a region (?region=) or a class (?class=). Without
  // either, the goal: every region with a Pokédex binder.
  const region = REGIONS.find((candidate) => candidate.value === params.get("region"));
  const pokemonClass = region
    ? undefined
    : CLASSES.find((candidate) => candidate.value === params.get("class"));
  // Tapping the active one again goes back to the goal.
  const filterBy = (param: "region" | "class", value: string, active: boolean) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("region");
        next.delete("class");
        if (!active) next.set(param, value);
        return next;
      },
      { replace: true },
    );

  const all = data ?? [];
  const collecting = all.filter((pokemon) => goal.inGoal(pokemon.id!));
  const caughtGoal = collecting.filter(isCaught).length;
  const caughtOther = all.filter((pokemon) => isCaught(pokemon) && !goal.inGoal(pokemon.id!)).length;
  const header = (
    <PageHeader
      headline="Pokédex"
      desc={
        !data
          ? undefined
          : goal.isCollecting
            ? `${caughtGoal} of ${collecting.length} caught` +
              (caughtOther ? ` · ${caughtOther} from other regions` : "")
            : `Every binder finished · ${caughtOther} caught`
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

  const query = fold(search.trim());
  // Without a filter, the goal; a search then looks through every region.
  const base = region
    ? all.filter((pokemon) => inRange(pokemon, region))
    : pokemonClass
      ? all.filter((pokemon) => pokemon.class === pokemonClass.value)
      : query
        ? all
        : collecting;
  const shown = base.filter(
    (pokemon) => !query || matchesPokemon(pokemon.id!, pokemon.name ?? "", query),
  );
  const caught = shown.filter(isCaught);
  const missing = shown.filter((pokemon) => !isCaught(pokemon));
  const regionCard = (candidate: (typeof REGIONS)[number]) => (
    <GroupCard
      key={candidate.value}
      label={candidate.label}
      eyebrow={candidate.generation}
      artwork={candidate.starters}
      total={candidate.last - candidate.first + 1}
      caught={all.filter((pokemon) => isCaught(pokemon) && inRange(pokemon, candidate)).length}
      active={candidate === region}
      onSelect={() => filterBy("region", candidate.value, candidate === region)}
    />
  );
  const classCard = (candidate: (typeof CLASSES)[number]) => {
    const members = all.filter((pokemon) => pokemon.class === candidate.value);
    return (
      <GroupCard
        key={candidate.value}
        label={candidate.plural}
        artwork={candidate.artwork}
        total={members.length}
        caught={members.filter(isCaught).length}
        active={candidate === pokemonClass}
        onSelect={() => filterBy("class", candidate.value, candidate === pokemonClass)}
      />
    );
  };
  const grid = (pokemon: Pokemon[], emptyMessage: string) => {
    if (!pokemon.length) {
      return (
        <EmptyState
          message={query ? `No Pokémon here matches "${search.trim()}".` : emptyMessage}
        />
      );
    }
    if (!pokemonClass) return <PokedexGrid pokemon={pokemon} />;
    // A class spans the regions, so each region gets its own heading.
    return (
      <Flex direction="column" gap="5">
        {REGIONS.map((candidate) => {
          const inRegion = pokemon.filter((entry) => inRange(entry, candidate));
          return (
            inRegion.length > 0 && (
              <Flex key={candidate.value} direction="column" gap="2">
                <Text size="2" weight="bold" color="gray">
                  {candidate.label}
                </Text>
                <PokedexGrid pokemon={inRegion} />
              </Flex>
            )
          );
        })}
      </Flex>
    );
  };

  return (
    <PageLayout>
      {header}
      {goal.isCollecting ? (
        <Grid columns="2" gap="3">
          {goal.regions.map(regionCard)}
        </Grid>
      ) : (
        <Text size="2">
          Every Pokédex binder is finished, so there&apos;s nothing to collect for.{" "}
          <Link to="/binders">Start a new binder</Link> for another region.
        </Text>
      )}
      {goal.finished.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="2" weight="bold" color="gray">
            Finished
          </Text>
          <div className={styles.more}>{goal.finished.map(regionCard)}</div>
        </Flex>
      )}
      {goal.others.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="2" weight="bold" color="gray">
            Other regions
          </Text>
          <div className={styles.more}>{goal.others.map(regionCard)}</div>
        </Flex>
      )}
      <Flex direction="column" gap="2">
        <Text size="2" weight="bold" color="gray">
          Legends & starters
        </Text>
        <div className={cn(styles.more, styles.more__classes)}>{CLASSES.map(classCard)}</div>
      </Flex>
      <Flex direction="column" gap="3">
        {pokemonClass && (
          <Text size="2" color="gray">
            <Text as="span" size="2" weight="bold" color="inherit">
              {pokemonClass.plural}:
            </Text>{" "}
            {pokemonClass.about}
          </Text>
        )}
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
