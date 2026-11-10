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
  { area: "cost", label: "Spent" },
];
const GRID_COLUMNS = { initial: "minmax(0, 1fr) auto", md: "minmax(0, 1fr) 5rem 7rem 7rem" };
const GRID_AREAS = { initial: `"set cost" "packs per_pack"`, md: `"set packs per_pack cost"` };

type SetSpendingProps = {
  items: PurchaseItem[];
};

// What each set has cost, the most first, with the shipping. A set opens on
// its cards, to log what came out of the packs.
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
          <DataListCell area="cost" label="">
            <strong>{money.format(set.cost)}</strong>
          </DataListCell>
        </DataListRow>
      ))}
    </DataList>
  );
};

export default SetSpending;
