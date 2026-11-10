import type React from "react";
import { useParams } from "react-router";
import { Button, EmptyState, Flex, Spinner, Tabs, Text } from "@/components/ui";
import { PageLayout } from "@/components/layout";
import {
  usePokedex,
  usePokemon,
  usePokemonCards,
  type CatalogCard,
  type OwnedCard,
} from "@/hooks/queries";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useTabParam } from "@/hooks/useTabParam";
import {
  CardDialog,
  CardGrid,
  CatalogCardDialog,
  type CardDialogDefaults,
} from "@/features/cards/components";
import { BinderPlaceLink } from "@/features/binders/components";
import { useBinderLayout } from "@/features/binders/hooks";
import { CatalogTab, PokemonAbout, PokemonHero, PokemonSets } from "./components";
import styles from "./PokemonSingle.module.scss";

const TABS = ["cards", "all", "sets", "about"];

const PokemonSinglePage: React.FC = () => {
  const params = useParams();
  const id = Number(params.id);
  const pokemon = usePokemon(id);
  const pokedex = usePokedex();
  const cards = usePokemonCards(id);
  const layout = useBinderLayout();
  const cardDialog = useFormDialog<OwnedCard, CardDialogDefaults>();
  // A catalogue card up close before it's added; `edit` opens it on a card.
  const previewDialog = useFormDialog<CatalogCard>();
  // Straight to the catalogue while there's nothing of ours to show.
  const [tab, setTab] = useTabParam(TABS, (pokemon.data?.card_count ?? 0) > 0 ? "cards" : "all");

  if (pokemon.isLoading) {
    return (
      <PageLayout>
        <Spinner />
      </PageLayout>
    );
  }

  if (pokemon.error || !pokemon.data) {
    return (
      <PageLayout>
        <EmptyState message="That Pokémon isn't in the Pokédex." />
      </PageLayout>
    );
  }

  const data = pokemon.data;
  const owned = cards.data ?? [];
  // Its pocket in each Pokédex binder keeping one (the ones being collected
  // first), and whether a card is in it.
  const pockets = layout.bindersFor(id).map((binder) => ({
    place: layout.place(binder, id)!,
    filled: owned.some((card) => card.binder_id === binder.id && !card.kept_outside),
  }));

  return (
    // Not PageLayout: the hero and the sheet meet without a gap.
    <Flex direction="column" minHeight="100%">
      <PokemonHero pokemon={data} />
      <div className={styles.sheet}>
        <Tabs
          value={tab}
          onValueChange={setTab}
          items={[
            {
              value: "cards",
              label: "Your cards",
              count: data.card_count ?? 0,
              content: (
                <Flex direction="column" gap="4">
                  {/* Where its card sits, or will. */}
                  {pockets.map((pocket) => (
                    <Text key={pocket.place.binder.id} size="2" color="gray">
                      {pocket.filled ? "In the binder: " : "Its pocket: "}
                      <BinderPlaceLink place={pocket.place} />
                    </Text>
                  ))}
                  {cards.isLoading ? (
                    <Spinner />
                  ) : owned.length ? (
                    <CardGrid cards={owned} showFeatured />
                  ) : (
                    <Flex direction="column" gap="3" align="start">
                      <EmptyState message={`No ${data.name} card in the collection yet.`} />
                      <Button onClick={() => setTab("all")}>Pick one from all cards</Button>
                    </Flex>
                  )}
                </Flex>
              ),
            },
            {
              value: "all",
              label: "All cards",
              content: (
                <CatalogTab
                  pokemonId={id}
                  onPick={previewDialog.edit}
                  onAddByHand={() => cardDialog.create({ pokemonId: id, catalogCard: null })}
                />
              ),
            },
            {
              value: "sets",
              label: "Sets",
              content: <PokemonSets pokemonId={id} pokemonName={data.name ?? ""} />,
            },
            {
              value: "about",
              label: "About",
              content: <PokemonAbout pokemon={data} pokedex={pokedex.data ?? []} />,
            },
          ]}
        />
      </div>
      <CatalogCardDialog
        {...previewDialog.props}
        onAdd={(catalogCard) => cardDialog.create({ pokemonId: id, catalogCard })}
      />
      <CardDialog {...cardDialog.props} />
    </Flex>
  );
};

export default PokemonSinglePage;
