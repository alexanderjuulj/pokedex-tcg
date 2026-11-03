import type React from "react";
import { useState } from "react";
import { Box, EmptyState, Flex, SearchInput, Select, Spinner, Tabs, Text } from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import { useSets, type CardSet } from "@/hooks/queries";
import { useTabParam } from "@/hooks/useTabParam";
import { fold } from "@/lib/utils";
import { SetGrid } from "@/features/sets/components";

const TABS = ["boosters", "other"];
const SORT_ITEMS = [
  { value: "newest", label: "Newest" },
  { value: "need", label: "Most needed" },
];
const SORTS = SORT_ITEMS.map((item) => item.value);

const SetsOverviewPage: React.FC = () => {
  const { data, isLoading, error } = useSets();
  const [tab, setTab] = useTabParam(TABS);
  const [sort, setSort] = useTabParam(SORTS, "newest", "sort");
  const [search, setSearch] = useState("");

  const header = (
    <PageHeader headline="Sets" desc="Which packs hold the Pokémon you still need" />
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

  const query = fold(search.trim());
  const shown = (data ?? []).filter(
    (set) =>
      !query ||
      [set.name, set.series, set.released_on?.slice(0, 4)].some(
        (text) => text && fold(text).includes(query),
      ),
  );
  // Newest first from the API; the sort is stable, so ties stay newest first.
  const sorted =
    sort === "need"
      ? [...shown].sort((a, b) => (b.missing_count ?? 0) - (a.missing_count ?? 0))
      : shown;
  const boosters = sorted.filter((set) => set.in_boosters);
  const other = sorted.filter((set) => !set.in_boosters);

  const list = (sets: CardSet[]) => {
    if (!sets.length) {
      return (
        <EmptyState message={query ? `No set matches "${search.trim()}".` : "No sets here."} />
      );
    }
    if (sort === "need") return <SetGrid sets={sets} />;
    // Newest first, so each series comes in the order it last had a set out.
    const series = new Map<string, CardSet[]>();
    for (const set of sets) {
      const name = set.series ?? "Other";
      series.set(name, [...(series.get(name) ?? []), set]);
    }
    return (
      <Flex direction="column" gap="5">
        {[...series].map(([name, seriesSets]) => (
          <Flex key={name} direction="column" gap="3">
            <Text size="2" weight="bold" color="gray">
              {name} · {seriesSets.length}
            </Text>
            <SetGrid sets={seriesSets} />
          </Flex>
        ))}
      </Flex>
    );
  };

  return (
    <PageLayout>
      {header}
      <Flex direction="column" gap="3">
        <Flex gap="2" align="center">
          <Box flexGrow="1" minWidth="0">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              label="Search the sets"
              placeholder="Set or series…"
            />
          </Box>
          <Box flexShrink="0" width="9.5rem">
            <Select value={sort} onValueChange={setSort} items={SORT_ITEMS} required />
          </Box>
        </Flex>
        <Tabs
          value={tab}
          onValueChange={setTab}
          items={[
            {
              value: "boosters",
              label: "Booster sets",
              count: boosters.length,
              content: list(boosters),
            },
            {
              value: "other",
              label: "Promos & more",
              count: other.length,
              content: list(other),
            },
          ]}
        />
      </Flex>
    </PageLayout>
  );
};

export default SetsOverviewPage;
