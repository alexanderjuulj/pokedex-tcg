-- A Pokédex binder can keep its pockets for the Pokémon of a type ("every
-- Water Pokémon") or a class (the starters, the legendaries) instead of
-- every Pokémon of its range: the range still bounds it (1–1025 for every
-- region, 1–251 for Kanto and Johto's). Binders may now share Pokémon: each
-- keeps its own card in its pocket (the pockets-per-binder migration), so a
-- Water binder needs its own Squirtle beside Kanto's.
--
-- region_pages: each region starts on a fresh page, as region binders always
-- have; a type or class binder runs straight through by default.
--
-- "You need" is now an empty pocket in a binder still being collected: a
-- Pokémon owned only in another binder's pocket is still needed by this one.

alter table binders add column pokemon_type text
  check (
    pokemon_type is null
    or (
      kind = 'pokedex'
      and pokemon_type in (
        'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
        'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
      )
    )
  );
alter table binders add column pokemon_class text
  check (
    pokemon_class is null
    or (kind = 'pokedex' and pokemon_class in ('legendary', 'mythical', 'ultra_beast', 'paradox', 'starter'))
  );
alter table binders add column region_pages boolean not null default 1 check (region_pages in (0, 1));

drop trigger binders_pokedex_no_overlap_insert;
drop trigger binders_pokedex_no_overlap_update;

-- A binder keeps its kind and its Pokémon: its pockets hold cards.
drop trigger binders_keep_their_pokemon;

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

-- The Pokémon each Pokédex binder keeps a pocket for: of its range, the ones
-- of its type and class, if it has one. The triggers and views go through
-- this one view; keepsPocketFor (features/binders/layout.ts) mirrors it.
drop view binder_pokemon;

create view binder_pokemon as
select b.id as binder_id, p.id as pokemon_id
from binders b
join pokemon p on p.id between b.first_pokemon_id and b.last_pokemon_id
where b.kind = 'pokedex'
  and (b.pokemon_type is null or p.primary_type = b.pokemon_type or p.secondary_type = b.pokemon_type)
  and (b.pokemon_class is null or p.class = b.pokemon_class);

-- Every Pokédex binder's pockets, each with the card filling it (none: an
-- empty pocket). Kept outside, the card fills it from a top loader.
create view pokedex_pockets as
select
  bp.binder_id,
  bp.pokemon_id,
  b.finished_on,
  c.id as card_id,
  c.kept_outside
from binder_pokemon bp
join binders b on b.id = bp.binder_id
left join cards c on c.binder_id = bp.binder_id and c.pokemon_id = bp.pokemon_id;

-- A binder with its rule, and for a Pokédex binder how many Pokémon it keeps
-- a pocket for.
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
  b.pokemon_type,
  b.pokemon_class,
  b.region_pages,
  b.finished_on,
  b.created_at,
  b.updated_at,
  cast(
    case b.kind
      when 'pokedex' then (select count(*) from cards c where c.binder_id = b.id and c.kept_outside = 0)
      else (select count(*) from cards c where c.binder_id = b.id)
    end as integer
  ) as card_count,
  cast(
    case b.kind
      when 'pokedex' then (select count(*) from cards c where c.binder_id = b.id)
    end as integer
  ) as caught_count,
  cast(
    case b.kind
      when 'pokedex' then (select count(*) from binder_pokemon bp where bp.binder_id = b.id)
    end as integer
  ) as pokemon_count
from binders b;

-- A set's Pokémon the binders being collected keep a pocket for, and the
-- ones with an empty pocket there: each Pokémon once, however many binders
-- need it (one card fills one pocket).
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
  s.common_count,
  s.uncommon_count,
  s.rare_count,
  cast(count(distinct case when goal.binder_id is not null then cp.pokemon_id end) as integer)
    as pokemon_count,
  cast(
    count(distinct case when goal.binder_id is not null and goal.card_id is null then cp.pokemon_id end)
    as integer
  ) as missing_count
from card_sets s
join catalog_cards cc on cc.card_set_id = s.id
join catalog_card_pokemon cp on cp.catalog_card_id = cc.id
left join pokedex_pockets goal
  on goal.pokemon_id = cp.pokemon_id and goal.finished_on is null
group by s.id;
