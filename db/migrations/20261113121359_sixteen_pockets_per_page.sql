-- migrate: foreign_keys off
-- Binders with 16 pockets a page (4 × 4), like Vault X's 16-pocket zip
-- binder: 1,088 cards, the whole National Pokédex in one binder.
--
-- SQLite can't change a check, so the table is rebuilt the way SQLite's docs
-- do it (see the pokedex-beyond-johto migration): with foreign keys off (the
-- first line; db/cli.ts checks every reference before it commits), a copy
-- under a new name takes the old one's place. legacy_alter_table leaves the
-- views and the cards' triggers alone; they find the new table under the old
-- name. The binders' own triggers go with the old table, so they're made
-- again below, as they were.
pragma legacy_alter_table = on;

create table binders_new (
  id               integer primary key,
  name             text not null,
  kind             text not null check (kind in ('pokedex', 'free')),
  pockets_per_page integer not null default 9 check (pockets_per_page in (4, 9, 12, 16)),
  first_pokemon_id integer references pokemon (id),
  last_pokemon_id  integer references pokemon (id),
  created_at       text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  page_count       integer check (page_count >= 1),
  finished_on      text
    check (
      finished_on is null
      or (kind = 'pokedex' and finished_on glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
    ),
  pokemon_type     text
    check (
      pokemon_type is null
      or (
        kind = 'pokedex'
        and pokemon_type in (
          'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
          'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
        )
      )
    ),
  pokemon_class    text
    check (
      pokemon_class is null
      or (kind = 'pokedex' and pokemon_class in ('legendary', 'mythical', 'ultra_beast', 'paradox', 'starter'))
    ),
  region_pages     boolean not null default 1 check (region_pages in (0, 1)),
  check ((kind = 'pokedex') = (first_pokemon_id is not null and last_pokemon_id is not null)),
  check (first_pokemon_id <= last_pokemon_id)
);

insert into binders_new (
  id, name, kind, pockets_per_page, first_pokemon_id, last_pokemon_id, created_at, updated_at,
  page_count, finished_on, pokemon_type, pokemon_class, region_pages
)
select
  id, name, kind, pockets_per_page, first_pokemon_id, last_pokemon_id, created_at, updated_at,
  page_count, finished_on, pokemon_type, pokemon_class, region_pages
from binders;

drop table binders;
alter table binders_new rename to binders;
pragma legacy_alter_table = off;

create trigger binders_set_updated_at
after update on binders
for each row
begin
  update binders
  set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

-- A new Pokédex binder takes its Pokémon's cards in: from outside the
-- binders and out of free binders (a graded one fills its pocket from
-- outside).
create trigger binders_take_their_cards_in
after insert on binders
for each row
when new.kind = 'pokedex'
begin
  update cards
  set binder_id = new.id, binder_pocket = null, kept_outside = (grading_company is not null)
  where id in (
    select (
      select c.id from cards c
      where c.pokemon_id = bp.pokemon_id
        and c.gone_on is null
        and (c.binder_id is null or exists (select 1 from binders f where f.id = c.binder_id and f.kind = 'free'))
      order by c.created_at, c.id
      limit 1
    )
    from binder_pokemon bp
    where bp.binder_id = new.id
  );
end;

create trigger binders_empty_before_delete
before delete on binders
for each row
begin
  update cards set binder_id = null, binder_pocket = null, kept_outside = 1 where binder_id = old.id;
end;

-- A binder keeps its kind and its Pokémon: its pockets hold cards.
create trigger binders_keep_their_pokemon
before update of kind, first_pokemon_id, last_pokemon_id, pokemon_type, pokemon_class on binders
for each row
when old.kind is not new.kind
  or old.first_pokemon_id is not new.first_pokemon_id
  or old.last_pokemon_id is not new.last_pokemon_id
  or old.pokemon_type is not new.pokemon_type
  or old.pokemon_class is not new.pokemon_class
begin
  select raise(abort, 'A binder keeps its kind and its Pokémon');
end;
