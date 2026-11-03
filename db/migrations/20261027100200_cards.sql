-- The collection: the physical cards we own. A card fills one Pokémon's slot
-- in the Pokédex (pokemon_id), even when it shows two ("Mewtwo & Mew-GX"
-- counts for whichever we pick). Cards from the catalogue link to it; cards
-- it doesn't know (other prints, oddities) are entered by hand with their own
-- name, set and number.

create table cards (
  id              integer primary key,
  pokemon_id      integer not null references pokemon (id),
  catalog_card_id integer references catalog_cards (id),
  -- Only for cards entered by hand: catalogue cards take these from there.
  name            text,
  set_name        text,
  number          text,
  finish          text not null default 'normal'
                  check (finish in ('normal', 'holo', 'reverse_holo')),
  first_edition   boolean not null default 0 check (first_edition in (0, 1)),
  language        text not null default 'en'
                  check (language in ('en', 'ja', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'ko', 'zh', 'other')),
  -- Cardmarket's grading scale.
  condition       text not null default 'near_mint'
                  check (condition in ('mint', 'near_mint', 'excellent', 'good', 'light_played', 'played', 'poor')),
  grading_company text check (grading_company in ('psa', 'bgs', 'cgc', 'other')),
  grade           text,
  -- In øre.
  price_paid      integer check (price_paid >= 0),
  acquired_on     text check (acquired_on glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  -- Where it's kept: "Binder 1, page 3".
  location        text,
  -- The card's story: where it came from, who gave it.
  notes           text,
  -- The card in the Pokémon's slot. Set through the set_featured_card RPC;
  -- the triggers below keep exactly one per Pokémon that has cards.
  is_featured     boolean not null default 0 check (is_featured in (0, 1)),
  created_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check (catalog_card_id is not null or name is not null),
  check ((grading_company is null) = (grade is null))
);

create index cards_pokemon_id on cards (pokemon_id);
create index cards_catalog_card_id on cards (catalog_card_id);
create unique index cards_one_featured_per_pokemon on cards (pokemon_id) where is_featured = 1;

create trigger cards_set_updated_at
after update on cards
for each row
begin
  update cards
  set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

-- The first card for a Pokémon takes its slot.
create trigger cards_feature_first
after insert on cards
for each row
when not exists (select 1 from cards where pokemon_id = new.pokemon_id and is_featured = 1)
begin
  update cards set is_featured = 1 where id = new.id;
end;

-- Deleting the featured card hands the slot to the oldest card left.
create trigger cards_refeature_after_delete
after delete on cards
for each row
when old.is_featured = 1
begin
  update cards set is_featured = 1
  where id = (
    select id from cards where pokemon_id = old.pokemon_id order by created_at, id limit 1
  );
end;

-- Moving a card to another Pokémon (sent with is_featured = 0, or the unique
-- index refuses it) may leave either Pokémon without a featured card.
create trigger cards_refeature_after_move
after update of pokemon_id on cards
for each row
when old.pokemon_id <> new.pokemon_id
begin
  update cards set is_featured = 1
  where id = new.id
    and not exists (select 1 from cards where pokemon_id = new.pokemon_id and is_featured = 1);
  update cards set is_featured = 1
  where id = (
    select id from cards where pokemon_id = old.pokemon_id order by created_at, id limit 1
  )
    and not exists (select 1 from cards where pokemon_id = old.pokemon_id and is_featured = 1);
end;

-- The Pokédex: each Pokémon with how many of its cards we own.
create view pokemon_overview as
select
  p.id,
  p.name,
  p.generation,
  p.primary_type,
  p.secondary_type,
  p.category,
  p.height_dm,
  p.weight_hg,
  p.entry,
  p.evolves_from_id,
  p.evolution_method,
  cast(count(c.id) as integer) as card_count
from pokemon p
left join cards c on c.pokemon_id = p.id
group by p.id;

-- Our cards with their catalogue details filled in, so hand-entered and
-- catalogue cards read the same.
create view owned_cards as
select
  c.id,
  c.pokemon_id,
  p.name as pokemon_name,
  p.primary_type as pokemon_type,
  c.catalog_card_id,
  cast(coalesce(cc.name, c.name) as text) as name,
  cast(coalesce(s.name, c.set_name) as text) as set_name,
  cast(coalesce(cc.local_id, c.number) as text) as number,
  s.card_count as set_card_count,
  s.series,
  s.released_on,
  cc.rarity,
  cc.illustrator,
  cc.has_normal,
  cc.has_holo,
  cc.has_reverse,
  cc.has_first_edition,
  cc.has_image,
  cast((select count(*) from catalog_card_pokemon x where x.catalog_card_id = c.catalog_card_id) as integer)
    as pokemon_count,
  c.finish,
  c.first_edition,
  c.language,
  c.condition,
  c.grading_company,
  c.grade,
  c.price_paid,
  c.acquired_on,
  c.location,
  c.notes,
  c.is_featured,
  c.created_at,
  c.updated_at
from cards c
join pokemon p on p.id = c.pokemon_id
left join catalog_cards cc on cc.id = c.catalog_card_id
left join card_sets s on s.id = cc.card_set_id;

-- A Pokémon's page in the catalogue: one row per card and Pokémon on it,
-- filtered by pokemon_id. A tag-team card's id appears once per Pokémon.
create view pokemon_catalog_cards as
select
  cc.id,
  cp.pokemon_id,
  cc.tcgdex_id,
  cc.name,
  cc.local_id,
  cc.rarity,
  cc.illustrator,
  cc.has_normal,
  cc.has_holo,
  cc.has_reverse,
  cc.has_first_edition,
  cc.has_image,
  s.name as set_name,
  s.series,
  s.released_on,
  s.card_count as set_card_count,
  cast((select count(*) from catalog_card_pokemon x where x.catalog_card_id = cc.id) as integer)
    as pokemon_count,
  cast((select count(*) from cards c where c.catalog_card_id = cc.id) as integer) as owned_count
from catalog_card_pokemon cp
join catalog_cards cc on cc.id = cp.catalog_card_id
join card_sets s on s.id = cc.card_set_id;
