import type React from "react";
import { StatCard, StatCardGrid } from "@/components/ui";
import type { Purchase, PurchaseItem } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { spendingTotals } from "@/features/spending/spending";

type SpendingStatsProps = {
  purchases: Purchase[];
  items: PurchaseItem[];
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Values are strings: StatCard shows a bare 0 as still loading.
const SpendingStats: React.FC<SpendingStatsProps> = ({ purchases, items }) => {
  const money = useCurrency();
  const totals = spendingTotals(purchases, items);
  return (
    <StatCardGrid>
      <StatCard
        label="Spent in all"
        value={money.format(totals.total)}
        hint={
          totals.shipping > 0
            ? `${money.format(totals.shipping)} of it shipping`
            : plural(purchases.length, "purchase", "purchases")
        }
      />
      <StatCard
        label="This year"
        value={money.format(totals.thisYear)}
        hint={plural(totals.thisYearCount, "purchase", "purchases")}
      />
      <StatCard
        label="Per pack"
        value={totals.perPack === null ? "—" : money.format(totals.perPack)}
        hint={`${plural(totals.packs, "pack", "packs")}, with shipping`}
      />
      <StatCard
        label="Cards pulled"
        value={String(totals.cards)}
        hint={`${totals.slots} in the Pokédex`}
      />
    </StatCardGrid>
  );
};

export default SpendingStats;
