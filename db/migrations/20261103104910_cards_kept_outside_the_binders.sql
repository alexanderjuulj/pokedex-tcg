-- Any card can be kept outside the binders: a top loader, a slab, a box,
-- with `location` saying where. kept_outside is 1 for every card in no
-- pocket. For the card in a Pokémon's slot it means the slot is still held
-- (the Pokémon is caught) but its pocket in the Pokédex binder is empty, and
-- waits for a loose card. Graded cards were the first case (a slab doesn't
-- fit in a pocket); now they're one of them. A card kept outside is in no
-- free binder either.

alter table cards add column kept_outside boolean not null default 0
  check (kept_outside in (0, 1) and (kept_outside = 0 or binder_id is null));

-- Every card in no pocket today: in no free binder, and not in a Pokédex
-- pocket (not the slot card, a graded one, or one no Pokédex binder covers).
update cards set kept_outside = 1
where binder_id is null
  and (
    is_featured = 0
    or grading_company is not null
    or not exists (
      select 1 from binders b
      where b.kind = 'pokedex' and cards.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
    )
  );

-- A deleted free binder's cards are kept outside, wherever they go.
drop trigger binders_empty_before_delete;

create trigger binders_empty_before_delete
before delete on binders
for each row
begin
  update cards set binder_id = null, binder_pocket = null, kept_outside = 1 where binder_id = old.id;
end;

-- A new Pokédex binder (or one that grows) takes its Pokémon's slot cards
-- into its pockets: out of any free binder, as before, and in from outside,
-- unless they're graded (a slab doesn't fit in a pocket). Only for the
-- Pokémon it didn't cover yet, so editing a binder never pulls a card back in
-- that was taken out on purpose.
drop trigger binders_pokedex_takes_its_slots_insert;

create trigger binders_pokedex_takes_its_slots_insert
after insert on binders
for each row
when new.kind = 'pokedex'
begin
  update cards set binder_id = null, binder_pocket = null, kept_outside = 0
  where is_featured = 1
    and grading_company is null
    and (binder_id is not null or kept_outside = 1)
    and pokemon_id between new.first_pokemon_id and new.last_pokemon_id;
end;

drop trigger binders_pokedex_takes_its_slots_update;

create trigger binders_pokedex_takes_its_slots_update
after update of kind, first_pokemon_id, last_pokemon_id on binders
for each row
when new.kind = 'pokedex'
begin
  update cards set binder_id = null, binder_pocket = null, kept_outside = 0
  where is_featured = 1
    and grading_company is null
    and (binder_id is not null or kept_outside = 1)
    and pokemon_id between new.first_pokemon_id and new.last_pokemon_id
    and not (old.kind = 'pokedex' and pokemon_id between old.first_pokemon_id and old.last_pokemon_id);
end;

drop view owned_cards;

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
  c.acquired_on,
  c.location,
  c.notes,
  c.is_featured,
  c.binder_id,
  c.binder_pocket,
  c.kept_outside,
  c.created_at,
  c.updated_at
from cards c
join pokemon p on p.id = c.pokemon_id
left join catalog_cards cc on cc.id = c.catalog_card_id
left join card_sets s on s.id = cc.card_set_id;

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
        where c.is_featured = 1
          and c.kept_outside = 0
          and c.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
      )
      else (select count(*) from cards c where c.binder_id = b.id)
    end as integer
  ) as card_count
from binders b;
