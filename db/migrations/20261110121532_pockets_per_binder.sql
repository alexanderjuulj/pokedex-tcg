-- Each binder's pockets hold their own cards. Until now a Pokémon had one
-- slot card in the whole collection (is_featured), and a Pokédex binder's
-- pockets showed those. Now a card records the binder it's in, Pokédex
-- binders too: in a free binder its pocket number, in a Pokédex binder its
-- Pokémon's pocket (binder_pocket null), at most one card each. That lets
-- two binders keep a pocket for the same Pokémon, each with its own card (a
-- Water binder's Squirtle besides Kanto's), which the next steps build on.
--
-- Nothing changes on screen: the slot cards move into their binders'
-- pockets, and the triggers below do what the slot triggers did: a
-- Pokémon's first card fills its pocket, a pocket whose card is deleted, let
-- go or moved to another Pokémon goes to the oldest card of that Pokémon in
-- no Pokédex binder, a card brought back fills an empty pocket, and a new
-- Pokédex binder takes its Pokémon's cards in. Which Pokémon a Pokédex
-- binder keeps pockets for is one view, binder_pokemon.
--
-- cards is rebuilt to drop is_featured and change the pocket checks, as
-- SQLite's docs do it; the views that name is_featured are made again.

drop view owned_cards;
drop view gone_cards;
drop view card_details;
drop view binder_overview;
drop view purchase_overview;
drop view purchase_item_overview;

drop trigger binders_pokedex_takes_its_slots_insert;
drop trigger binders_pokedex_takes_its_slots_update;
drop trigger binders_empty_before_delete;
drop trigger binders_pokedex_empty_before_delete;

pragma legacy_alter_table = on;

create table cards_new (
  id               integer primary key,
  pokemon_id       integer not null references pokemon (id),
  catalog_card_id  integer references catalog_cards (id),
  -- Only for cards entered by hand: catalogue cards take these from there.
  name             text,
  set_name         text,
  number           text,
  finish           text not null default 'normal'
                   check (finish in ('normal', 'holo', 'reverse_holo')),
  first_edition    boolean not null default 0 check (first_edition in (0, 1)),
  language         text not null default 'en'
                   check (language in ('en', 'ja', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'ko', 'zh', 'other')),
  -- Cardmarket's grading scale.
  condition        text not null default 'near_mint'
                   check (condition in ('mint', 'near_mint', 'excellent', 'good', 'light_played', 'played', 'poor')),
  grading_company  text check (grading_company in ('psa', 'bgs', 'cgc', 'other')),
  grade            text,
  acquired_on      text check (acquired_on glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  -- Where it's kept outside the binders: a top loader, a box.
  location         text,
  -- The card's story: where it came from, who gave it.
  notes            text,
  -- The binder it's in. In a free binder binder_pocket says which pocket; in
  -- a Pokédex binder it's its Pokémon's pocket, and binder_pocket is null.
  -- The cards_check_place triggers check it fits.
  binder_id        integer references binders (id),
  binder_pocket    integer check (binder_pocket is null or (binder_pocket >= 1 and binder_id is not null)),
  -- Not in a pocket: in no binder, or holding its Pokémon's pocket in a
  -- Pokédex binder from outside it (a top loader, a slab), so the pocket
  -- shows empty but the card still fills it.
  kept_outside     boolean not null default 1
                   check (kept_outside in (0, 1) and (kept_outside = 1 or binder_id is not null)),
  purchase_item_id integer references purchase_items (id) on delete set null,
  -- Sold, given away or traded: out of the collection, kept on record.
  gone_on          text
                   check (
                     gone_on is null
                     or (
                       gone_on glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
                       and binder_id is null
                       and kept_outside = 1
                     )
                   ),
  gone_how         text
                   check ((gone_how is null) = (gone_on is null) and (gone_how is null or gone_how in ('sold', 'given', 'traded'))),
  gone_to          text,
  sold_for         integer check (sold_for is null or (sold_for >= 0 and gone_how = 'sold')),
  created_at       text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  check (catalog_card_id is not null or name is not null),
  check ((grading_company is null) = (grade is null))
);

-- A slot card covered by a Pokédex binder goes in that binder's pocket, held
-- from outside when it was kept outside. A card in no pocket is kept outside.
insert into cards_new (
  id, pokemon_id, catalog_card_id, name, set_name, number, finish, first_edition, language,
  condition, grading_company, grade, acquired_on, location, notes, binder_id, binder_pocket,
  kept_outside, purchase_item_id, gone_on, gone_how, gone_to, sold_for, created_at, updated_at
)
select
  c.id, c.pokemon_id, c.catalog_card_id, c.name, c.set_name, c.number, c.finish, c.first_edition,
  c.language, c.condition, c.grading_company, c.grade, c.acquired_on, c.location, c.notes,
  case when c.is_featured = 1 and pb.id is not null then pb.id else c.binder_id end,
  case when c.is_featured = 1 and pb.id is not null then null else c.binder_pocket end,
  case
    when c.is_featured = 1 and pb.id is not null then c.kept_outside
    when c.binder_id is not null then c.kept_outside
    else 1
  end,
  c.purchase_item_id, c.gone_on, c.gone_how, c.gone_to, c.sold_for, c.created_at, c.updated_at
from cards c
left join binders pb
  on pb.kind = 'pokedex' and c.pokemon_id between pb.first_pokemon_id and pb.last_pokemon_id;

drop table cards;
alter table cards_new rename to cards;

pragma legacy_alter_table = off;

create index cards_pokemon_id on cards (pokemon_id);
create index cards_catalog_card_id on cards (catalog_card_id);
create index cards_purchase_item_id on cards (purchase_item_id);
create index cards_gone_on on cards (gone_on);
-- One card per pocket: a free binder's by number, a Pokédex binder's by
-- Pokémon.
create unique index cards_one_per_pocket on cards (binder_id, binder_pocket)
where binder_pocket is not null;
create unique index cards_one_per_pokedex_pocket on cards (binder_id, pokemon_id)
where binder_id is not null and binder_pocket is null;

create trigger cards_set_updated_at
after update on cards
for each row
begin
  update cards
  set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

-- The Pokémon each Pokédex binder keeps a pocket for: its range of the
-- Pokédex, for now.
create view binder_pokemon as
select b.id as binder_id, p.id as pokemon_id
from binders b
join pokemon p on p.id between b.first_pokemon_id and b.last_pokemon_id
where b.kind = 'pokedex';

-- A card in a free binder is in one of its pockets; a card in a Pokédex
-- binder is in its Pokémon's pocket there.
create trigger cards_check_place_insert
before insert on cards
for each row
when new.binder_id is not null
begin
  select raise(abort, 'A card in a free binder needs its pocket')
  where exists (select 1 from binders b where b.id = new.binder_id and b.kind = 'free')
    and (new.binder_pocket is null or new.kept_outside = 1);
  select raise(abort, 'That Pokédex binder keeps no pocket for this Pokémon')
  where exists (select 1 from binders b where b.id = new.binder_id and b.kind = 'pokedex')
    and (
      new.binder_pocket is not null
      or not exists (
        select 1 from binder_pokemon bp
        where bp.binder_id = new.binder_id and bp.pokemon_id = new.pokemon_id
      )
    );
end;

create trigger cards_check_place_update
before update of binder_id, binder_pocket, kept_outside, pokemon_id on cards
for each row
when new.binder_id is not null
begin
  select raise(abort, 'A card in a free binder needs its pocket')
  where exists (select 1 from binders b where b.id = new.binder_id and b.kind = 'free')
    and (new.binder_pocket is null or new.kept_outside = 1);
  select raise(abort, 'That Pokédex binder keeps no pocket for this Pokémon')
  where exists (select 1 from binders b where b.id = new.binder_id and b.kind = 'pokedex')
    and (
      new.binder_pocket is not null
      or not exists (
        select 1 from binder_pokemon bp
        where bp.binder_id = new.binder_id and bp.pokemon_id = new.pokemon_id
      )
    );
end;

-- A card added in no binder fills its Pokémon's empty pocket in a Pokédex
-- binder, if there is one (it's the Pokémon's first card, or the others are
-- all in Pokédex binders), from wherever it's kept: one being collected
-- first.
create trigger cards_fill_pocket_after_insert
after insert on cards
for each row
when new.binder_id is null and new.gone_on is null
begin
  update cards
  set binder_id = (
    select bp.binder_id from binder_pokemon bp join binders b on b.id = bp.binder_id
    where bp.pokemon_id = new.pokemon_id
      and not exists (select 1 from cards c where c.binder_id = bp.binder_id and c.pokemon_id = new.pokemon_id)
    order by b.finished_on is not null, b.id
    limit 1
  )
  where id = new.id
    and exists (
      select 1 from binder_pokemon bp
      where bp.pokemon_id = new.pokemon_id
        and not exists (select 1 from cards c where c.binder_id = bp.binder_id and c.pokemon_id = new.pokemon_id)
    );
end;

-- A Pokédex pocket whose card is deleted, let go or moved to another Pokémon
-- goes to the oldest card of that Pokémon in no Pokédex binder: out of a
-- free binder into the pocket, or held from outside if it's kept outside.
create trigger cards_refill_pocket_after_delete
after delete on cards
for each row
when old.binder_id is not null
  and exists (select 1 from binders b where b.id = old.binder_id and b.kind = 'pokedex')
begin
  update cards set binder_id = old.binder_id, binder_pocket = null
  where id = (
    select c.id from cards c
    where c.pokemon_id = old.pokemon_id
      and c.gone_on is null
      and (c.binder_id is null or exists (select 1 from binders f where f.id = c.binder_id and f.kind = 'free'))
    order by c.created_at, c.id
    limit 1
  );
end;

create trigger cards_refill_pocket_after_going
after update of gone_on on cards
for each row
when old.gone_on is null
  and new.gone_on is not null
  and old.binder_id is not null
  and exists (select 1 from binders b where b.id = old.binder_id and b.kind = 'pokedex')
begin
  update cards set binder_id = old.binder_id, binder_pocket = null
  where id = (
    select c.id from cards c
    where c.pokemon_id = old.pokemon_id
      and c.gone_on is null
      and (c.binder_id is null or exists (select 1 from binders f where f.id = c.binder_id and f.kind = 'free'))
    order by c.created_at, c.id
    limit 1
  );
end;

create trigger cards_refill_pocket_after_move
after update of pokemon_id on cards
for each row
when old.pokemon_id <> new.pokemon_id
  and old.binder_id is not null
  and exists (select 1 from binders b where b.id = old.binder_id and b.kind = 'pokedex')
begin
  update cards set binder_id = old.binder_id, binder_pocket = null
  where id = (
    select c.id from cards c
    where c.pokemon_id = old.pokemon_id
      and c.gone_on is null
      and (c.binder_id is null or exists (select 1 from binders f where f.id = c.binder_id and f.kind = 'free'))
    order by c.created_at, c.id
    limit 1
  )
    and not exists (select 1 from cards c where c.binder_id = old.binder_id and c.pokemon_id = old.pokemon_id);
end;

-- A card moved to another Pokémon into no binder fills that Pokémon's empty
-- pocket, as a new card does.
create trigger cards_fill_pocket_after_move
after update of pokemon_id on cards
for each row
when old.pokemon_id <> new.pokemon_id and new.binder_id is null and new.gone_on is null
begin
  update cards
  set binder_id = (
    select bp.binder_id from binder_pokemon bp join binders b on b.id = bp.binder_id
    where bp.pokemon_id = new.pokemon_id
      and not exists (select 1 from cards c where c.binder_id = bp.binder_id and c.pokemon_id = new.pokemon_id)
    order by b.finished_on is not null, b.id
    limit 1
  )
  where id = new.id
    and exists (
      select 1 from binder_pokemon bp
      where bp.pokemon_id = new.pokemon_id
        and not exists (select 1 from cards c where c.binder_id = bp.binder_id and c.pokemon_id = new.pokemon_id)
    );
end;

-- A card brought back fills its Pokémon's empty pocket, into it unless it's
-- graded (a slab holds it from outside); else it stays outside the binders.
create trigger cards_fill_pocket_after_return
after update of gone_on on cards
for each row
when old.gone_on is not null and new.gone_on is null and new.binder_id is null
begin
  update cards
  set binder_id = (
        select bp.binder_id from binder_pokemon bp join binders b on b.id = bp.binder_id
        where bp.pokemon_id = new.pokemon_id
          and not exists (select 1 from cards c where c.binder_id = bp.binder_id and c.pokemon_id = new.pokemon_id)
        order by b.finished_on is not null, b.id
        limit 1
      ),
      kept_outside = (grading_company is not null)
  where id = new.id
    and exists (
      select 1 from binder_pokemon bp
      where bp.pokemon_id = new.pokemon_id
        and not exists (select 1 from cards c where c.binder_id = bp.binder_id and c.pokemon_id = new.pokemon_id)
    );
end;

-- A new Pokédex binder takes in, for each of its Pokémon, the oldest card in
-- no Pokédex binder: out of a free binder or in from outside, a graded one
-- held from outside (a slab doesn't fit in a pocket).
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

-- A binder keeps its kind and its Pokémon: its pockets hold cards.
create trigger binders_keep_their_pokemon
before update of kind, first_pokemon_id, last_pokemon_id on binders
for each row
when old.kind is not new.kind
  or old.first_pokemon_id is not new.first_pokemon_id
  or old.last_pokemon_id is not new.last_pokemon_id
begin
  select raise(abort, 'A binder keeps its kind and its Pokémon');
end;

-- A deleted binder's cards are kept outside, wherever they go.
create trigger binders_empty_before_delete
before delete on binders
for each row
begin
  update cards set binder_id = null, binder_pocket = null, kept_outside = 1 where binder_id = old.id;
end;

-- Every card, here or gone. binder_kind 'pokedex': it fills its Pokémon's
-- pocket in a Pokédex binder (from outside, when kept_outside), what
-- is_featured said.
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
  b.kind as binder_kind,
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
left join purchase_items pi on pi.id = c.purchase_item_id
left join binders b on b.id = c.binder_id;

create view owned_cards as
select * from card_details where gone_on is null;

create view gone_cards as
select * from card_details where gone_on is not null;

-- A binder's cards: in a Pokédex binder, the ones in its pockets
-- (card_count) and every one filling a pocket, held from outside too
-- (caught_count).
create view binder_overview as
select
  b.id,
  b.name,
  b.kind,
  b.pockets_per_page,
  b.page_count,
  b.first_pokemon_id,
  b.last_pokemon_id,
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
  ) as caught_count
from binders b;

-- slot_count: the cards that were the first of their Pokémon (new in the
-- Pokédex); goal_count: the ones in a Pokédex binder's pocket.
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
  cast(
    (
      select count(*) from cards c
      where c.purchase_item_id = i.id
        and not exists (
          select 1 from cards o
          where o.pokemon_id = c.pokemon_id
            and (o.created_at < c.created_at or (o.created_at = c.created_at and o.id < c.id))
        )
    ) as integer
  ) as slot_count,
  cast(
    (
      select count(*) from cards c
      join binders b on b.id = c.binder_id and b.kind = 'pokedex'
      where c.purchase_item_id = i.id
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
      where x.purchase_id = p.id
        and not exists (
          select 1 from cards o
          where o.pokemon_id = c.pokemon_id
            and (o.created_at < c.created_at or (o.created_at = c.created_at and o.id < c.id))
        )
    ) as integer
  ) as slot_count,
  cast(
    (
      select count(*) from cards c
      join purchase_items x on x.id = c.purchase_item_id
      join binders b on b.id = c.binder_id and b.kind = 'pokedex'
      where x.purchase_id = p.id
    ) as integer
  ) as goal_count,
  p.created_at,
  p.updated_at
from purchases p
left join purchase_items i on i.purchase_id = p.id
group by p.id;
