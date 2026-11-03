-- The set symbols printed on the cards, from pokemontcg.io (TCGdex lists
-- them but can't serve them). Filled by `pnpm catalog:pull`, which saves them
-- under data/catalog/sets/ beside the logos.

alter table card_sets add column has_symbol boolean not null default 0 check (has_symbol in (0, 1));

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
  cast(count(distinct cp.pokemon_id) as integer) as pokemon_count,
  cast(count(distinct case when owned.pokemon_id is null then cp.pokemon_id end) as integer)
    as missing_count
from card_sets s
join catalog_cards cc on cc.card_set_id = s.id
join catalog_card_pokemon cp on cp.catalog_card_id = cc.id
left join (select distinct pokemon_id from cards) owned on owned.pokemon_id = cp.pokemon_id
group by s.id;
