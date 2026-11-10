import type React from "react";
import { useState } from "react";
import { Button, Checkbox, Field, Flex, Form, Input, Select, Text } from "@/components/ui";
import { BINDER_INVALIDATES } from "@/constants/invalidates";
import { useTableMutations, type Binder } from "@/hooks/queries";
import { POCKETS_LABELS } from "../../constants";
import { useBinderLayout } from "../../hooks";

const POCKET_ITEMS = Object.entries(POCKETS_LABELS).map(([value, label]) => ({ value, label }));

type BinderFormProps = {
  // null = add. New binders here are free ones: Pokédex binders come from the
  // setup or "Collect more regions" (PokedexBinderForm).
  binder: Binder | null;
  onDone: () => void;
};

const BinderForm: React.FC<BinderFormProps> = ({ binder, onDone }) => {
  const { create, update } = useTableMutations("binders", BINDER_INVALIDATES);
  const layout = useBinderLayout();
  const [name, setName] = useState(binder?.name ?? "");
  const [pockets, setPockets] = useState(String(binder?.pockets_per_page ?? 9));
  // A Pokédex binder's size, so it shows how full it is.
  const [pages, setPages] = useState(binder?.page_count ? String(binder.page_count) : "");
  // A Pokédex binder's layout: each region on a fresh page, or one run.
  const [regionPages, setRegionPages] = useState(binder?.region_pages ?? true);
  const [error, setError] = useState<string | null>(null);
  const isPokedex = binder?.kind === "pokedex";

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const values = {
      name: name.trim(),
      pockets_per_page: Number(pockets),
      ...(isPokedex && { page_count: pages.trim() ? Number(pages) : null, region_pages: regionPages }),
    };
    if (isPokedex && values.page_count) {
      const needed = layout.pageCount(binder, Number(pockets), regionPages);
      if (needed > values.page_count) {
        setError(`It needs ${needed} pages with ${pockets} pockets per page.`);
        return;
      }
    }
    try {
      if (binder) await update.mutateAsync({ id: binder.id!, values });
      else await create.mutateAsync({ ...values, kind: "free" });
      onDone();
    } catch (submitError) {
      setError((submitError as Error).message);
    }
  };

  return (
    <Form onSubmit={onSubmit} error={error}>
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Extras" required />
      </Field>
      <Field label="Pockets per page">
        <Select value={pockets} onValueChange={setPockets} items={POCKET_ITEMS} required />
      </Field>
      {isPokedex && (
        <Field label="Pages in the binder">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="Both sides of every sheet"
          />
        </Field>
      )}
      {isPokedex && (
        <Flex direction="column" gap="1">
          <Checkbox
            label="Each region on a fresh page"
            checked={regionPages}
            onCheckedChange={setRegionPages}
          />
          <Text size="2" color="gray">
            Changing it moves the Pokémon to other pages and pockets.
          </Text>
        </Flex>
      )}
      {!binder && (
        <Text size="2" color="gray">
          Put cards in from their page. Each goes in the first empty pocket, so nothing already
          in the binder ever moves.
        </Text>
      )}
      <Flex direction={{ initial: "column", xs: "row" }}>
        <Button type="submit" disabled={create.isPending || update.isPending}>
          {binder ? "Save" : "Add binder"}
        </Button>
      </Flex>
    </Form>
  );
};

export default BinderForm;
