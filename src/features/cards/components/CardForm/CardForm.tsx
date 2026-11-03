import type React from "react";
import { useState } from "react";
import {
  Button,
  Checkbox,
  DateInput,
  Field,
  Flex,
  Form,
  Grid,
  Input,
  Select,
  Text,
  Textarea,
} from "@/components/ui";
import { CARD_INVALIDATES } from "@/constants/invalidates";
import {
  useCatalogCardPokemon,
  usePokedex,
  useTableMutations,
  type CatalogCard,
  type OwnedCard,
} from "@/hooks/queries";
import { formatCardNumber, formatDexNumber, parsePrice, priceInput } from "@/lib/pokemon";
import { emptyToNull } from "@/lib/utils";
import {
  CONDITION_LABELS,
  FINISH_LABELS,
  GRADING_LABELS,
  LANGUAGE_LABELS,
} from "../../constants";
import type { CardFinish } from "../../types";
import CardImage from "../CardImage/CardImage";
import styles from "./CardForm.module.scss";

const toItems = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

const CONDITION_ITEMS = toItems(CONDITION_LABELS);
const LANGUAGE_ITEMS = toItems(LANGUAGE_LABELS);
const GRADING_ITEMS = [{ value: "none", label: "Not graded" }, ...toItems(GRADING_LABELS)];

// The printed card the form is about, from the catalogue (adding) or from the
// card itself (editing).
type Printed = {
  catalogCardId: number;
  name: string | null;
  setName: string | null;
  number: string | null;
  setCardCount: number | null;
  hasImage: boolean | null;
  finishes: CardFinish[];
  hasFirstEdition: boolean;
  pokemonCount: number;
};

function printedFrom(source: CatalogCard | OwnedCard): Printed | null {
  const catalogCardId = "catalog_card_id" in source ? source.catalog_card_id : source.id;
  if (catalogCardId === null) return null;
  const finishes = (
    [
      source.has_normal && "normal",
      source.has_holo && "holo",
      source.has_reverse && "reverse_holo",
    ] as const
  ).filter((finish): finish is CardFinish => Boolean(finish));
  return {
    catalogCardId,
    name: source.name,
    setName: source.set_name,
    number: "local_id" in source ? source.local_id : source.number,
    setCardCount: source.set_card_count,
    hasImage: source.has_image,
    // TCGdex doesn't know the versions of every card: offer all then.
    finishes: finishes.length ? finishes : ["normal", "holo", "reverse_holo"],
    hasFirstEdition: Boolean(source.has_first_edition),
    pokemonCount: source.pokemon_count ?? 1,
  };
}

type CardFormProps = {
  // null = add.
  card: OwnedCard | null;
  // Adding: the Pokémon whose page it was added from, and the printed card
  // picked from its catalogue (null: entered by hand).
  pokemonId: number;
  catalogCard: CatalogCard | null;
  onDone: () => void;
};

const CardForm: React.FC<CardFormProps> = ({ card, pokemonId: initialPokemonId, catalogCard, onDone }) => {
  const { create, update } = useTableMutations("cards", CARD_INVALIDATES);
  const source = card ?? catalogCard;
  const printed = source ? printedFrom(source) : null;
  const finishes = printed?.finishes ?? (["normal", "holo", "reverse_holo"] as CardFinish[]);

  const [pokemonId, setPokemonId] = useState(String(card?.pokemon_id ?? initialPokemonId));
  const [cardName, setCardName] = useState(card?.name ?? "");
  const [cardSet, setCardSet] = useState(card?.set_name ?? "");
  const [cardNumber, setCardNumber] = useState(card?.number ?? "");
  const [finish, setFinish] = useState<string>(card?.finish ?? finishes[0]);
  const [firstEdition, setFirstEdition] = useState(card?.first_edition ?? false);
  const [condition, setCondition] = useState(card?.condition ?? "near_mint");
  const [language, setLanguage] = useState(card?.language ?? "en");
  const [grading, setGrading] = useState(card?.grading_company ?? "none");
  const [grade, setGrade] = useState(card?.grade ?? "");
  const [price, setPrice] = useState(priceInput(card?.price_paid ?? null));
  const [acquiredOn, setAcquiredOn] = useState(card?.acquired_on ?? "");
  const [location, setLocation] = useState(card?.location ?? "");
  const [notes, setNotes] = useState(card?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  // A tag-team card counts for one of the Pokémon on it.
  const pokedex = usePokedex();
  const onCard = useCatalogCardPokemon(
    printed && printed.pokemonCount > 1 ? printed.catalogCardId : null,
  );
  const pokemonItems = (onCard.data ?? []).map((id) => ({
    value: String(id),
    label: `${formatDexNumber(id)} ${pokedex.data?.find((p) => p.id === id)?.name ?? ""}`,
  }));
  const finishItems = [...new Set([...finishes, finish as CardFinish])].map((value) => ({
    value,
    label: FINISH_LABELS[value],
  }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const paid = parsePrice(price);
    if (price.trim() !== "" && paid === null) {
      setError("The price should be a number of kroner, like 12,50.");
      return;
    }
    const graded = grading !== "none";
    const values = {
      pokemon_id: Number(pokemonId),
      finish,
      first_edition: firstEdition,
      condition,
      language,
      grading_company: graded ? grading : null,
      grade: graded ? emptyToNull(grade) : null,
      price_paid: paid,
      acquired_on: emptyToNull(acquiredOn),
      location: emptyToNull(location),
      notes: emptyToNull(notes),
      ...(!printed && {
        name: cardName.trim(),
        set_name: emptyToNull(cardSet),
        number: emptyToNull(cardNumber),
      }),
    };
    try {
      if (card) {
        const moved = Number(pokemonId) !== card.pokemon_id;
        // A card leaves its slot when it moves; the triggers find the slots
        // new holders.
        await update.mutateAsync({
          id: card.id!,
          values: moved ? { ...values, is_featured: false } : values,
        });
      } else {
        await create.mutateAsync({ ...values, catalog_card_id: printed?.catalogCardId ?? null });
      }
      onDone();
    } catch (submitError) {
      setError((submitError as Error).message);
    }
  };

  return (
    <Form onSubmit={onSubmit} error={error}>
      {printed ? (
        <Flex gap="3" align="center">
          <CardImage
            catalogCardId={printed.catalogCardId}
            hasImage={printed.hasImage}
            size="low"
            alt={printed.name ?? ""}
            className={styles.preview}
          />
          <Flex direction="column" minWidth="0">
            <Text size="3" weight="bold">
              {printed.name}
            </Text>
            <Text size="1" color="gray">
              {printed.setName} · {formatCardNumber(printed.number, printed.setCardCount)}
            </Text>
          </Flex>
        </Flex>
      ) : (
        <Grid columns={{ initial: "1", xs: "2" }} gap="4">
          <Field label="Card name">
            <Input value={cardName} onChange={(e) => setCardName(e.target.value)} required />
          </Field>
          <Field label="Set">
            <Input value={cardSet} onChange={(e) => setCardSet(e.target.value)} />
          </Field>
          <Field label="Number">
            <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4/102" />
          </Field>
        </Grid>
      )}
      <Grid columns={{ initial: "1", xs: "2" }} gap="4">
        {pokemonItems.length > 1 && (
          <Field label="Counts for">
            <Select value={pokemonId} onValueChange={setPokemonId} items={pokemonItems} required />
          </Field>
        )}
        <Field label="Version">
          <Select value={finish} onValueChange={setFinish} items={finishItems} required />
        </Field>
        <Field label="Condition">
          <Select value={condition} onValueChange={setCondition} items={CONDITION_ITEMS} required />
        </Field>
        <Field label="Language">
          <Select value={language} onValueChange={setLanguage} items={LANGUAGE_ITEMS} required />
        </Field>
        <Field label="Grading">
          <Select value={grading} onValueChange={setGrading} items={GRADING_ITEMS} required />
        </Field>
        {grading !== "none" && (
          <Field label="Grade">
            <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="10" required />
          </Field>
        )}
        <Field label="Paid (kr)">
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
          />
        </Field>
        <Field label="Got it on">
          <DateInput value={acquiredOn} onChange={setAcquiredOn} />
        </Field>
        <Field label="Kept in">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Binder 1, page 3"
          />
        </Field>
      </Grid>
      {(!printed || printed.hasFirstEdition) && (
        <Checkbox label="1st edition" checked={firstEdition} onCheckedChange={setFirstEdition} />
      )}
      <Field label="Its story">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Where it came from, who gave it…"
        />
      </Field>
      <Flex direction={{ initial: "column", xs: "row" }}>
        <Button type="submit" disabled={create.isPending || update.isPending}>
          {card ? "Save" : "Add card"}
        </Button>
      </Flex>
    </Form>
  );
};

export default CardForm;
