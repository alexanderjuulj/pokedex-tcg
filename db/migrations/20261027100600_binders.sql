-- Virtual binders: where the cards sit, page by page, so they can be found
-- without the binder at hand. Two kinds:
-- - pokedex: a fixed pocket for every Pokémon in its range, in Pokédex order,
--   each region starting on a fresh page. A pocket holds the card in that
--   Pokémon's slot (cards.is_featured), so nothing ever moves.
-- - free: whichever cards are put in it (cards.binder_id, binder_pocket),
--   each in the first empty pocket, for extras and duplicates.

create table binders (
  id               integer primary key,
  name             text not null,
  kind             text not null check (kind in ('pokedex', 'free')),
  pockets_per_page integer not null default 9 check (pockets_per_page in (4, 9, 12)),
  first_pokemon_id integer references pokemon (id),
  last_pokemon_id  integer references pokemon (id),
  created_at       text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check ((kind = 'pokedex') = (first_pokemon_id is not null and last_pokemon_id is not null)),
  check (first_pokemon_id <= last_pokemon_id)
);

create trigger binders_set_updated_at
after update on binders
for each row
begin
  update binders
  set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

insert into binders (name, kind, first_pokemon_id, last_pokemon_id)
values ('Kanto & Johto', 'pokedex', 1, 251);

-- A card put in a free binder, and its pocket counted from the first page
-- (page and pocket on the page follow from pockets_per_page).
alter table cards add column binder_id integer references binders (id);
alter table cards add column binder_pocket integer
  check (binder_pocket >= 1 and (binder_id is null) = (binder_pocket is null));

create unique index cards_one_per_pocket on cards (binder_id, binder_pocket)
where binder_id is not null;

-- A deleted binder lets go of its cards.
create trigger binders_empty_before_delete
before delete on binders
for each row
begin
  update cards set binder_id = null, binder_pocket = null where binder_id = old.id;
end;

-- The card in a Pokémon's slot lives in that Pokémon's Pokédex binder, so it
-- leaves any free binder it was in (also when a trigger hands it the slot).
create trigger cards_featured_leaves_free_binder
after update of is_featured on cards
for each row
when new.is_featured = 1
  and new.binder_id is not null
  and exists (
    select 1 from binders b
    where b.kind = 'pokedex' and new.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
  )
begin
  update cards set binder_id = null, binder_pocket = null where id = new.id;
end;

-- Each binder with how many cards it holds.
create view binder_overview as
select
  b.id,
  b.name,
  b.kind,
  b.pockets_per_page,
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

-- Gains binder_id and binder_pocket.
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
  c.price_paid,
  c.acquired_on,
  c.location,
  c.notes,
  c.is_featured,
  c.binder_id,
  c.binder_pocket,
  c.created_at,
  c.updated_at
from cards c
join pokemon p on p.id = c.pokemon_id
left join catalog_cards cc on cc.id = c.catalog_card_id
left join card_sets s on s.id = cc.card_set_id;
