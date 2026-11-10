import type React from "react";
import { useNavigate } from "react-router";
import { DataList, DataListCell, DataListRow, type DataListColumn } from "@/components/ui";
import type { PurchaseItem } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { spendingBySet } from "@/features/spending/spending";

const COLUMNS: DataListColumn[] = [
  { area: "set", label: "Set" },
  { area: "packs", label: "Packs" },
  { area: "per_pack", label: "Per pack" },
  { area: "per_needed", label: "Per Pokémon you need" },
  { area: "cost", label: "Spent" },
];
const GRID_COLUMNS = {
  initial: "minmax(0, 1fr) auto",
  md: "minmax(0, 1fr) 4.5rem 6.5rem 11rem 7rem",
};
const GRID_AREAS = {
  initial: `"set cost" "packs per_pack" "per_needed per_needed"`,
  md: `"set packs per_pack per_needed cost"`,
};

type SetSpendingProps = {
  items: PurchaseItem[];
};

// What each set has cost, the most first, with the shipping, and what each
// Pokémon you need that its packs gave cost: which packs pay off. A set opens
// on its cards, to log what came out of the packs.
const SetSpending: React.FC<SetSpendingProps> = ({ items }) => {
  const money = useCurrency();
  const navigate = useNavigate();
  return (
    <DataList columns={COLUMNS} gridColumns={GRID_COLUMNS} areas={GRID_AREAS}>
      {spendingBySet(items).map((set) => (
        <DataListRow
          key={set.cardSetId ?? "none"}
          onClick={set.cardSetId === null ? undefined : () => navigate(`/sets/${set.cardSetId}`)}
        >
          <DataListCell area="set" label="">
            <strong>{set.name}</strong>
          </DataListCell>
          <DataListCell area="packs">{set.packs}</DataListCell>
          <DataListCell area="per_pack">{set.perPack === null ? "—" : money.format(set.perPack)}</DataListCell>
          <DataListCell area="per_needed">
            {set.perGoalPokemon !== null
              ? `${money.format(set.perGoalPokemon)} for ${set.goalPokemon}`
              : set.cards
                ? "None yet"
                : "—"}
          </DataListCell>
          <DataListCell area="cost" label="">
            <strong>{money.format(set.cost)}</strong>
          </DataListCell>
        </DataListRow>
      ))}
    </DataList>
  );
};

export default SetSpending;
