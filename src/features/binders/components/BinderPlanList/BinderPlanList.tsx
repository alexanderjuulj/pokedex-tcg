import type React from "react";
import { BookOpen } from "lucide-react";
import { Flex, Text } from "@/components/ui";
import { formatDexNumber } from "@/lib/pokemon";
import type { PlannedBinder } from "../../plan";
import styles from "./BinderPlanList.module.scss";

type BinderPlanListProps = {
  plan: PlannedBinder[];
};

// The binders a setup will make, and how full each one gets.
const BinderPlanList: React.FC<BinderPlanListProps> = ({ plan }) => {
  if (!plan.length) return null;
  return (
    <Flex direction="column" gap="2">
      <Text size="2" weight="bold">
        {plan.length === 1
          ? "It all fits in one binder:"
          : `That makes ${plan.length} binders of this size:`}
      </Text>
      <ul className={styles.list}>
        {plan.map((binder) => (
          <li key={binder.first_pokemon_id} className={styles.binder}>
            <BookOpen size={20} aria-hidden className={styles.binder_icon} />
            <span className={styles.binder_name}>{binder.name}</span>
            <span className={styles.binder_detail}>
              {`${formatDexNumber(binder.first_pokemon_id)}–${formatDexNumber(binder.last_pokemon_id)} · ` +
                `${binder.pages_used} of ${binder.page_count} pages`}
            </span>
          </li>
        ))}
      </ul>
    </Flex>
  );
};

export default BinderPlanList;
