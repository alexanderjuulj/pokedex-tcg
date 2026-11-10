import type React from "react";
import { Text } from "@/components/ui";
import type { CardSet } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { formatList } from "@/lib/utils";
import type { PackValue } from "@/features/sets/odds";
import { planBudget, type Offer } from "@/features/packs/budget";
import { formatAbout } from "@/features/packs/format";
import styles from "./PackAnswer.module.scss";

type PackAnswerProps = {
  // The first of the ranked packs, and what decided it.
  best: { set: CardSet; value: PackValue; perPokemon: number | null };
  // The packs with a price, for a budget.
  offers: Offer[];
  // By TCGdex id, for the plan's names.
  sets: Map<string, CardSet>;
  unpriced: CardSet[];
  // In hundredths.
  budget: number | null;
};

// The answer first: with a budget, what to buy (budget.ts); without one, the
// best pick.
const PackAnswer: React.FC<PackAnswerProps> = ({ best, offers, sets, unpriced, budget }) => {
  const money = useCurrency();
  const plan = budget !== null && offers.length ? planBudget(offers, budget) : null;
  const leftOut =
    plan && unpriced.length
      ? `Without a price, left out: ${formatList(unpriced.map((set) => set.name!))}.`
      : null;

  if (plan && plan.packs.length) {
    const left = budget! - plan.spent;
    return (
      <div className={styles.answer}>
        <span className={styles.answer_title}>
          {`Buy ${formatList(plan.packs.map((entry) => `${entry.count} × ${sets.get(entry.key)?.name}`))}`}
        </span>
        <Text size="2">
          {`≈ ${formatAbout(plan.expected)} Pokémon you need for ${money.format(plan.spent)}, ${money.format(Math.round(plan.spent / plan.expected))} each`}
          {left > 0 ? `, ${money.format(left)} left` : ""}
        </Text>
        {leftOut && (
          <Text size="1" color="gray">
            {leftOut}
          </Text>
        )}
      </div>
    );
  }

  if (plan) {
    return (
      <div className={styles.answer}>
        <span className={styles.answer_title}>{`Nothing for ${money.format(budget!)}`}</span>
        <Text size="2">The budget doesn&apos;t reach a pack worth buying.</Text>
      </div>
    );
  }

  return (
    <div className={styles.answer}>
      <span className={styles.answer_title}>{`Best pick: ${best.set.name}`}</span>
      <Text size="2">
        {best.perPokemon !== null
          ? `${money.format(best.perPokemon)} per Pokémon you need, ≈ ${formatAbout(best.value.expected)} a pack`
          : `≈ ${formatAbout(best.value.expected)} Pokémon you need a pack`}
      </Text>
      {(best.perPokemon === null || budget !== null) && (
        <Text size="1" color="gray">
          {budget !== null
            ? "Add the prices to plan the budget."
            : "Add the prices to compare what each Pokémon costs."}
        </Text>
      )}
    </div>
  );
};

export default PackAnswer;
