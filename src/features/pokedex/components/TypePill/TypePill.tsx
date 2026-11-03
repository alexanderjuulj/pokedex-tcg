import type React from "react";
import { cn } from "@/lib/utils";
import { TYPE_LABELS } from "../../constants";
import type { PokemonType } from "../../types";
import styles from "./TypePill.module.scss";

type TypePillProps = {
  type: PokemonType;
  // onColor: see-through, on a type-colored surface. solid: its own type
  // color, on white. muted: on the gray of a Pokémon not caught yet.
  variant?: "onColor" | "solid" | "muted";
};

const TypePill: React.FC<TypePillProps> = ({ type, variant = "solid" }) => (
  <span
    className={cn(styles.pill, styles[`pill__${variant}`])}
    data-type={variant === "solid" ? type : undefined}
  >
    {TYPE_LABELS[type]}
  </span>
);

export default TypePill;
