import type React from "react";
import { useState } from "react";
import { Button, Flex, Form, Text } from "@/components/ui";
import { useAddPokedexBinders } from "@/hooks/queries";
import { useGoal } from "@/features/pokedex/hooks";
import type { Region } from "@/features/pokedex/types";
import { useBinderPlan } from "../../hooks";
import BinderPlanList from "../BinderPlanList/BinderPlanList";
import BinderSizeFields from "../BinderSizeFields/BinderSizeFields";
import RegionPicker from "../RegionPicker/RegionPicker";

type PokedexBinderFormProps = {
  onDone: () => void;
};

// More regions to collect, after the setup: Pokédex binders for them, which
// widen the goal.
const PokedexBinderForm: React.FC<PokedexBinderFormProps> = ({ onDone }) => {
  const goal = useGoal();
  const add = useAddPokedexBinders();
  const [regions, setRegions] = useState<Region[]>([]);
  const { plan, fields } = useBinderPlan(regions);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await add.mutateAsync(plan);
      onDone();
    } catch (submitError) {
      setError((submitError as Error).message);
    }
  };

  return (
    <Form onSubmit={onSubmit} error={error}>
      <Text size="2" color="gray">
        Each Pokémon of the regions you pick gets a pocket, in Pokédex order, and counts toward
        the Pokédex.
      </Text>
      <RegionPicker
        value={regions}
        onChange={setRegions}
        taken={goal.regions.map((region) => region.value)}
      />
      <BinderSizeFields {...fields} />
      <BinderPlanList plan={plan} />
      <Flex direction={{ initial: "column", xs: "row" }}>
        <Button type="submit" disabled={!plan.length || add.isPending}>
          {plan.length > 1 ? `Make ${plan.length} binders` : "Make binder"}
        </Button>
      </Flex>
    </Form>
  );
};

export default PokedexBinderForm;
