import type React from "react";
import { useNavigate, useParams } from "react-router";
import { AlertDialog, DropdownMenu, EmptyState, Grid, Spinner } from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import { CARD_INVALIDATES } from "@/constants/invalidates";
import {
  useBinders,
  useOwnedCard,
  usePutInBinder,
  useSetFeaturedCard,
  useTableMutations,
  type OwnedCard,
} from "@/hooks/queries";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { formatCardNumber } from "@/lib/pokemon";
import { toast } from "@/lib/toast";
import { useFormDialog } from "@/hooks/useFormDialog";
import { CardDialog, CardImage, type CardDialogDefaults } from "@/features/cards/components";
import { cardPlace, freePlace, pokemonPlace } from "@/features/binders/layout";
import { CardFacts } from "./components";
import styles from "./CardSingle.module.scss";

const CardSinglePage: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const card = useOwnedCard(Number(params.id));
  const cardDialog = useFormDialog<OwnedCard, CardDialogDefaults>();
  const setFeatured = useSetFeaturedCard();
  const binders = useBinders();
  const putInBinder = usePutInBinder();
  const { remove, update } = useTableMutations("cards", CARD_INVALIDATES);
  const deleteDialog = useConfirmDelete<OwnedCard>({
    remove: async (deleted) => {
      await remove.mutateAsync(deleted.id!);
      navigate(`/pokedex/${deleted.pokemon_id}`, { replace: true });
    },
    description: (deleted) => `"${deleted.name}" will be removed from the collection.`,
  });

  if (card.isLoading) {
    return (
      <PageLayout>
        <Spinner />
      </PageLayout>
    );
  }

  if (card.error || !card.data) {
    return (
      <PageLayout>
        <EmptyState message="Card not found." />
      </PageLayout>
    );
  }

  const data = card.data;
  const allBinders = binders.data ?? [];
  // The card in its Pokémon's slot stays in its Pokédex binder; any other can
  // go in a free binder, or move to another. A graded card goes in none: a
  // slab doesn't fit in a pocket.
  const graded = Boolean(data.grading_company);
  const inSlot = Boolean(data.is_featured && pokemonPlace(data.pokemon_id!, allBinders));
  const binderItems = inSlot
    ? []
    : [
        ...allBinders
          .filter((binder) => binder.kind === "free" && binder.id !== data.binder_id && !graded)
          .map((binder) => ({
            label: `Put in ${binder.name}`,
            onSelect: () =>
              putInBinder.mutate(
                { card_id: data.id!, binder_id: binder.id! },
                {
                  onSuccess: ({ binder_pocket }) => {
                    const place = freePlace(binder, binder_pocket);
                    toast.success(`In ${binder.name}: page ${place.page}, pocket ${place.pocket}`);
                  },
                },
              ),
          })),
        ...(data.binder_id
          ? [
              {
                label: "Take out of the binder",
                onSelect: () =>
                  update.mutate({ id: data.id!, values: { binder_id: null, binder_pocket: null } }),
              },
            ]
          : []),
      ];
  return (
    <PageLayout>
      {/* hasBack: as a home-screen web app there is no browser back button. */}
      <PageHeader
        headline={data.name ?? "Card"}
        desc={`${data.set_name ?? "Entered by hand"} · ${formatCardNumber(data.number, data.set_card_count)}`}
        type="card"
        hasBack
        onEdit={() => cardDialog.edit(data)}
        actions={
          <DropdownMenu
            items={[
              ...(data.is_featured || graded
                ? []
                : [{ label: "Put in the Pokédex slot", onSelect: () => setFeatured.mutate(data.id!) }]),
              ...binderItems,
              { label: "Delete", onSelect: () => deleteDialog.request(data), danger: true },
            ]}
          />
        }
      />
      <Grid columns={{ initial: "1", sm: "minmax(0, 20rem) minmax(0, 1fr)" }} gap="5" align="start">
        <div className={styles.single_image}>
          <CardImage
            catalogCardId={data.catalog_card_id}
            hasImage={data.has_image}
            size="high"
            alt={data.name ?? ""}
          />
        </div>
        <CardFacts card={data} place={cardPlace(data, allBinders)} />
      </Grid>
      <AlertDialog title="Delete card" {...deleteDialog.props} />
      <CardDialog {...cardDialog.props} />
    </PageLayout>
  );
};

export default CardSinglePage;
