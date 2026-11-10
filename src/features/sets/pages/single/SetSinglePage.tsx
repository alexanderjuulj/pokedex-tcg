import type React from "react";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { Button, EmptyState, Flex, SearchInput, Spinner, Text } from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import {
  usePokedex,
  useSet,
  useSetCatalog,
  type CatalogCard,
  type OwnedCard,
} from "@/hooks/queries";
import { useFormDialog } from "@/hooks/useFormDialog";
import { formatCardNumber, formatDexNumber, formatReleased, matchesPokemon } from "@/lib/pokemon";
import { fold } from "@/lib/utils";
import {
  CardDialog,
  CatalogCardDialog,
  CatalogGrid,
  type CardDialogDefaults,
  type CatalogCaption,
} from "@/features/cards/components";
import { useGoal } from "@/features/pokedex/hooks";
import { SetLogo, SetSymbol } from "@/features/sets/components";
import styles from "./SetSingle.module.scss";

const pokemonIn = (cards: CatalogCard[]) => new Set(cards.map((card) => card.pokemon_id)).size;

const SetSinglePage: React.FC = () => {
  const params = useParams();
  const id = Number(params.id);
  const set = useSet(id);
  const catalog = useSetCatalog(id);
  const pokedex = usePokedex();
  const goal = useGoal();
  const cardDialog = useFormDialog<OwnedCard, CardDialogDefaults>();
  // A card up close before it's added; `edit` opens it on a card.
  const previewDialog = useFormDialog<CatalogCard>();
  // ?pokemon= from a Pokémon's Sets tab: only its cards in this set.
  const [searchParams, setSearchParams] = useSearchParams();
  const only = Number(searchParams.get("pokemon")) || null;
  const [search, setSearch] = useState("");

  if (set.isLoading || catalog.isLoading || pokedex.isLoading || goal.isLoading) {
    return (
      <PageLayout>
        <Spinner />
      </PageLayout>
    );
  }

  if (set.error || !set.data) {
    return (
      <PageLayout>
        <EmptyState message="That set isn't in the catalogue." />
      </PageLayout>
    );
  }

  const data = set.data;
  const names = new Map((pokedex.data ?? []).map((pokemon) => [pokemon.id, pokemon.name ?? ""]));
  const caught = new Set(
    (pokedex.data ?? []).filter((pokemon) => (pokemon.card_count ?? 0) > 0).map((pokemon) => pokemon.id),
  );
  const query = fold(search.trim());
  const cards = (catalog.data ?? [])
    .filter((card) => !only || card.pokemon_id === only)
    .filter(
      (card) =>
        !query ||
        matchesPokemon(card.pokemon_id!, names.get(card.pokemon_id) ?? "", query) ||
        fold(card.name ?? "").includes(query),
    )
    .sort(
      (a, b) =>
        a.pokemon_id! - b.pokemon_id! ||
        (a.local_id ?? "").localeCompare(b.local_id ?? "", undefined, { numeric: true }),
    );
  // The goal (the Pokédex binders' Pokémon) first; the other regions' cards
  // after, for logging a whole pack.
  const inGoal = (card: CatalogCard) => goal.inGoal(card.pokemon_id!);
  const need = cards.filter((card) => inGoal(card) && !caught.has(card.pokemon_id));
  const have = cards.filter((card) => inGoal(card) && caught.has(card.pokemon_id));
  const others = cards.filter((card) => !inGoal(card));
  const missing = data.missing_count ?? 0;
  // Under each card: the Pokémon it's listed for (the card's own name is on
  // the scan, and often long: "Team Rocket's Rattata"), then how rare it is.
  const caption = (card: CatalogCard): CatalogCaption => ({
    title: `${formatDexNumber(card.pokemon_id!)} ${names.get(card.pokemon_id) ?? card.name}`,
    detail: [card.rarity, formatCardNumber(card.local_id, card.set_card_count)]
      .filter(Boolean)
      .join(" · "),
  });

  return (
    <PageLayout>
      {/* hasBack: as a home-screen web app there is no browser back button. */}
      <PageHeader
        headline={data.name ?? "Set"}
        desc={`${data.series} · ${formatReleased(data.released_on)}`}
        icon={<SetSymbol set={data} className={styles.symbol} />}
        hasBack
      />
      <div className={styles.summary}>
        <SetLogo set={data} className={styles.summary_logo} />
        <Flex direction="column" gap="1" minWidth="0">
          <Text size="3" weight="bold">
            {!goal.isCollecting
              ? "Every binder finished"
              : !data.pokemon_count
                ? `No ${goal.labelOr} Pokémon`
                : missing > 0
                  ? `${missing} you still need`
                  : "You have them all"}
          </Text>
          <Text size="2" color="gray">
            {!goal.isCollecting
              ? "Start a new binder to see what you need from it."
              : data.pokemon_count
                ? `Of the ${data.pokemon_count} Pokémon from ${goal.label} in this set.`
                : "Only Pokémon from other regions."}
            {!data.in_boosters && " Not sold in booster packs."}
          </Text>
        </Flex>
      </div>
      {only ? (
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Text size="2" weight="bold">
            {`Only ${names.get(only) ?? "this Pokémon"}'s cards`}
          </Text>
          <Button variant="secondary" onClick={() => setSearchParams({}, { replace: true })}>
            Show the whole set
          </Button>
        </Flex>
      ) : (
        <SearchInput
          value={search}
          onValueChange={setSearch}
          label="Search the set"
          placeholder="Name or number…"
        />
      )}
      {query && !cards.length && <EmptyState message={`Nothing here matches "${search.trim()}".`} />}
      {need.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold" color="gray">
            You need · {pokemonIn(need)}
          </Text>
          <CatalogGrid cards={need} onPick={previewDialog.edit} caption={caption} />
        </Flex>
      )}
      {have.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold" color="gray">
            Already caught · {pokemonIn(have)}
          </Text>
          <CatalogGrid cards={have} onPick={previewDialog.edit} caption={caption} muted />
        </Flex>
      )}
      {others.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold" color="gray">
            Other regions · {pokemonIn(others)}
          </Text>
          <CatalogGrid cards={others} onPick={previewDialog.edit} caption={caption} />
        </Flex>
      )}
      <CatalogCardDialog
        {...previewDialog.props}
        onAdd={(card) => cardDialog.create({ pokemonId: card.pokemon_id!, catalogCard: card })}
      />
      <CardDialog {...cardDialog.props} />
    </PageLayout>
  );
};

export default SetSinglePage;
