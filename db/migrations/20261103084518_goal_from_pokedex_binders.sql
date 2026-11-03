-- The goal is no longer fixed at Kanto and Johto (#1–251): it's whatever the
-- Pokédex binders cover. They're made in the first-run setup (/setup), where
-- the regions to collect are split over binders of the size picked, and more
-- can be added later. A collection that already has cards keeps its Kanto &
-- Johto binder, and with it the same goal.

-- How many pages the binder has, when known: the setup fills binders of that
-- size. Null for the binders made before it.
alter table binders add column page_count integer check (page_count >= 1);

-- A fresh database starts without a Pokédex binder, so the app opens on the
-- setup (the binders migration made Kanto & Johto for every database).
delete from binders where kind = 'pokedex' and not exists (select 1 from cards);

-- One pocket per Pokémon across all Pokédex binders: their ranges never
-- overlap.
create trigger binders_pokedex_no_overlap_insert
before insert on binders
for each row
when new.kind = 'pokedex' and exists (
  select 1 from binders b
  where b.kind = 'pokedex'
    and new.first_pokemon_id <= b.last_pokemon_id
    and new.last_pokemon_id >= b.first_pokemon_id
)
begin
  select raise(abort, 'Another Pokédex binder already keeps a pocket for some of these Pokémon');
end;

create trigger binders_pokedex_no_overlap_update
before update of kind, first_pokemon_id, last_pokemon_id on binders
for each row
when new.kind = 'pokedex' and exists (
  select 1 from binders b
  where b.kind = 'pokedex'
    and b.id <> new.id
    and new.first_pokemon_id <= b.last_pokemon_id
    and new.last_pokemon_id >= b.first_pokemon_id
)
begin
  select raise(abort, 'Another Pokédex binder already keeps a pocket for some of these Pokémon');
end;

-- A new Pokédex binder takes the cards in its Pokémon's slots out of any free
-- binder: from now on they live in its pockets (as cards_featured_leaves_free_binder
-- does for a card that takes a slot).
create trigger binders_pokedex_takes_its_slots_insert
after insert on binders
for each row
when new.kind = 'pokedex'
begin
  update cards set binder_id = null, binder_pocket = null
  where is_featured = 1
    and binder_id is not null
    and pokemon_id between new.first_pokemon_id and new.last_pokemon_id;
end;

create trigger binders_pokedex_takes_its_slots_update
after update of kind, first_pokemon_id, last_pokemon_id on binders
for each row
when new.kind = 'pokedex'
begin
  update cards set binder_id = null, binder_pocket = null
  where is_featured = 1
    and binder_id is not null
    and pokemon_id between new.first_pokemon_id and new.last_pokemon_id;
end;

-- Gains page_count.
drop view binder_overview;

create view binder_overview as
select
  b.id,
  b.name,
  b.kind,
  b.pockets_per_page,
  b.page_count,
  b.first_pokemon_id,
  b.last_pokemon_id,
  b.created_at,
  b.updated_at,
  cast(
    case b.kind
      when 'pokedex' then (
        select count(*) from cards c
        where c.is_featured = 1 and c.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
      )
      else (select count(*) from cards c where c.binder_id = b.id)
    end as integer
  ) as card_count
from binders b;

-- A set's counts are about the goal: the Pokémon it holds that a Pokédex
-- binder keeps a pocket for, and how many of them have no card yet. The
-- ranges don't overlap, so each Pokémon joins at most one binder.
drop view set_overview;

create view set_overview as
select
  s.id,
  s.tcgdex_id,
  s.name,
  s.series,
  s.released_on,
  s.card_count,
  s.in_boosters,
  s.has_logo,
  s.has_symbol,
  cast(count(distinct case when goal.id is not null then cp.pokemon_id end) as integer)
    as pokemon_count,
  cast(
    count(distinct case when goal.id is not null and owned.pokemon_id is null then cp.pokemon_id end)
    as integer
  ) as missing_count
from card_sets s
join catalog_cards cc on cc.card_set_id = s.id
join catalog_card_pokemon cp on cp.catalog_card_id = cc.id
left join binders goal
  on goal.kind = 'pokedex'
  and cp.pokemon_id between goal.first_pokemon_id and goal.last_pokemon_id
left join (select distinct pokemon_id from cards) owned on owned.pokemon_id = cp.pokemon_id
group by s.id;
