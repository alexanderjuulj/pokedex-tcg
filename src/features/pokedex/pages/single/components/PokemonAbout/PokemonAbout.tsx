import type React from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Flex, Text } from "@/components/ui";
import type { Pokemon } from "@/hooks/queries";
import { formatHeight, formatWeight } from "@/lib/pokemon";
import { PokemonArt } from "@/features/pokedex/components";
import { CLASSES, REGIONS } from "@/features/pokedex/constants";
import styles from "./PokemonAbout.module.scss";

type PokemonAboutProps = {
  pokemon: Pokemon;
  // The whole Pokédex, for the evolution chain.
  pokedex: Pokemon[];
};

// Every step of the Pokémon's family, from the first stage down, branches
// included (Eevee has eight).
function evolutionSteps(pokemon: Pokemon, pokedex: Pokemon[]) {
  const byId = new Map(pokedex.map((entry) => [entry.id!, entry]));
  let root = pokemon;
  while (root.evolves_from_id !== null && byId.has(root.evolves_from_id)) {
    root = byId.get(root.evolves_from_id)!;
  }
  const steps: { from: Pokemon; to: Pokemon }[] = [];
  const queue = [root];
  while (queue.length) {
    const from = queue.shift()!;
    for (const to of pokedex.filter((entry) => entry.evolves_from_id === from.id)) {
      steps.push({ from, to });
      queue.push(to);
    }
  }
  return steps;
}

const Stage: React.FC<{ pokemon: Pokemon }> = ({ pokemon }) => (
  <Link to={`/pokedex/${pokemon.id}`} className={styles.stage}>
    <PokemonArt pokemonId={pokemon.id!} name={pokemon.name ?? ""} className={styles.stage_art} />
    <span className={styles.stage_name}>{pokemon.name}</span>
  </Link>
);

const PokemonAbout: React.FC<PokemonAboutProps> = ({ pokemon, pokedex }) => {
  const region = REGIONS.find(
    (candidate) => pokemon.id! >= candidate.first && pokemon.id! <= candidate.last,
  )!;
  const steps = evolutionSteps(pokemon, pokedex);
  const pokemonClass = CLASSES.find((candidate) => candidate.value === pokemon.class);
  const facts: [string, string][] = [
    ["Category", pokemon.category ?? "—"],
    ["Height", formatHeight(pokemon.height_dm!)],
    ["Weight", formatWeight(pokemon.weight_hg!)],
    ["From", `${region.generation} · ${region.label}`],
  ];

  return (
    <Flex direction="column" gap="5">
      <p className={styles.entry}>{pokemon.entry}</p>
      {pokemonClass && (
        <Link to={`/pokedex?class=${pokemonClass.value}`} className={styles.class}>
          <pokemonClass.icon size={22} aria-hidden className={styles.class_icon} />
          <span className={styles.class_text}>
            <span className={styles.class_label}>{pokemonClass.label}</span>
            <span>{pokemonClass.about}</span>
            <span className={styles.class_more}>
              See all {pokedex.filter((entry) => entry.class === pokemonClass.value).length}
            </span>
          </span>
          <ChevronRight size={20} aria-hidden className={styles.class_chevron} />
        </Link>
      )}
      <dl className={styles.facts}>
        {facts.map(([label, value]) => (
          <div key={label} className={styles.facts_row}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <Flex direction="column" gap="3">
        <Text size="3" weight="bold">
          Evolution
        </Text>
        {steps.length ? (
          steps.map(({ from, to }) => (
            <div key={to.id} className={styles.step}>
              <Stage pokemon={from} />
              <span className={styles.step_method}>
                <ArrowRight size={18} aria-hidden />
                {to.evolution_method}
              </span>
              <Stage pokemon={to} />
            </div>
          ))
        ) : (
          <Text size="2" color="gray">
            {pokemon.name} doesn't evolve.
          </Text>
        )}
      </Flex>
    </Flex>
  );
};

export default PokemonAbout;
