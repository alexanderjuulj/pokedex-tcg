-- The Sets page: which sets hold the Pokémon still missing, with their logos.
-- The new columns are filled by `pnpm catalog:pull`, which also saves the
-- logos under data/catalog/sets/.

-- Where TCGdex keeps the logo (null: it has none, mostly promos), and whether
-- this machine has saved it.
alter table card_sets add column logo_url text;
alter table card_sets add column has_logo boolean not null default 0 check (has_logo in (0, 1));
-- Whether its cards come in booster packs. Promos, McDonald's, trainer kits,
-- POP and jumbo cards don't.
alter table card_sets add column in_boosters boolean not null default 1 check (in_boosters in (0, 1));

-- Every set with a Pokémon from #1–251, and how many of them it holds that
-- have no card in the collection yet.
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
  cast(count(distinct cp.pokemon_id) as integer) as pokemon_count,
  cast(count(distinct case when owned.pokemon_id is null then cp.pokemon_id end) as integer)
    as missing_count
from card_sets s
join catalog_cards cc on cc.card_set_id = s.id
join catalog_card_pokemon cp on cp.catalog_card_id = cc.id
left join (select distinct pokemon_id from cards) owned on owned.pokemon_id = cp.pokemon_id
group by s.id;

-- Gains card_set_id, for a set's page.
drop view pokemon_catalog_cards;

create view pokemon_catalog_cards as
select
  cc.id,
  cp.pokemon_id,
  cc.card_set_id,
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
