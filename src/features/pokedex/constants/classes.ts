import { Crown, Footprints, Hourglass, Orbit, Sparkles, type LucideIcon } from "lucide-react";
import type { PokemonClass } from "../types";

// The Pokémon that stand apart (pokemon.class), for the Pokédex's "Legends &
// starters" row and the pill on a Pokémon's page.
export const CLASSES: {
  value: PokemonClass;
  // One of them ("Ultra Beast"), and the group ("Ultra Beasts").
  label: string;
  plural: string;
  icon: LucideIcon;
  // Shown on the group's card.
  artwork: number[];
  // What it means, for someone who just pulled one.
  about: string;
}[] = [
  {
    value: "legendary",
    label: "Legendary",
    plural: "Legendary",
    icon: Crown,
    artwork: [150, 249, 384],
    about: "A Pokémon of legend. In its games there's usually only one of it, and it's often the face of the box.",
  },
  {
    value: "mythical",
    label: "Mythical",
    plural: "Mythical",
    icon: Sparkles,
    artwork: [151, 251, 385],
    about: "Rarer still than the legendaries: the games mostly gave it out only at events.",
  },
  {
    value: "ultra_beast",
    label: "Ultra Beast",
    plural: "Ultra Beasts",
    icon: Orbit,
    artwork: [793, 794, 798],
    about: "A creature from Ultra Space, another world, that came to Alola through a wormhole.",
  },
  {
    value: "paradox",
    label: "Paradox",
    plural: "Paradox",
    icon: Hourglass,
    artwork: [984, 990, 1005],
    about: "An ancient or future form of a Pokémon you know, brought to Paldea from the distant past or the far future.",
  },
  {
    value: "starter",
    label: "Starter",
    plural: "Starters",
    icon: Footprints,
    artwork: [3, 6, 9],
    about: "One of the three Pokémon a new trainer picks from at the start of the journey, or one they evolve into.",
  },
];
