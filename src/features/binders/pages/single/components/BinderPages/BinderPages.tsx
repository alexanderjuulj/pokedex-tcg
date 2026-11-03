import type React from "react";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Flex, Text } from "@/components/ui";
import type { OwnedCard } from "@/hooks/queries";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatDexNumber } from "@/lib/pokemon";
import { cn } from "@/lib/utils";
import { CardImage } from "@/features/cards/components";
import { gradeLabel } from "@/features/cards/grading";
import { PokemonArt } from "@/features/pokedex/components";
import styles from "./BinderPages.module.scss";

export type Pocket =
  | { kind: "card"; card: OwnedCard }
  // A Pokédex binder's pocket whose card is graded: the slab is kept outside
  // the binder, so the pocket is empty.
  | { kind: "graded"; card: OwnedCard }
  // A Pokédex binder's pocket for a Pokémon not caught yet.
  | { kind: "pokemon"; pokemonId: number; name: string }
  // A free binder's empty pocket, and the one the next card goes in.
  | { kind: "empty" }
  | { kind: "next" }
  // A Pokédex binder's pockets after a region's last Pokémon.
  | { kind: "unused" };

type BinderPagesProps = {
  pages: Pocket[][];
  pocketsPerPage: number;
  // Counted from 1.
  page: number;
  onPageChange: (page: number) => void;
  // A pocket to point out, from a card's "page 3, pocket 7".
  highlight: { page: number; pocket: number } | null;
};

// The binder as you'd hold it: one page at a time on a phone, swiped; from
// 768px open at a spread, the back of one sheet beside the front of the next
// (so page 1 sits alone on the right, as in a real binder).
const BinderPages: React.FC<BinderPagesProps> = ({
  pages,
  pocketsPerPage,
  page,
  onPageChange,
  highlight,
}) => {
  const spreads = useMediaQuery("(min-width: 48em)");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const units: (number | null)[][] = spreads
    ? Array.from({ length: Math.floor(pages.length / 2) + 1 }, (_, i) =>
        [2 * i, 2 * i + 1].map((number) => (number >= 1 && number <= pages.length ? number : null)),
      )
    : pages.map((_, i) => [i + 1]);
  const unitOf = (number: number) => (spreads ? Math.floor(number / 2) : number - 1);
  const unit = unitOf(page);
  const firstPage = (index: number) => units[index].find((number) => number !== null)!;

  // Follow the page from outside (a jump, a link), smoothly once on screen.
  const shown = useRef(false);
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ left: unit * scroller.clientWidth, behavior: shown.current ? "smooth" : "auto" });
    shown.current = true;
  }, [unit, spreads]);

  // And report a swipe once it settles.
  const settle = useRef(0);
  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const index = Math.round(scroller.scrollLeft / scroller.clientWidth);
      if (index !== unit && units[index]) onPageChange(firstPage(index));
    }, 120);
  };
  useEffect(() => () => window.clearTimeout(settle.current), []);

  const numbers = units[unit]?.filter((number): number is number => number !== null) ?? [];
  const label =
    numbers.length === 2
      ? `Pages ${numbers[0]}–${numbers[1]} of ${pages.length}`
      : `Page ${numbers[0] ?? 1} of ${pages.length}`;

  const pocketView = (pocket: Pocket, pageNumber: number, index: number) => {
    const highlighted = highlight?.page === pageNumber && highlight.pocket === index + 1;
    const className = cn(styles.pocket, highlighted && styles.pocket__highlight);
    switch (pocket.kind) {
      case "card":
        return (
          <Link key={index} to={`/cards/${pocket.card.id}`} className={className}>
            <CardImage
              catalogCardId={pocket.card.catalog_card_id}
              hasImage={pocket.card.has_image}
              size="low"
              alt={pocket.card.name ?? ""}
            />
          </Link>
        );
      case "graded":
        return (
          <Link
            key={index}
            to={`/cards/${pocket.card.id}`}
            className={cn(className, styles.pocket__graded)}
            title={`Graded, kept in ${pocket.card.location ?? "a slab"}`}
          >
            <CardImage
              catalogCardId={pocket.card.catalog_card_id}
              hasImage={pocket.card.has_image}
              size="low"
              alt={pocket.card.name ?? ""}
              className={styles.pocket_faded}
            />
            <span className={styles.pocket_grade}>{gradeLabel(pocket.card)}</span>
          </Link>
        );
      case "pokemon":
        return (
          <Link
            key={index}
            to={`/pokedex/${pocket.pokemonId}`}
            className={cn(className, styles.pocket__waiting)}
          >
            <span className={styles.pocket_number}>{formatDexNumber(pocket.pokemonId)}</span>
            <PokemonArt pokemonId={pocket.pokemonId} name="" silhouette className={styles.pocket_art} />
            <span className={styles.pocket_name}>{pocket.name}</span>
          </Link>
        );
      case "next":
        return (
          <span key={index} className={cn(className, styles.pocket__next)}>
            Next
          </span>
        );
      default:
        return (
          <span
            key={index}
            className={cn(className, pocket.kind === "unused" && styles.pocket__unused)}
          />
        );
    }
  };

  return (
    <Flex direction="column" gap="3" className={styles.binder}>
      <div
        ref={scrollerRef}
        className={styles.scroller}
        onScroll={onScroll}
        style={{ "--pocket-columns": pocketsPerPage === 4 ? 2 : 3 } as React.CSSProperties}
      >
        {units.map((numbers, index) => (
          <div key={index} className={cn(styles.unit, spreads && styles.unit__spread)}>
            {numbers.map((number, side) =>
              number === null ? (
                <div key={side} className={styles.cover} />
              ) : (
                <div key={side} className={styles.page}>
                  <div className={styles.page_pockets}>
                    {pages[number - 1].map((pocket, pocketIndex) =>
                      pocketView(pocket, number, pocketIndex),
                    )}
                  </div>
                  <span className={styles.page_number}>{number}</span>
                </div>
              ),
            )}
          </div>
        ))}
      </div>
      <Flex align="center" justify="between" gap="3">
        <Button
          variant="secondary"
          aria-label="Previous page"
          disabled={unit === 0}
          onClick={() => onPageChange(firstPage(unit - 1))}
        >
          <ChevronLeft size={20} aria-hidden />
        </Button>
        <Text size="2" weight="bold" color="gray">
          {label}
        </Text>
        <Button
          variant="secondary"
          aria-label="Next page"
          disabled={unit >= units.length - 1}
          onClick={() => onPageChange(firstPage(unit + 1))}
        >
          <ChevronRight size={20} aria-hidden />
        </Button>
      </Flex>
    </Flex>
  );
};

export default BinderPages;
