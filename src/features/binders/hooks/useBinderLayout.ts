import { useMemo } from "react";
import { useBinders, usePokedex } from "@/hooks/queries";
import { binderLayout } from "../layout";

// The binders' pages and pockets (layout.ts), from the binders and the
// Pokédex: a type or class binder's pockets depend on its Pokémon's types
// and classes.
export function useBinderLayout() {
  const binders = useBinders();
  const pokedex = usePokedex();
  const layout = useMemo(
    () => binderLayout(binders.data ?? [], pokedex.data ?? []),
    [binders.data, pokedex.data],
  );
  return { ...layout, isLoading: binders.isLoading || pokedex.isLoading };
}
