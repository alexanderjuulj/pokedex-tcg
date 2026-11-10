-- What the cards have cost: a purchase is a visit to a shop or an online
-- order, with its shipping and a line for each product in it (3 boosters of a
-- set, an Elite Trainer Box). Amounts are in øre. The shipping is shared by
-- the lines in proportion to their price, and a card can say which line it
-- was pulled from. The save_purchase RPC writes a purchase and its lines
-- together.

create table purchases (
  id         integer primary key,
  bought_on  text not null check (bought_on glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  -- Where: a shop, a web shop, a market.
  shop       text,
  -- 0 when it was bought over the counter.
  shipping   integer not null default 0 check (shipping >= 0),
  notes      text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create trigger purchases_set_updated_at
after update on purchases
for each row
begin
  update purchases
  set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

create table purchase_items (
  id          integer primary key,
  purchase_id integer not null references purchases (id) on delete cascade,
  product     text not null
              check (product in ('booster', 'blister', 'bundle', 'elite_trainer_box', 'booster_box', 'tin', 'collection_box', 'other')),
  -- The set its packs are from. A mix (a tin of several sets, a bag of bulk)
  -- has none, and its name says what it is.
  card_set_id integer references card_sets (id),
  name        text,
  quantity    integer not null default 1 check (quantity >= 1),
  -- Each.
  unit_price  integer not null check (unit_price >= 0),
  -- Booster packs in each: 1 for a booster, 9 in an Elite Trainer Box.
  packs       integer not null default 1 check (packs >= 0),
  created_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check (card_set_id is not null or name is not null)
);

create index purchase_items_purchase_id on purchase_items (purchase_id);
create index purchase_items_card_set_id on purchase_items (card_set_id);

create trigger purchase_items_set_updated_at
after update on purchase_items
for each row
begin
  update purchase_items
  set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

-- The line a card was pulled from. A deleted line (or purchase) leaves its
-- cards in the collection, saying nothing about where they came from.
alter table cards add column purchase_item_id integer references purchase_items (id) on delete set null;

create index cards_purchase_item_id on cards (purchase_item_id);

-- Each line with its share of the shipping (by price, or evenly when its
-- purchase cost nothing but the shipping), what it cost with it, and the
-- cards pulled from it. slot_count: those in a Pokémon's slot.
create view purchase_item_overview as
select
  i.id,
  i.purchase_id,
  p.bought_on,
  p.shop,
  i.product,
  i.card_set_id,
  s.name as set_name,
  s.has_logo,
  i.name,
  i.quantity,
  i.unit_price,
  i.packs,
  cast(i.quantity * i.packs as integer) as pack_count,
  cast(i.quantity * i.unit_price as integer) as price,
  cast(
    round(
      p.shipping * case
        when t.price > 0 then 1.0 * i.quantity * i.unit_price / t.price
        else 1.0 / t.line_count
      end
    ) as integer
  ) as shipping_share,
  cast(
    i.quantity * i.unit_price + round(
      p.shipping * case
        when t.price > 0 then 1.0 * i.quantity * i.unit_price / t.price
        else 1.0 / t.line_count
      end
    ) as integer
  ) as cost,
  cast((select count(*) from cards c where c.purchase_item_id = i.id) as integer) as card_count,
  cast((select count(*) from cards c where c.purchase_item_id = i.id and c.is_featured = 1) as integer)
    as slot_count,
  i.created_at,
  i.updated_at
from purchase_items i
join purchases p on p.id = i.purchase_id
join (
  select purchase_id, sum(quantity * unit_price) as price, count(*) as line_count
  from purchase_items
  group by purchase_id
) t on t.purchase_id = i.purchase_id
left join card_sets s on s.id = i.card_set_id;

-- Each purchase with its totals: what the lines cost, with the shipping, the
-- packs in it and the cards pulled from it.
create view purchase_overview as
select
  p.id,
  p.bought_on,
  p.shop,
  p.shipping,
  p.notes,
  cast(coalesce(sum(i.quantity * i.unit_price), 0) as integer) as price,
  cast(coalesce(sum(i.quantity * i.unit_price), 0) + p.shipping as integer) as total,
  cast(coalesce(sum(i.quantity * i.packs), 0) as integer) as pack_count,
  cast(count(i.id) as integer) as item_count,
  cast(
    (select count(*) from cards c join purchase_items x on x.id = c.purchase_item_id where x.purchase_id = p.id)
    as integer
  ) as card_count,
  cast(
    (
      select count(*) from cards c join purchase_items x on x.id = c.purchase_item_id
      where x.purchase_id = p.id and c.is_featured = 1
    ) as integer
  ) as slot_count,
  p.created_at,
  p.updated_at
from purchases p
left join purchase_items i on i.purchase_id = p.id
group by p.id;

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
  c.purchase_item_id,
  pi.purchase_id,
  c.created_at,
  c.updated_at
from cards c
join pokemon p on p.id = c.pokemon_id
left join catalog_cards cc on cc.id = c.catalog_card_id
left join card_sets s on s.id = cc.card_set_id
left join purchase_items pi on pi.id = c.purchase_item_id;
