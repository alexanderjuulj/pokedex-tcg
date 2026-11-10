import type React from "react";
import { useNavigate, useParams } from "react-router";
import {
  AlertDialog,
  DropdownMenu,
  EmptyState,
  Grid,
  Spinner,
  type DropdownMenuItem,
} from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import { CARD_INVALIDATES } from "@/constants/invalidates";
import {
  useBinders,
  useCard,
  usePurchaseItems,
  usePutInBinder,
  useSetFeaturedCard,
  useTableMutations,
  type Card,
  type OwnedCard,
} from "@/hooks/queries";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { formatCardNumber } from "@/lib/pokemon";
import { toast } from "@/lib/toast";
import { useFormDialog } from "@/hooks/useFormDialog";
import {
  CardDialog,
  CardImage,
  LetGoDialog,
  type CardDialogDefaults,
} from "@/features/cards/components";
import { cardPlace, freePlace, pokemonPlace } from "@/features/binders/layout";
import { CardFacts } from "./components";
import styles from "./CardSingle.module.scss";

const CardSinglePage: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const card = useCard(Number(params.id));
  const cardDialog = useFormDialog<OwnedCard, CardDialogDefaults>();
  const letGoDialog = useFormDialog<Card>();
  const setFeatured = useSetFeaturedCard();
  const binders = useBinders();
  const purchaseItems = usePurchaseItems();
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
  const pulledFrom = purchaseItems.data?.find((item) => item.id === data.purchase_item_id) ?? null;
  const deleteItem = { label: "Delete", onSelect: () => deleteDialog.request(data), danger: true };

  // Sold, given away or traded: out of the collection, so nothing to place or
  // edit, only how it went, and it can come back.
  if (data.gone_on) {
    const menu: DropdownMenuItem[] = [
      { label: "Edit how it went", onSelect: () => letGoDialog.edit(data) },
      {
        label: "Bring it back",
        onSelect: () =>
          update.mutate(
            { id: data.id!, values: { gone_on: null, gone_how: null, gone_to: null, sold_for: null } },
            { onSuccess: () => toast.success(`${data.name} is back in the collection`) },
          ),
      },
      deleteItem,
    ];
    return (
      <PageLayout>
        <PageHeader
          headline={data.name ?? "Card"}
          desc={`${data.set_name ?? "Entered by hand"} · ${formatCardNumber(data.number, data.set_card_count)}`}
          type="card"
          hasBack
          actions={<DropdownMenu items={menu} />}
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
          <CardFacts card={data} place={null} pulledFrom={pulledFrom} />
        </Grid>
        <AlertDialog title="Delete card" {...deleteDialog.props} />
        <LetGoDialog {...letGoDialog.props} />
      </PageLayout>
    );
  }

  // The card in its Pokémon's slot sits in its Pokédex pocket, or is kept
  // outside the binder (a top loader); any other can go in a free binder, or
  // move to another. A graded card goes in none: a slab doesn't fit in a
  // pocket.
  const graded = Boolean(data.grading_company);
  const inSlot = Boolean(data.is_featured && pokemonPlace(data.pokemon_id!, allBinders));
  const takeOut = {
    label: "Take out of the binder",
    onSelect: () =>
      update.mutate({
        id: data.id!,
        values: { binder_id: null, binder_pocket: null, kept_outside: true },
      }),
  };
  const slotItems = !inSlot
    ? []
    : !data.kept_outside
      ? [takeOut]
      : graded
        ? []
        : [
            {
              label: "Put back in its pocket",
              onSelect: () =>
                update.mutate({ id: data.id!, values: { kept_outside: false, location: null } }),
            },
          ];
  const binderItems = inSlot
    ? slotItems
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
        ...(data.binder_id ? [takeOut] : []),
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
              { label: "Sell or give away", onSelect: () => letGoDialog.edit(data) },
              deleteItem,
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
        <CardFacts card={data} place={cardPlace(data, allBinders)} pulledFrom={pulledFrom} />
      </Grid>
      <AlertDialog title="Delete card" {...deleteDialog.props} />
      <CardDialog {...cardDialog.props} />
      <LetGoDialog {...letGoDialog.props} />
    </PageLayout>
  );
};

export default CardSinglePage;
