import type React from "react";
import { useState } from "react";
import { Button, EmptyState, Flex, Spinner, Text } from "@/components/ui";
import { PageHeader, PageLayout } from "@/components/layout";
import { useBinders, type Binder } from "@/hooks/queries";
import { useFormDialog } from "@/hooks/useFormDialog";
import { BinderDialog, PokedexBinderDialog } from "@/features/binders/components";
import { useGoal } from "@/features/pokedex/hooks";
import { BinderGrid } from "./components";

const BindersOverviewPage: React.FC = () => {
  const { data, isLoading, error } = useBinders();
  const goal = useGoal();
  const binderDialog = useFormDialog<Binder>();
  const [collectingMore, setCollectingMore] = useState(false);

  return (
    <PageLayout>
      <PageHeader
        headline="Binders"
        desc="Where every card sits, page by page"
        type="binder"
        onAdd={() => binderDialog.create()}
      />
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <EmptyState message={`Failed to load: ${error.message}`} />
      ) : data?.length ? (
        <BinderGrid binders={data} />
      ) : (
        <EmptyState message="No binders yet." />
      )}
      <Flex direction="column" gap="3" align="start">
        <Text size="2" color="gray">
          A new binder holds extras and duplicates: put a card in from its page, and it goes in
          the first empty pocket.
        </Text>
        {!goal.isLoading && goal.others.length > 0 && (
          <>
            <Text size="2" color="gray">
              {`A Pokédex binder keeps a pocket for every Pokémon of its regions, and those are the Pokémon the Pokédex counts. You collect ${goal.label}.`}
            </Text>
            <Button variant="secondary" onClick={() => setCollectingMore(true)}>
              Collect more regions
            </Button>
          </>
        )}
      </Flex>
      <BinderDialog {...binderDialog.props} />
      <PokedexBinderDialog open={collectingMore} onOpenChange={setCollectingMore} />
    </PageLayout>
  );
};

export default BindersOverviewPage;
