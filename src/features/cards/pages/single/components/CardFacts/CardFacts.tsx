import type React from "react";
import { Link } from "react-router";
import { Badge, Flex, Text } from "@/components/ui";
import type { OwnedCard } from "@/hooks/queries";
import { formatCardNumber } from "@/lib/pokemon";
import { formatDate } from "@/lib/utils";
import { BinderPlaceLink } from "@/features/binders/components";
import type { BinderPlace } from "@/features/binders/layout";
import { CONDITION_LABELS, FINISH_LABELS, LANGUAGE_LABELS } from "@/features/cards/constants";
import { gradeLabel } from "@/features/cards/grading";
import type { CardCondition, CardFinish, CardLanguage } from "@/features/cards/types";
import styles from "../../CardSingle.module.scss";

type CardFactsProps = {
  card: OwnedCard;
  // Its pocket in a binder, if it's in one.
  place: BinderPlace | null;
};

const CardFacts: React.FC<CardFactsProps> = ({ card, place }) => {
  const version = [
    FINISH_LABELS[card.finish as CardFinish],
    card.first_edition && "1st edition",
  ]
    .filter(Boolean)
    .join(", ");
  const facts: [string, React.ReactNode][] = [
    ["Pokémon", <Link to={`/pokedex/${card.pokemon_id}`}>{card.pokemon_name}</Link>],
    ["Set", card.set_name ?? "—"],
    ["Number", formatCardNumber(card.number, card.set_card_count)],
    ["Released", card.released_on ? card.released_on.slice(0, 4) : "—"],
    ["Rarity", card.rarity ?? "—"],
    ["Illustrator", card.illustrator ?? "—"],
    ["Version", version],
    ["Condition", CONDITION_LABELS[card.condition as CardCondition]],
    ["Language", LANGUAGE_LABELS[card.language as CardLanguage]],
    ["Grade", gradeLabel(card) ?? "Not graded"],
    ["Got it", card.acquired_on ? formatDate(card.acquired_on) : "—"],
    ["Kept in", place ? <BinderPlaceLink place={place} /> : (card.location ?? "—")],
    ["Added", formatDate(card.created_at!.slice(0, 10))],
  ];

  return (
    <Flex direction="column" gap="3" minWidth="0">
      {card.is_featured && (
        <Flex>
          {/* A slab isn't in the pocket, but it still counts. */}
          <Badge variant="primary">
            {card.grading_company
              ? `${card.pokemon_name}'s card in the Pokédex`
              : `In ${card.pokemon_name}'s Pokédex slot`}
          </Badge>
        </Flex>
      )}
      <div className={styles.single_facts}>
        {facts.map(([label, value]) => (
          <div key={label}>
            <span className={styles.single_label}>{label}</span>
            {value}
          </div>
        ))}
      </div>
      {card.notes && (
        <Flex direction="column" gap="2">
          <Text size="2" weight="bold">
            Its story
          </Text>
          <p className={styles.single_story}>{card.notes}</p>
        </Flex>
      )}
    </Flex>
  );
};

export default CardFacts;
