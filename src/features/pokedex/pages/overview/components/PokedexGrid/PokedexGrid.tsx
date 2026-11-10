import type React from "react";
import type { Pokemon } from "@/hooks/queries";
import PokemonTile from "../PokemonTile/PokemonTile";
import styles from "./PokedexGrid.module.scss";

type PokedexGridProps = {
  pokemon: Pokemon[];
  isCaught: (pokemon: Pokemon) => boolean;
};

const PokedexGrid: React.FC<PokedexGridProps> = ({ pokemon, isCaught }) => (
  <div className={styles.grid}>
    {pokemon.map((entry) => (
      <PokemonTile key={entry.id} pokemon={entry} caught={isCaught(entry)} />
    ))}
  </div>
);

export default PokedexGrid;
