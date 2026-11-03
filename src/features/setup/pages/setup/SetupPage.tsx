import type React from "react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button, Flex, Form, Spinner, Text } from "@/components/ui";
import Logo from "@/components/layout/Logo/Logo";
import { APP_TITLE } from "@/constants/app";
import { useAddPokedexBinders } from "@/hooks/queries";
import { formatList } from "@/lib/utils";
import { BinderPlanList, BinderSizeFields, RegionPicker } from "@/features/binders/components";
import { useBinderPlan } from "@/features/binders/hooks";
import { REGIONS } from "@/features/pokedex/constants";
import { useGoal } from "@/features/pokedex/hooks";
import type { Region } from "@/features/pokedex/types";
import { SetupChecks, SetupStep } from "./components";
import styles from "./Setup.module.scss";

type Step = "welcome" | "regions" | "binder" | "ready";

const BINDER_FORM = "setup-binder";

// The first run: the regions to collect and the binders to keep them in. The
// Pokédex binders it makes are the goal, so a collection that has one never
// sees this page (SetupGate sends the others here).
const SetupPage: React.FC = () => {
  const goal = useGoal();
  const add = useAddPokedexBinders();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [regions, setRegions] = useState<Region[]>([]);
  const { plan, fields } = useBinderPlan(regions);
  // Set while (and after) the binders are made: from then on the collection is
  // set up, and this page stays for its last step instead of leaving.
  const [making, setMaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (goal.isLoading) return <Spinner fullscreen />;
  if (goal.isSetUp && !making) return <Navigate to="/" replace />;

  const picked = REGIONS.filter((region) => regions.includes(region.value));
  const pokemonCount = picked.reduce((count, region) => count + region.last - region.first + 1, 0);

  const onMake = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMaking(true);
    try {
      await add.mutateAsync(plan);
      setStep("ready");
    } catch (makeError) {
      setMaking(false);
      setError((makeError as Error).message);
    }
  };

  return (
    <div className={styles.setup}>
      <Flex direction="column" align="center" gap="6" className={styles.setup_inner}>
        <Logo />
        {step === "welcome" && (
          <SetupStep
            title={`Welcome to ${APP_TITLE}`}
            desc="Keep your Pokémon cards here: one for each Pokémon you collect, from any era of the card game, each with its details and its story."
            actions={<Button onClick={() => setStep("regions")}>Get started</Button>}
          >
            <Text size="3">
              Setting up takes two steps: pick the regions to collect, then the binder you keep
              their cards in.
            </Text>
          </SetupStep>
        )}

        {step === "regions" && (
          <SetupStep
            progress="Step 1 of 2"
            title="What will you collect?"
            desc="Pick one region or several. Their Pokémon are what the Pokédex counts. Cards of any other Pokémon are kept too; they just don't count. You can add regions later."
            actions={
              <>
                <Button variant="secondary" onClick={() => setStep("welcome")}>
                  Back
                </Button>
                <Button disabled={!regions.length} onClick={() => setStep("binder")}>
                  Next
                </Button>
              </>
            }
            status={
              picked.length
                ? `${pokemonCount} Pokémon from ${formatList(picked.map((region) => region.label))}`
                : "Tap a region to pick it."
            }
          >
            <RegionPicker value={regions} onChange={setRegions} />
          </SetupStep>
        )}

        {step === "binder" && (
          <SetupStep
            progress="Step 2 of 2"
            title="Your binder"
            desc="Every Pokémon gets its own pocket, in Pokédex order, and each region starts on a fresh page. Enter the size of your binder: what doesn't fit goes in another binder of the same size."
            actions={
              <>
                <Button variant="secondary" onClick={() => setStep("regions")}>
                  Back
                </Button>
                <Button type="submit" form={BINDER_FORM} disabled={!plan.length || add.isPending}>
                  {plan.length > 1 ? `Make ${plan.length} binders` : "Make binder"}
                </Button>
              </>
            }
          >
            <Form id={BINDER_FORM} onSubmit={onMake} error={error}>
              <BinderSizeFields {...fields} />
              <BinderPlanList plan={plan} />
            </Form>
          </SetupStep>
        )}

        {step === "ready" && (
          <SetupStep
            title="You're all set"
            desc={
              plan.length > 1
                ? `Your ${plan.length} binders are ready. You'll find them under Binders.`
                : `${plan[0]?.name} is ready. You'll find it under Binders.`
            }
            actions={<Button onClick={() => navigate("/pokedex")}>Open the Pokédex</Button>}
          >
            <SetupChecks />
            <ul className={styles.tips}>
              <li>
                <strong>Add a card:</strong> find its Pokémon in the Pokédex, open its printed
                cards and tap the one you have.
              </li>
              <li>
                <strong>Your binder:</strong> a Pokémon&apos;s first card fills its pocket. Extras
                and duplicates can go in a free binder.
              </li>
              <li>
                <strong>Still missing:</strong> Sets shows which sets hold the Pokémon you still
                need.
              </li>
            </ul>
          </SetupStep>
        )}
      </Flex>
    </div>
  );
};

export default SetupPage;
