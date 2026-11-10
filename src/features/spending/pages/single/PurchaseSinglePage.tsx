import type React from "react";
import { useNavigate, useParams } from "react-router";
import { AlertDialog, DropdownMenu, EmptyState, Flex, Spinner, Tabs, Text } from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import { PURCHASE_INVALIDATES } from "@/constants/invalidates";
import {
  usePurchase,
  usePurchaseCards,
  usePurchaseItems,
  useTableMutations,
  type Purchase,
} from "@/hooks/queries";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useTabParam } from "@/hooks/useTabParam";
import { useCurrency } from "@/hooks/useCurrency";
import { formatDate } from "@/lib/utils";
import { CardGrid } from "@/features/cards/components";
import { PurchaseDialog } from "@/features/spending/components";
import { PULLED_FROM_DAYS } from "@/features/spending/constants";
import { PurchaseFacts, PurchaseItems } from "./components";

const TABS = ["items", "cards"];

const PurchaseSinglePage: React.FC = () => {
  const money = useCurrency();
  const params = useParams();
  const navigate = useNavigate();
  const id = Number(params.id);
  const purchase = usePurchase(id);
  const items = usePurchaseItems();
  const cards = usePurchaseCards(id);
  const purchaseDialog = useFormDialog<Purchase>();
  const [tab, setTab] = useTabParam(TABS);
  const { remove } = useTableMutations("purchases", PURCHASE_INVALIDATES);
  const deleteDialog = useConfirmDelete<Purchase>({
    remove: async (deleted) => {
      await remove.mutateAsync(deleted.id!);
      navigate("/spending", { replace: true });
    },
    description: () =>
      "The purchase and what was in it will be removed. The cards pulled from it stay in the collection.",
  });

  if (purchase.isLoading || items.isLoading || money.isLoading) {
    return (
      <PageLayout>
        <Spinner />
      </PageLayout>
    );
  }

  if (purchase.error || !purchase.data) {
    return (
      <PageLayout>
        <EmptyState message="Purchase not found." />
      </PageLayout>
    );
  }

  const data = purchase.data;
  const lines = (items.data ?? []).filter((item) => item.purchase_id === id);
  const pulled = cards.data ?? [];
  const slots = data.slot_count ?? 0;

  return (
    <PageLayout>
      {/* hasBack: as a home-screen web app there is no browser back button. */}
      <PageHeader
        headline={data.shop ?? "Purchase"}
        desc={`${formatDate(data.bought_on)} · ${money.format(data.total ?? 0)}`}
        type="purchase"
        hasBack
        onEdit={() => purchaseDialog.edit(data)}
        actions={
          <DropdownMenu
            items={[{ label: "Delete", onSelect: () => deleteDialog.request(data), danger: true }]}
          />
        }
      />
      <PurchaseFacts purchase={data} items={lines} />
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: "items",
            label: "What was in it",
            count: lines.length,
            content: <PurchaseItems items={lines} />,
          },
          {
            value: "cards",
            label: "Cards pulled",
            count: pulled.length,
            content: cards.isLoading ? (
              <Spinner />
            ) : (
              <Flex direction="column" gap="4">
                {pulled.length > 0 && (
                  <Text size="2">
                    {slots
                      ? `${slots} of them ${slots === 1 ? "is" : "are"} in the Pokédex: ${money.format(Math.round((data.total ?? 0) / slots))} a Pokémon.`
                      : "None of them is in the Pokédex."}
                  </Text>
                )}
                {pulled.length > 0 ? (
                  <CardGrid cards={pulled} showPokemon showFeatured />
                ) : (
                  <EmptyState message="No cards say they were pulled from this yet." />
                )}
                <Text size="2" color="gray">
                  {`A card says where it was pulled from in its form. Added within ${PULLED_FROM_DAYS} days of buying, a card of a set starts at the newest purchase of that set: open the set from a line above and add what came out of the packs.`}
                </Text>
              </Flex>
            ),
          },
        ]}
      />
      <AlertDialog title="Delete purchase" {...deleteDialog.props} />
      <PurchaseDialog {...purchaseDialog.props} />
    </PageLayout>
  );
};

export default PurchaseSinglePage;
