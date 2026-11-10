import { useSearchParams } from "react-router";

// The packs on offer, in the link so the list survives a refresh or a look
// at a set: ?packs=sv03.5:650,swsh10.5 (TCGdex ids, each with its price per
// pack in hundredths when there is one), and ?budget=3000. Replaced, not
// pushed, like the tabs: Back leaves the page.

export type PackEntry = { tcgdexId: string; price: number | null };

const parseAmount = (text: string | null | undefined) => {
  const value = Number(text);
  return text && Number.isInteger(value) && value >= 0 ? value : null;
};

export function usePackList() {
  const [params, setParams] = useSearchParams();
  const entries: PackEntry[] = (params.get("packs") ?? "")
    .split(",")
    .filter(Boolean)
    .map((part) => {
      const [tcgdexId, price] = part.split(":");
      return { tcgdexId, price: parseAmount(price) };
    });
  const budget = parseAmount(params.get("budget"));

  const write = (change: (next: URLSearchParams) => void) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        change(next);
        return next;
      },
      { replace: true },
    );
  const writeEntries = (next: PackEntry[]) =>
    write((search) => {
      const text = next
        .map((entry) => (entry.price === null ? entry.tcgdexId : `${entry.tcgdexId}:${entry.price}`))
        .join(",");
      if (text) search.set("packs", text);
      else search.delete("packs");
    });

  return {
    entries,
    budget,
    add: (tcgdexId: string, price: number | null) =>
      entries.some((entry) => entry.tcgdexId === tcgdexId)
        ? undefined
        : writeEntries([...entries, { tcgdexId, price }]),
    remove: (tcgdexId: string) => writeEntries(entries.filter((entry) => entry.tcgdexId !== tcgdexId)),
    setPrice: (tcgdexId: string, price: number | null) =>
      writeEntries(entries.map((entry) => (entry.tcgdexId === tcgdexId ? { ...entry, price } : entry))),
    setBudget: (amount: number | null) =>
      write((search) => {
        if (amount === null) search.delete("budget");
        else search.set("budget", String(amount));
      }),
  };
}
