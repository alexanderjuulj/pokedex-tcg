import type React from "react";
import { Link } from "react-router";
import { BookOpen } from "lucide-react";
import type { Binder } from "@/hooks/queries";
import { formatDexNumber } from "@/lib/pokemon";
import { BINDER_KIND_LABELS } from "@/features/binders/constants";
import { pagesLabel } from "@/features/binders/layout";
import type { BinderKind } from "@/features/binders/types";
import styles from "./BinderGrid.module.scss";

type BinderGridProps = {
  binders: Binder[];
};

const BinderGrid: React.FC<BinderGridProps> = ({ binders }) => (
  <div className={styles.grid}>
    {binders.map((binder) => {
      const kind = binder.kind as BinderKind;
      const detail =
        kind === "pokedex"
          ? `${formatDexNumber(binder.first_pokemon_id!)}–${formatDexNumber(binder.last_pokemon_id!)} · ` +
            `${binder.card_count} of ${binder.last_pokemon_id! - binder.first_pokemon_id! + 1} cards · ` +
            pagesLabel(binder)
          : `${binder.card_count} ${binder.card_count === 1 ? "card" : "cards"}`;
      return (
        <Link key={binder.id} to={`/binders/${binder.id}`} className={styles.binder}>
          <BookOpen size={22} aria-hidden className={styles.binder_icon} />
          <span className={styles.binder_name}>{binder.name}</span>
          <span className={styles.binder_kind}>{BINDER_KIND_LABELS[kind]}</span>
          <span className={styles.binder_detail}>{detail}</span>
        </Link>
      );
    })}
  </div>
);

export default BinderGrid;
