-- With the whole Pokédex in the catalogue, a set's counts stay about the
-- goal: the Pokémon of Kanto and Johto (#1–251) it holds, and how many of
-- them have no card yet. A set of only other regions' Pokémon counts 0.

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
  cast(count(distinct case when cp.pokemon_id <= 251 then cp.pokemon_id end) as integer)
    as pokemon_count,
  cast(
    count(distinct case when cp.pokemon_id <= 251 and owned.pokemon_id is null then cp.pokemon_id end)
    as integer
  ) as missing_count
from card_sets s
join catalog_cards cc on cc.card_set_id = s.id
join catalog_card_pokemon cp on cp.catalog_card_id = cc.id
left join (select distinct pokemon_id from cards) owned on owned.pokemon_id = cp.pokemon_id
group by s.id;
