import type { OwnedCard } from "@/hooks/queries";
import { GRADING_LABELS } from "./constants";
import type { GradingCompany } from "./types";

// "PSA 10", or null for a card that isn't graded.
export const gradeLabel = (card: Pick<OwnedCard, "grading_company" | "grade">) =>
  card.grading_company
    ? `${GRADING_LABELS[card.grading_company as GradingCompany]} ${card.grade}`
    : null;
