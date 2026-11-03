import type React from "react";

type PokeBallProps = {
  className?: string;
};

// The Poké Ball outline the reference design puts behind every Pokémon.
// Decorative; takes the text color.
const PokeBall: React.FC<PokeBallProps> = ({ className }) => (
  <svg viewBox="0 0 100 100" fill="currentColor" className={className} aria-hidden>
    <path d="M0.25 45A50 50 0 0 1 99.75 45H69.36A20 20 0 0 0 30.64 45Z" />
    <path d="M0.25 55A50 50 0 0 0 99.75 55H69.36A20 20 0 0 1 30.64 55Z" />
    <circle cx="50" cy="50" r="12" />
  </svg>
);

export default PokeBall;
