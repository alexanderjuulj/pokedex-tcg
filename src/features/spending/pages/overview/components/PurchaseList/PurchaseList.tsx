import type React from "react";
import { Fragment } from "react";
import { useNavigate } from "react-router";
import {
  DataList,
  DataListCell,
  DataListRow,
  DataListSection,
  type DataListColumn,
} from "@/components/ui";
import type { Purchase, PurchaseItem } from "@/hooks/queries";
import { useCurrency } from "@/hooks/useCurrency";
import { formatDate } from "@/lib/utils";
import { purchaseSummary } from "@/features/spending/spending";

const COLUMNS: DataListColumn[] = [
  { area: "when", label: "Bought" },
  { area: "what", label: "What" },
  { area: "total", label: "Total" },
];
const GRID_COLUMNS = { initial: "minmax(0, 1fr) auto", md: "minmax(0, 14rem) minmax(0, 1fr) 7rem" };
const GRID_AREAS = { initial: `"what total" "when when"`, md: `"when what total"` };

type PurchaseListProps = {
  // Newest first.
  purchases: Purchase[];
  items: PurchaseItem[];
};

// The purchases by year, newest first, each with what was in it and what it
// cost with the shipping.
const PurchaseList: React.FC<PurchaseListProps> = ({ purchases, items }) => {
  const money = useCurrency();
  const navigate = useNavigate();
  const years = new Map<string, Purchase[]>();
  for (const purchase of purchases) {
    const year = purchase.bought_on!.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), purchase]);
  }

  return (
    <DataList columns={COLUMNS} gridColumns={GRID_COLUMNS} areas={GRID_AREAS}>
      {[...years.entries()].map(([year, list]) => (
        <Fragment key={year}>
          <DataListSection>
            {`${year} · ${money.format(list.reduce((total, purchase) => total + (purchase.total ?? 0), 0))}`}
          </DataListSection>
          {list.map((purchase) => (
            <DataListRow key={purchase.id} onClick={() => navigate(`/spending/${purchase.id}`)}>
              <DataListCell area="when" label="">
                {[formatDate(purchase.bought_on), purchase.shop].filter(Boolean).join(" · ")}
              </DataListCell>
              <DataListCell area="what" label="">
                <strong>{purchaseSummary(items.filter((item) => item.purchase_id === purchase.id))}</strong>
              </DataListCell>
              <DataListCell area="total" label="">
                <strong>{money.format(purchase.total ?? 0)}</strong>
              </DataListCell>
            </DataListRow>
          ))}
        </Fragment>
      ))}
    </DataList>
  );
};

export default PurchaseList;
