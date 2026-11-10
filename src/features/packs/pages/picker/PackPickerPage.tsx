import type React from "react";
import { EmptyState, Field, Flex, Grid, Select, Spinner } from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import {
  usePokedex,
  usePurchaseItems,
  useSetCatalogs,
  useSets,
  type CardSet,
} from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { useGoal } from "@/features/pokedex/hooks";
import { hasPackOdds, packValue } from "@/features/sets/odds";
import type { Offer } from "@/features/packs/budget";
import { AmountInput } from "@/features/packs/components";
import { usePackList } from "@/features/packs/hooks";
import { PackAnswer, PackRow } from "./components";
import styles from "./PackPicker.module.scss";

// Which pack to buy: pick the packs on offer (at a shop, an expo, online) and
// see which gives the most Pokémon you still need, the goal's, for its price.
// The answer comes first (what to buy with a budget, or the best pick), then
// the packs ranked, two lines each, the rest on a tap. The list lives in the
// link (usePackList).
const PackPickerPage: React.FC = () => {
  const sets = useSets();
  const pokedex = usePokedex();
  const goal = useGoal();
  const purchaseItems = usePurchaseItems();
  const money = useCurrency();
  const list = usePackList();

  // Only the sets whose packs can be told: their era's boosters, counted.
  const offered = (sets.data ?? []).filter(hasPackOdds);
  const byTcgdexId = new Map(offered.map((set) => [set.tcgdex_id!, set]));
  const chosen = list.entries.flatMap((entry) => {
    const set = byTcgdexId.get(entry.tcgdexId);
    return set ? [{ set, price: entry.price }] : [];
  });
  const catalogs = useSetCatalogs(chosen.map((entry) => entry.set.id!));

  const header = (
    <PageHeader
      headline="Which pack?"
      desc={
        goal.isCollecting
          ? `The packs on offer, by the Pokémon you still need for ${goal.label}`
          : "The packs on offer, by the Pokémon you still need"
      }
    />
  );
  const loading = [sets, pokedex, goal, purchaseItems, money].some((query) => query.isLoading);
  if (loading) {
    return (
      <PageLayout>
        {header}
        <Spinner />
      </PageLayout>
    );
  }
  const error = sets.error ?? pokedex.error ?? goal.error;
  if (error) {
    return (
      <PageLayout>
        {header}
        <EmptyState message={`Failed to load: ${error.message}`} />
      </PageLayout>
    );
  }
  if (!goal.isCollecting) {
    return (
      <PageLayout>
        {header}
        <EmptyState message="Every Pokédex binder is finished, so there's no Pokémon you need. Start a new binder under Binders." />
      </PageLayout>
    );
  }

  // The Pokémon you need: an empty pocket for it in a binder being
  // collected.
  const pokemon = new Map((pokedex.data ?? []).map((entry) => [entry.id!, entry]));
  const needed = goal.needed;
  const pokemonName = (pokemonId: number) => pokemon.get(pokemonId)?.name ?? `#${pokemonId}`;

  // What you last paid for a pack of the set, to start its price at.
  const lastPaid = (cardSetId: number) => {
    const line = purchaseItems.data?.find(
      (item) => item.card_set_id === cardSetId && (item.packs ?? 0) > 0,
    );
    return line ? Math.round(line.unit_price! / line.packs!) : null;
  };

  const rows = chosen.map((entry, index) => {
    const catalog = catalogs[index];
    const value = catalog.data ? packValue(entry.set, catalog.data, needed) : null;
    const gives = value && value.expected > 0 ? value.expected : null;
    const perPokemon = gives !== null && entry.price !== null ? Math.round(entry.price / gives) : null;
    return { ...entry, value, gives, perPokemon, loading: catalog.isLoading };
  });
  // The packs with a price by what a Pokémon you need costs, then the ones
  // without (or with no price at all) by how many a pack gives.
  const priced = rows.some((row) => row.perPokemon !== null);
  const ranked = [...rows].sort((a, b) => {
    const cost = (a.perPokemon ?? Infinity) - (b.perPokemon ?? Infinity);
    return priced && !Number.isNaN(cost) && cost !== 0 ? cost : (b.gives ?? 0) - (a.gives ?? 0);
  });
  const settled = rows.length > 0 && rows.every((row) => !row.loading);
  const top = settled && ranked[0].value && ranked[0].gives !== null ? ranked[0] : null;

  const offers: Offer[] = rows.flatMap((row) =>
    row.value && row.price !== null
      ? [{ key: row.set.tcgdex_id!, value: row.value, price: row.price }]
      : [],
  );
  const unpriced: CardSet[] = rows.filter((row) => row.price === null).map((row) => row.set);

  const addItems = offered
    .filter((set) => !list.entries.some((entry) => entry.tcgdexId === set.tcgdex_id))
    .map((set) => ({
      value: set.tcgdex_id!,
      label: set.released_on ? `${set.name} (${set.released_on.slice(0, 4)})` : set.name!,
    }));

  return (
    <PageLayout>
      {header}
      <Flex direction="column" gap="4">
        <Grid columns="minmax(0, 1fr) 7rem" gap="3" align="end">
          <Field label="Packs they have">
            <Select
              value=""
              onValueChange={(tcgdexId) => {
                const set = byTcgdexId.get(tcgdexId);
                if (set) list.add(tcgdexId, lastPaid(set.id!));
              }}
              items={addItems}
              placeholder="Add a pack…"
              searchable
            />
          </Field>
          <Field label={`Budget (${money.symbol})`}>
            <AmountInput value={list.budget} onChange={list.setBudget} placeholder="Any" />
          </Field>
        </Grid>
        {rows.length === 0 ? (
          <EmptyState message="Add the packs on offer, at a shop, an expo or online, to see which gives the most Pokémon you need." />
        ) : (
          <>
            {top && top.value && (rows.length > 1 || list.budget !== null) && (
              <PackAnswer
                best={{ set: top.set, value: top.value, perPokemon: top.perPokemon }}
                offers={offers}
                sets={byTcgdexId}
                unpriced={unpriced}
                budget={list.budget}
              />
            )}
            <Grid columns={{ initial: "1", md: "2" }} gap="2" align="start">
              {ranked.map((row, index) => (
                <PackRow
                  key={row.set.tcgdex_id}
                  rank={index + 1}
                  set={row.set}
                  value={row.value}
                  loading={row.loading}
                  best={rows.length > 1 && row === top}
                  unpriced={priced && row.price === null}
                  price={row.price}
                  onPriceChange={(price) => list.setPrice(row.set.tcgdex_id!, price)}
                  onRemove={() => list.remove(row.set.tcgdex_id!)}
                  pokemonName={pokemonName}
                />
              ))}
            </Grid>
          </>
        )}
        <details className={styles.method}>
          <summary>How it&apos;s counted</summary>
          <p>
            The packs with a price are ranked by what each Pokémon you need costs: the price of a
            pack over how many it gives, on average. The ones without a price come after, by how
            many a pack gives.
          </p>
          <p>
            A pack&apos;s chances come from the set&apos;s commons, uncommons and reverse holos, like
            the pack odds on a Pokémon&apos;s page. The pull rates of rarer cards aren&apos;t
            published, so a set whose Pokémon you need are mostly rares comes out low. Sets with their
            own kind of packs (Celebrations, decks, trainer kits) can&apos;t be picked.
          </p>
          <p>
            A budget is spent one pack at a time, on the one that adds the most for its price. Each
            pack makes the next of its set (and of any set sharing its Pokémon) worth less, as the
            ones it likely gave would come again.
          </p>
          <p>Prices start at what you last paid for a pack of the set, on the Spending page.</p>
        </details>
      </Flex>
    </PageLayout>
  );
};

export default PackPickerPage;
