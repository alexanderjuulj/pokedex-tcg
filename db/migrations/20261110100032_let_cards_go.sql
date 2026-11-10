-- A card can leave the collection: sold, given away or traded. It isn't
-- deleted. It stays on record, with the purchase it was pulled from and what
-- it sold for, but it no longer counts: not for its Pokémon, a set's "you
-- need", or a binder. A card that goes leaves its slot and its pocket, and
-- the triggers hand the slot to the oldest card of its Pokémon still here,
-- as when one is deleted. A card brought back takes the slot if its Pokémon
-- has none.

alter table cards add column gone_on text
  check (
    gone_on is null
    or (
      gone_on glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      and is_featured = 0
      and binder_id is null
      and kept_outside = 1
    )
  );
alter table cards add column gone_how text
  check ((gone_how is null) = (gone_on is null) and (gone_how is null or gone_how in ('sold', 'given', 'traded')));
-- Who or where it went: a friend, a buyer on Cardmarket.
alter table cards add column gone_to text;
-- In hundredths of the collection's currency, like the purchases.
alter table cards add column sold_for integer
  check (sold_for is null or (sold_for >= 0 and gone_how = 'sold'));

create index cards_gone_on on cards (gone_on);

-- The slot triggers pick among the cards still here.

drop trigger cards_feature_first;

create trigger cards_feature_first
after insert on cards
for each row
when new.gone_on is null
  and not exists (select 1 from cards where pokemon_id = new.pokemon_id and is_featured = 1)
begin
  update cards set is_featured = 1 where id = new.id;
end;

drop trigger cards_refeature_after_delete;

create trigger cards_refeature_after_delete
after delete on cards
for each row
when old.is_featured = 1
begin
  update cards set is_featured = 1
  where id = (
    select id from cards
    where pokemon_id = old.pokemon_id and gone_on is null
    order by created_at, id limit 1
  );
end;

drop trigger cards_refeature_after_move;

create trigger cards_refeature_after_move
after update of pokemon_id on cards
for each row
when old.pokemon_id <> new.pokemon_id
begin
  update cards set is_featured = 1
  where id = new.id
    and gone_on is null
    and not exists (select 1 from cards where pokemon_id = new.pokemon_id and is_featured = 1);
  update cards set is_featured = 1
  where id = (
    select id from cards
    where pokemon_id = old.pokemon_id and gone_on is null
    order by created_at, id limit 1
  )
    and not exists (select 1 from cards where pokemon_id = old.pokemon_id and is_featured = 1);
end;

-- Going: the update itself takes the card out of its slot and pocket (the
-- gone_on check insists), and this hands the slot on.
create trigger cards_refeature_after_going
after update of gone_on on cards
for each row
when old.gone_on is null and new.gone_on is not null and old.is_featured = 1
begin
  update cards set is_featured = 1
  where id = (
    select id from cards
    where pokemon_id = new.pokemon_id and gone_on is null
    order by created_at, id limit 1
  );
end;

-- Coming back: kept outside the binders (put it in one from its page), or,
-- when its Pokémon has no card left, in the slot, and into its pocket when a
-- Pokédex binder covers it and it isn't graded.
create trigger cards_feature_after_return
after update of gone_on on cards
for each row
when old.gone_on is not null
  and new.gone_on is null
  and not exists (select 1 from cards where pokemon_id = new.pokemon_id and is_featured = 1)
begin
  update cards
  set is_featured = 1,
      kept_outside = case
        when grading_company is null and exists (
          select 1 from binders b
          where b.kind = 'pokedex' and new.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
        ) then 0
        else 1
      end
  where id = new.id;
end;

-- Every card, here or gone, for a card's page and a purchase's cards; the
-- collection (owned_cards) and the ones let go (gone_cards) are its halves.
drop view owned_cards;

create view card_details as
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
  c.purchase_item_id,
  pi.purchase_id,
  c.gone_on,
  c.gone_how,
  c.gone_to,
  c.sold_for,
  c.created_at,
  c.updated_at
from cards c
join pokemon p on p.id = c.pokemon_id
left join catalog_cards cc on cc.id = c.catalog_card_id
left join card_sets s on s.id = cc.card_set_id
left join purchase_items pi on pi.id = c.purchase_item_id;

create view owned_cards as
select * from card_details where gone_on is null;

create view gone_cards as
select * from card_details where gone_on is not null;

-- What counts is the collection.

drop view pokemon_overview;

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
  p.class,
  cast(count(c.id) as integer) as card_count
from pokemon p
left join cards c on c.pokemon_id = p.id and c.gone_on is null
group by p.id;

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
  cast((select count(*) from cards c where c.catalog_card_id = cc.id and c.gone_on is null) as integer)
    as owned_count
from catalog_card_pokemon cp
join catalog_cards cc on cc.id = cp.catalog_card_id
join card_sets s on s.id = cc.card_set_id;

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
left join (select distinct pokemon_id from cards where gone_on is null) owned
  on owned.pokemon_id = cp.pokemon_id
group by s.id;
