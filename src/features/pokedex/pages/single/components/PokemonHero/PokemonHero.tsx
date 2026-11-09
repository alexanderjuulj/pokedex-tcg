import type React from "react";
import { ChevronLeft } from "lucide-react";
import { PokeBall } from "@/components/ui";
import type { Pokemon } from "@/hooks/queries";
import { formatDexNumber } from "@/lib/pokemon";
import { PokemonArt, TypePill } from "@/features/pokedex/components";
import { CLASSES } from "@/features/pokedex/constants";
import type { PokemonType } from "@/features/pokedex/types";
import styles from "./PokemonHero.module.scss";

type PokemonHeroProps = {
  pokemon: Pokemon;
};

// The top of a Pokémon's page, in its type color as in the reference design.
// It carries its own back button: as a home-screen web app there is no
// browser back button.
const PokemonHero: React.FC<PokemonHeroProps> = ({ pokemon }) => {
  const types = [pokemon.primary_type, pokemon.secondary_type].filter(
    Boolean,
  ) as PokemonType[];
  const caught = (pokemon.card_count ?? 0) > 0;
  const pokemonClass = CLASSES.find((candidate) => candidate.value === pokemon.class);

  return (
    <section className={styles.hero} data-type={pokemon.primary_type}>
      <span className={styles.hero_deco} aria-hidden>
        <PokeBall className={styles.hero_ball} />
      </span>
      <button
        type="button"
        className={styles.hero_back}
        onClick={() => window.history.back()}
        aria-label="Back"
      >
        <ChevronLeft size={26} strokeWidth={2} aria-hidden />
      </button>
      <div className={styles.hero_heading}>
        <h1 className={styles.hero_name}>{pokemon.name}</h1>
        <span className={styles.hero_number}>{formatDexNumber(pokemon.id!)}</span>
      </div>
      <div className={styles.hero_meta}>
        <span className={styles.hero_types}>
          {types.map((type) => (
            <TypePill key={type} type={type} variant="onColor" />
          ))}
          {pokemonClass && (
            <span className={styles.hero_class}>
              <pokemonClass.icon size={14} strokeWidth={2.25} aria-hidden />
              {pokemonClass.label}
            </span>
          )}
          {!caught && <span className={styles.hero_missing}>Not caught yet</span>}
        </span>
        <span className={styles.hero_category}>{pokemon.category}</span>
      </div>
      <PokemonArt
        pokemonId={pokemon.id!}
        name={pokemon.name ?? ""}
        eager
        className={styles.hero_art}
      />
    </section>
  );
};

export default PokemonHero;
