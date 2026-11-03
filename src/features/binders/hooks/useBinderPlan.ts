import { useState } from "react";
import type { Region } from "@/features/pokedex/types";
import { planPokedexBinders } from "../plan";

// The binder size picked (for BinderSizeFields) and the Pokédex binders it
// makes of the regions picked. A 9-pocket binder of 40 pages (360 cards) to
// start: Kanto and Johto fill 29 of its pages.
export function useBinderPlan(regions: Region[]) {
  const [pockets, setPockets] = useState("9");
  const [pages, setPages] = useState("40");
  const [ownBinderEach, setOwnBinderEach] = useState(false);
  const pageCount = Number(pages);
  const plan = Number.isInteger(pageCount)
    ? planPokedexBinders(regions, { pocketsPerPage: Number(pockets), pageCount }, ownBinderEach)
    : [];
  return {
    plan,
    fields: {
      pockets,
      onPocketsChange: setPockets,
      pages,
      onPagesChange: setPages,
      ownBinderEach,
      onOwnBinderEachChange: setOwnBinderEach,
    },
  };
}
