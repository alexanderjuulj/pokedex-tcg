import type React from "react";
import { Flex, StatCard, StatCardGrid, Text } from "@/components/ui";
import type { Card, Purchase, PurchaseItem } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { useGoal } from "@/features/pokedex/hooks";
import { spendingTotals } from "@/features/spending/spending";

type SpendingStatsProps = {
  purchases: Purchase[];
  items: PurchaseItem[];
  // The cards sold, which bring some of it back.
  sold: Card[];
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Values are strings: StatCard shows a bare 0 as still loading.
const SpendingStats: React.FC<SpendingStatsProps> = ({ purchases, items, sold }) => {
  const money = useCurrency();
  const goal = useGoal();
  const totals = spendingTotals(purchases, items);
  const amount = (value: number | null) => (value === null ? "—" : money.format(value));
  const each = (value: number | null) => (value === null ? "—" : `${money.format(value)} each`);
  const soldFor = sold.reduce((total, card) => total + (card.sold_for ?? 0), 0);

  return (
    <Flex direction="column" gap="1">
      <StatCardGrid columns={{ initial: "2", md: "3" }}>
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
          value={amount(totals.perPack)}
          hint={`${plural(totals.packs, "pack", "packs")}, with shipping`}
        />
        <StatCard
          label="Cards pulled"
          value={String(totals.cards)}
          hint={`${totals.cards - totals.newPokemon} for Pokémon you had`}
        />
        {/* What the Pokémon the cards put in the Pokédex cost: any new one,
            and the ones you need (the goal's, which go in the binder). */}
        <StatCard
          label="New Pokémon"
          value={each(totals.perNewPokemon)}
          hint={`${totals.newPokemon} from any region`}
        />
        <StatCard
          label="Pokémon you need"
          value={each(totals.perGoalPokemon)}
          hint={`${totals.goalPokemon} for ${goal.binderLabel}`}
        />
      </StatCardGrid>
      {soldFor > 0 && (
        <Text size="2" color="gray">
          {`${plural(sold.length, "card", "cards")} sold for ${money.format(soldFor)}: less that, the collection has cost ${money.format(totals.total - soldFor)}.`}
        </Text>
      )}
      {totals.unopened > 0 && (
        <Text size="2" color="gray">
          {`The ${money.format(totals.unopened)} of packs with no cards logged yet isn't in the cost per Pokémon.`}
        </Text>
      )}
    </Flex>
  );
};

export default SpendingStats;
