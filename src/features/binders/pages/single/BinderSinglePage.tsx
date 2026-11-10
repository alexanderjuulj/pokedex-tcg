import type React from "react";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { AlertDialog, Button, DropdownMenu, EmptyState, Flex, Spinner } from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import { BINDER_INVALIDATES } from "@/constants/invalidates";
import {
  useBinder,
  useBinders,
  useOwnedCards,
  usePokedex,
  useTableMutations,
  type Binder,
  type OwnedCard,
} from "@/hooks/queries";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { useFormDialog } from "@/hooks/useFormDialog";
import { useTabParam } from "@/hooks/useTabParam";
import { toast } from "@/lib/toast";
import { formatDate, todayIso } from "@/lib/utils";
import { BinderDialog } from "@/features/binders/components";
import { BINDER_KIND_LABELS } from "@/features/binders/constants";
import { useBinderLayout } from "@/features/binders/hooks";
import type { BinderLayout } from "@/features/binders/layout";
import { binderRule } from "@/features/binders/rule";
import type { BinderKind } from "@/features/binders/types";
import { BinderPages, type Pocket } from "./components";

// A Pokédex binder: each Pokémon's pocket holds the card put in it (unless
// it's kept outside the binder, in a top loader or a slab).
function pokedexPockets(
  binder: Binder,
  layout: BinderLayout,
  cards: OwnedCard[],
  names: Map<number, string>,
) {
  const slots = new Map(
    cards.filter((card) => card.binder_id === binder.id).map((card) => [card.pokemon_id, card]),
  );
  return layout.pages(binder).map((page) =>
    page.map((pokemonId): Pocket => {
      if (pokemonId === null) return { kind: "unused" };
      const card = slots.get(pokemonId);
      if (!card) return { kind: "pokemon", pokemonId, name: names.get(pokemonId) ?? "" };
      return card.kept_outside ? { kind: "outside", card } : { kind: "card", card };
    }),
  );
}

// A free binder: its cards by pocket, and the first empty one marked for the
// next card. Pages run to the last card or that pocket.
function freePockets(binder: Binder, cards: OwnedCard[]) {
  const perPage = binder.pockets_per_page!;
  const byPocket = new Map(
    cards.filter((card) => card.binder_id === binder.id).map((card) => [card.binder_pocket!, card]),
  );
  let next = 1;
  while (byPocket.has(next)) next++;
  const pageCount = Math.ceil(Math.max(next, ...byPocket.keys()) / perPage);
  return Array.from({ length: pageCount }, (_, page) =>
    Array.from({ length: perPage }, (_, index): Pocket => {
      const pocket = page * perPage + index + 1;
      const card = byPocket.get(pocket);
      if (card) return { kind: "card", card };
      return pocket === next ? { kind: "next" } : { kind: "empty" };
    }),
  );
}

const BinderSinglePage: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const id = Number(params.id);
  const binder = useBinder(id);
  const cards = useOwnedCards();
  const pokedex = usePokedex();
  const layout = useBinderLayout();
  const binderDialog = useFormDialog<Binder>();
  const { remove, update } = useTableMutations("binders", BINDER_INVALIDATES, { silent: true });
  const binders = useBinders();
  const [finishing, setFinishing] = useState(false);
  const deleteDialog = useConfirmDelete<Binder>({
    remove: async (deleted) => {
      await remove.mutateAsync(deleted.id!);
      navigate("/binders", { replace: true });
    },
    description: (deleted) =>
      deleted.kind === "pokedex"
        ? `"${deleted.name}" goes, and its Pokémon stop counting toward the Pokédex. Their cards stay in the collection.`
        : `"${deleted.name}" goes; its cards stay in the collection, just not in a binder.`,
  });

  const data = binder.data;
  const names = new Map((pokedex.data ?? []).map((pokemon) => [pokemon.id!, pokemon.name ?? ""]));
  const pages: Pocket[][] = !data
    ? []
    : data.kind === "pokedex"
      ? pokedexPockets(data, layout, cards.data ?? [], names)
      : freePockets(data, cards.data ?? []);
  // ?page= keeps the place (and comes from a card's "page 3, pocket 7").
  const [pageParam, setPageParam] = useTabParam(
    pages.length ? pages.map((_, index) => String(index + 1)) : ["1"],
    "1",
    "page",
  );
  // The pocket a card's link points out, on the page it opened on.
  const [searchParams] = useSearchParams();
  const [highlight] = useState(() => {
    const pocket = Number(searchParams.get("pocket"));
    return pocket ? { page: Number(searchParams.get("page") ?? 1), pocket } : null;
  });

  if (binder.isLoading || cards.isLoading || layout.isLoading) {
    return (
      <PageLayout>
        <Spinner />
      </PageLayout>
    );
  }

  if (binder.error || !data) {
    return (
      <PageLayout>
        <EmptyState message="That binder doesn't exist." />
      </PageLayout>
    );
  }

  const page = Number(pageParam);
  const kind = data.kind as BinderKind;
  const total = data.pokemon_count ?? 0;
  const caught = data.caught_count ?? 0;
  const desc =
    kind !== "pokedex"
      ? `${BINDER_KIND_LABELS[kind]} · ${data.card_count} ${data.card_count === 1 ? "card" : "cards"} · ` +
        `${pages.length} ${pages.length === 1 ? "page" : "pages"}`
      : data.finished_on
        ? `Finished ${formatDate(data.finished_on)} · ${caught} of ${total} caught · ${layout.pagesLabel(data)}`
        : `${binderRule(data)} · ${data.card_count} of ${total} cards · ${layout.pagesLabel(data)}`;

  // Finished, a Pokédex binder stays as it is but leaves the goal: what the
  // Pokédex, the sets and the pack chooser count.
  const missingCount = total - caught;
  const lastOne =
    (binders.data ?? []).filter((other) => other.kind === "pokedex" && !other.finished_on).length === 1;
  const finishText = [
    missingCount > 0
      ? `${data.name} is finished with ${caught} of ${total}. Its ${missingCount} missing Pokémon stop counting: the Pokédex, the sets and Which pack? follow the binders you still collect.`
      : `All ${total} caught. The Pokédex, the sets and Which pack? will follow the binders you still collect.`,
    "Its pages and cards stay as they are, and a card you find later still goes in its pocket.",
    lastOne && "It's the last binder you collect for: start a new one from Binders.",
  ]
    .filter(Boolean)
    .join(" ");
  const pokedexItems =
    kind !== "pokedex"
      ? []
      : data.finished_on
        ? [
            {
              label: "Collect again",
              onSelect: () =>
                update.mutate(
                  { id: data.id!, values: { finished_on: null } },
                  { onSuccess: () => toast.success(`Collecting ${data.name} again`) },
                ),
            },
          ]
        : [{ label: "Finish this binder", onSelect: () => setFinishing(true) }];

  return (
    <PageLayout>
      {/* hasBack: as a home-screen web app there is no browser back button. */}
      <PageHeader
        headline={data.name ?? "Binder"}
        desc={desc}
        type="binder"
        hasBack
        onEdit={() => binderDialog.edit(data)}
        actions={
          <DropdownMenu
            items={[
              ...pokedexItems,
              { label: "Delete", onSelect: () => deleteDialog.request(data), danger: true },
            ]}
          />
        }
      />
      {kind === "pokedex" && (
        <Flex gap="2" wrap="wrap">
          {layout.sections(data).map((section) => (
            <Button key={section.label} variant="secondary" onClick={() => setPageParam(String(section.page))}>
              {`${section.label} · page ${section.page}`}
            </Button>
          ))}
        </Flex>
      )}
      <BinderPages
        pages={pages}
        pocketsPerPage={data.pockets_per_page!}
        page={page}
        onPageChange={(next) => setPageParam(String(next))}
        highlight={highlight}
      />
      <AlertDialog title="Delete binder" {...deleteDialog.props} />
      <AlertDialog
        title="Finish this binder"
        description={finishText}
        confirmLabel="Finish it"
        open={finishing}
        onOpenChange={setFinishing}
        pending={update.isPending}
        onConfirm={() =>
          update.mutate(
            { id: data.id!, values: { finished_on: todayIso() } },
            {
              onSuccess: () => {
                setFinishing(false);
                toast.success(`${data.name} finished`);
              },
            },
          )
        }
      />
      <BinderDialog {...binderDialog.props} />
    </PageLayout>
  );
};

export default BinderSinglePage;
