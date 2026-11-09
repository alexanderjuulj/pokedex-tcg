-- How many cards of each pack rarity a set has, for the pack odds on a
-- Pokémon's page: the share of a set's commons a pack holds says how often a
-- given common turns up. They count every card, Trainers and Energy too
-- (the catalogue keeps only the Pokémon), but only the set's main run ("4",
-- not "RC4" or "TG04", which come in their own slots) and no basic Energy
-- (its own slot too). Null until `pnpm catalog:pull` has counted them.
alter table card_sets add column common_count integer;
alter table card_sets add column uncommon_count integer;
-- Rares and holo rares: with the commons and uncommons, what a reverse holo
-- can be.
alter table card_sets add column rare_count integer;

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
