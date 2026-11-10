import type React from "react";
import { useState } from "react";
import { Button, Field, Flex, Form, Grid, Input, Select, Text } from "@/components/ui";
import { useAddPokedexBinders, usePokedex } from "@/hooks/queries";
import { CLASSES, REGIONS, TYPE_LABELS } from "@/features/pokedex/constants";
import type { PokemonClass, PokemonType, Region } from "@/features/pokedex/types";
import { pagesOf } from "../../layout";
import { regionSpan } from "../../rule";
import BinderSizeFields from "../BinderSizeFields/BinderSizeFields";

const TYPE_ITEMS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
const CLASS_ITEMS = CLASSES.map((entry) => ({ value: entry.value, label: entry.plural }));
const REGION_ITEMS = REGIONS.map((region) => ({ value: region.value, label: region.label }));

type RuleBinderFormProps = {
  rule: "type" | "class";
  onDone: () => void;
};

// One Pokédex binder for the Pokémon of a type ("Water Pokémon") or a class
// (the starters), over a span of regions: a pocket for each, in Pokédex
// order, its own card in it even when another binder holds the Pokémon too.
const RuleBinderForm: React.FC<RuleBinderFormProps> = ({ rule, onDone }) => {
  const pokedex = usePokedex();
  const add = useAddPokedexBinders();
  const [type, setType] = useState<PokemonType>("water");
  const [pokemonClass, setPokemonClass] = useState<PokemonClass>("starter");
  const [from, setFrom] = useState<Region>(REGIONS[0].value);
  const [to, setTo] = useState<Region>(REGIONS.at(-1)!.value);
  const [name, setName] = useState("");
  const [pockets, setPockets] = useState("9");
  const [pages, setPages] = useState("40");
  const [regionPages, setRegionPages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const first = REGIONS.find((region) => region.value === from)!.first;
  const last = Math.max(first, REGIONS.find((region) => region.value === to)!.last);
  const members = (pokedex.data ?? [])
    .filter((pokemon) => pokemon.id! >= first && pokemon.id! <= last)
    .filter((pokemon) =>
      rule === "type"
        ? pokemon.primary_type === type || pokemon.secondary_type === type
        : pokemon.class === pokemonClass,
    )
    .map((pokemon) => pokemon.id!);
  const perPage = Number(pockets);
  const capacity = Number(pages);
  const used = pagesOf(members, perPage, regionPages).length;
  const fits = Number.isInteger(capacity) && capacity >= used;

  // "Water Pokémon", "Starters", "Legendary Pokémon, Kanto–Johto", until a
  // name is typed.
  const kind =
    rule === "type"
      ? `${TYPE_LABELS[type]} Pokémon`
      : (() => {
          const plural = CLASSES.find((entry) => entry.value === pokemonClass)!.plural;
          return plural.endsWith("s") ? plural : `${plural} Pokémon`;
        })();
  const span = regionSpan(first, last);
  const suggested = span === "every region" ? kind : `${kind}, ${span}`;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fits) {
      setError(`It needs ${used} pages with ${perPage} pockets per page.`);
      return;
    }
    try {
      await add.mutateAsync([
        {
          name: name.trim() || suggested,
          first_pokemon_id: first,
          last_pokemon_id: last,
          pockets_per_page: perPage,
          page_count: capacity,
          pokemon_type: rule === "type" ? type : null,
          pokemon_class: rule === "class" ? pokemonClass : null,
          region_pages: regionPages,
        },
      ]);
      onDone();
    } catch (submitError) {
      setError((submitError as Error).message);
    }
  };

  return (
    <Form onSubmit={onSubmit} error={error}>
      {rule === "type" ? (
        <Field label="Type">
          <Select
            value={type}
            onValueChange={(value) => setType(value as PokemonType)}
            items={TYPE_ITEMS}
            required
          />
        </Field>
      ) : (
        <Field label="Class">
          <Select
            value={pokemonClass}
            onValueChange={(value) => setPokemonClass(value as PokemonClass)}
            items={CLASS_ITEMS}
            required
          />
        </Field>
      )}
      <Grid columns="2" gap="3">
        <Field label="From">
          <Select
            value={from}
            onValueChange={(value) => setFrom(value as Region)}
            items={REGION_ITEMS}
            required
          />
        </Field>
        <Field label="To">
          <Select
            value={to}
            onValueChange={(value) => setTo(value as Region)}
            items={REGION_ITEMS}
            required
          />
        </Field>
      </Grid>
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={suggested} />
      </Field>
      <BinderSizeFields
        pockets={pockets}
        onPocketsChange={setPockets}
        pages={pages}
        onPagesChange={setPages}
        regionPages={regionPages}
        onRegionPagesChange={setRegionPages}
      />
      <Text size="2" weight="bold">
        {members.length
          ? `${members.length} Pokémon, on ${used} ${used === 1 ? "page" : "pages"}` +
            (fits ? "." : `: more than the binder's ${pages} pages.`)
          : "No Pokémon of that kind in those regions."}
      </Text>
      <Text size="2" color="gray">
        Each gets a pocket for a card of its own, even when another binder keeps one for the
        same Pokémon. The cards you have outside the Pokédex binders go in.
      </Text>
      <Flex direction={{ initial: "column", xs: "row" }}>
        <Button type="submit" disabled={!members.length || add.isPending || pokedex.isLoading}>
          Make binder
        </Button>
      </Flex>
    </Form>
  );
};

export default RuleBinderForm;
