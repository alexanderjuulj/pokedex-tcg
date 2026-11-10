-- What a Pokémon of the goal cost: next to slot_count (the cards pulled that
-- hold a Pokémon's slot, from any region), goal_count counts those of the
-- goal's Pokémon, the ones a Pokédex binder keeps a pocket for.

drop view purchase_overview;
drop view purchase_item_overview;

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
  cast(
    (
      select count(*) from cards c
      where c.purchase_item_id = i.id
        and c.is_featured = 1
        and exists (
          select 1 from binders b
          where b.kind = 'pokedex' and c.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
        )
    ) as integer
  ) as goal_count,
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
  cast(
    (
      select count(*) from cards c join purchase_items x on x.id = c.purchase_item_id
      where x.purchase_id = p.id
        and c.is_featured = 1
        and exists (
          select 1 from binders b
          where b.kind = 'pokedex' and c.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
        )
    ) as integer
  ) as goal_count,
  p.created_at,
  p.updated_at
from purchases p
left join purchase_items i on i.purchase_id = p.id
group by p.id;
