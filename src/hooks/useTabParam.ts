import { useSearchParams } from "react-router";

// Active tab backed by a ?tab= URL param, so the tab survives refreshes and
// create/edit round-trips. The default tab keeps a clean URL (no param), and
// an unknown param value falls back to the default. `param` names the URL
// param, for pages with more than one set of tabs; other params are kept.
export function useTabParam(tabs: string[], defaultTab = tabs[0], param = "tab") {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(param);
  const tab = value !== null && tabs.includes(value) ? value : defaultTab;

  const setTab = (next: string) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === defaultTab) params.delete(param);
        else params.set(param, next);
        return params;
      },
      { replace: true },
    );

  return [tab, setTab] as const;
}
