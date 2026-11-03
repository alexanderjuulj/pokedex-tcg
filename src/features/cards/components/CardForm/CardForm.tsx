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
  useBinders,
  useCatalogCardPokemon,
  useOwnedCards,
  usePokedex,
  usePutInBinder,
  useSetFeaturedCard,
  useTableMutations,
  type CatalogCard,
  type OwnedCard,
} from "@/hooks/queries";
import { formatCardNumber, formatDexNumber } from "@/lib/pokemon";
import { emptyToNull } from "@/lib/utils";
import {
  CONDITION_LABELS,
  FINISH_LABELS,
  GRADING_LABELS,
  LANGUAGE_LABELS,
} from "../../constants";
import { binderIdOf, placementChoices, type Placement } from "../../placement";
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
  const [condition, setCondition] = useState(card?.condition ?? "mint");
  const [language, setLanguage] = useState(card?.language ?? "en");
  const [grading, setGrading] = useState(card?.grading_company ?? "none");
  const [grade, setGrade] = useState(card?.grade ?? "");
  const [acquiredOn, setAcquiredOn] = useState(card?.acquired_on ?? "");
  const [location, setLocation] = useState(card?.location ?? "");
  const [notes, setNotes] = useState(card?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  // Which binder it goes in. Until one is picked (or when the pick no longer
  // fits, after "Counts for" or "Grading" changes), where it is or belongs.
  const binders = useBinders();
  const owned = useOwnedCards();
  const setFeatured = useSetFeaturedCard();
  const putInBinder = usePutInBinder();
  const [chosen, setChosen] = useState<Placement | null>(null);
  const choices = placementChoices(
    card,
    Number(pokemonId),
    grading !== "none",
    binders.data ?? [],
    owned.data ?? [],
  );
  const placement =
    chosen && choices.items.some((item) => item.value === chosen) ? chosen : choices.initial;

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
    const graded = grading !== "none";
    const values = {
      pokemon_id: Number(pokemonId),
      finish,
      first_edition: firstEdition,
      condition,
      language,
      grading_company: graded ? grading : null,
      grade: graded ? emptyToNull(grade) : null,
      acquired_on: emptyToNull(acquiredOn),
      // Where it is when it's in no binder.
      location: placement === "none" ? emptyToNull(location) : null,
      notes: emptyToNull(notes),
      ...(!printed && {
        name: cardName.trim(),
        set_name: emptyToNull(cardSet),
        number: emptyToNull(cardNumber),
      }),
    };
    try {
      let id: number;
      if (card) {
        const moved = Number(pokemonId) !== card.pokemon_id;
        // A card leaves its slot when it moves; the triggers find the slots
        // new holders.
        const saved = await update.mutateAsync({
          id: card.id!,
          values: {
            ...values,
            ...(moved && { is_featured: false }),
            ...(placement === "none" && { binder_id: null, binder_pocket: null }),
          },
        });
        id = saved.id;
      } else {
        const saved = await create.mutateAsync({
          ...values,
          catalog_card_id: printed?.catalogCardId ?? null,
        });
        id = saved.id;
      }
      // Into its binder: a first card is in its Pokédex pocket already.
      const binderId = binderIdOf(placement);
      if (placement === "slot" && choices.swapsSlot) {
        await setFeatured.mutateAsync(id);
      } else if (binderId !== null && binderId !== card?.binder_id) {
        await putInBinder.mutateAsync({ card_id: id, binder_id: binderId });
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
      <Flex direction="column" gap="2">
        <Field label="Binder">
          <Select
            value={placement}
            onValueChange={(value) => setChosen(value as Placement)}
            items={choices.items}
            required
          />
        </Field>
        {choices.hint && (
          <Text size="2" color="gray">
            {choices.hint}
          </Text>
        )}
      </Flex>
      {placement === "none" && (
        <Field label="Kept where">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={grading !== "none" ? "The slab box, a display case…" : "A deck box, the shoebox…"}
          />
        </Field>
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
        <Field label="Got it on">
          <DateInput value={acquiredOn} onChange={setAcquiredOn} />
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
        <Button
          type="submit"
          disabled={
            create.isPending || update.isPending || setFeatured.isPending || putInBinder.isPending
          }
        >
          {card ? "Save" : "Add card"}
        </Button>
      </Flex>
    </Form>
  );
};

export default CardForm;
