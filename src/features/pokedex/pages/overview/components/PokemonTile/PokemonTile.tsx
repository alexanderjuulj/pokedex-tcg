import type React from "react";
import { Link } from "react-router";
import { PokeBall } from "@/components/ui";
import type { Pokemon } from "@/hooks/queries";
import { formatDexNumber } from "@/lib/pokemon";
import { cn } from "@/lib/utils";
import { PokemonArt, TypePill } from "@/features/pokedex/components";
import type { PokemonType } from "@/features/pokedex/types";
import styles from "./PokemonTile.module.scss";

type PokemonTileProps = {
  pokemon: Pokemon;
};

// Caught Pokémon fill with their type color; the rest wait in gray, as a
// shadow.
const PokemonTile: React.FC<PokemonTileProps> = ({ pokemon }) => {
  const id = pokemon.id!;
  const caught = (pokemon.card_count ?? 0) > 0;
  const types = [pokemon.primary_type, pokemon.secondary_type].filter(
    Boolean,
  ) as PokemonType[];

  return (
    <Link
      to={`/pokedex/${id}`}
      className={cn(styles.tile, !caught && styles.tile__missing)}
      data-type={caught ? pokemon.primary_type : undefined}
    >
      <PokeBall className={styles.tile_ball} />
      <span className={styles.tile_number}>{formatDexNumber(id)}</span>
      <span className={styles.tile_name}>{pokemon.name}</span>
      <span className={styles.tile_types}>
        {types.map((type) => (
          <TypePill key={type} type={type} variant={caught ? "onColor" : "muted"} />
        ))}
      </span>
      {(pokemon.card_count ?? 0) > 1 && (
        <span className={styles.tile_count}>{pokemon.card_count} cards</span>
      )}
      <PokemonArt
        pokemonId={id}
        name={pokemon.name ?? ""}
        silhouette={!caught}
        className={styles.tile_art}
      />
    </Link>
  );
};

export default PokemonTile;
