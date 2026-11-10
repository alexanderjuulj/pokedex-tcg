import type React from "react";
import { useState } from "react";
import { DropdownMenu, EmptyState, Spinner, Tabs } from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import { CURRENCIES } from "@/constants/currencies";
import { useGoneCards, usePurchaseItems, usePurchases, type Purchase } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useTabParam } from "@/hooks/useTabParam";
import { CurrencyDialog, PurchaseDialog } from "@/features/spending/components";
import { spendingBySet } from "@/features/spending/spending";
import { PurchaseList, SetSpending, SpendingStats } from "./components";

const TABS = ["purchases", "sets"];

const SpendingOverviewPage: React.FC = () => {
  const purchases = usePurchases();
  const items = usePurchaseItems();
  // The cards sold: what they brought back.
  const gone = useGoneCards();
  const money = useCurrency();
  const purchaseDialog = useFormDialog<Purchase>();
  const [choosingCurrency, setChoosingCurrency] = useState(false);
  const [tab, setTab] = useTabParam(TABS);

  const isLoading = purchases.isLoading || items.isLoading || money.isLoading || gone.isLoading;
  const error = purchases.error ?? items.error ?? gone.error;
  const list = purchases.data ?? [];
  const lines = items.data ?? [];

  return (
    <PageLayout>
      <PageHeader
        headline="Spending"
        desc="What the packs and boxes have cost, with the shipping"
        type="purchase"
        onAdd={() => purchaseDialog.create()}
        actions={
          <DropdownMenu
            items={[
              {
                label: `Currency: ${CURRENCIES[money.code]?.label ?? money.code}`,
                onSelect: () => setChoosingCurrency(true),
              },
            ]}
          />
        }
      />
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <EmptyState message={`Failed to load: ${error.message}`} />
      ) : list.length ? (
        <>
          <SpendingStats
            purchases={list}
            items={lines}
            sold={(gone.data ?? []).filter((card) => card.gone_how === "sold")}
          />
          <Tabs
            value={tab}
            onValueChange={setTab}
            items={[
              {
                value: "purchases",
                label: "Purchases",
                count: list.length,
                content: <PurchaseList purchases={list} items={lines} />,
              },
              {
                value: "sets",
                label: "By set",
                count: spendingBySet(lines).length,
                content: <SetSpending items={lines} />,
              },
            ]}
          />
        </>
      ) : (
        <EmptyState message="No purchases yet. Add the packs and boxes you buy, with what they cost and the shipping, to see what the collection has cost." />
      )}
      <PurchaseDialog {...purchaseDialog.props} />
      <CurrencyDialog open={choosingCurrency} onOpenChange={setChoosingCurrency} />
    </PageLayout>
  );
};

export default SpendingOverviewPage;
