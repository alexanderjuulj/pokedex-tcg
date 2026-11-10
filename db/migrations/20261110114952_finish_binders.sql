-- A Pokédex binder can be finished: done, or given up on its last few. It
-- stays as it is, its pages, pockets and cards, so a card can still be found
-- in it, but it's no longer part of the goal: the Pokédex count, the sets'
-- "you need" and the pack chooser follow the binders still being collected.
-- A finished binder still keeps its range (no other Pokédex binder can take
-- its Pokémon) and its slot cards, and it can be collected again.

alter table binders add column finished_on text
  check (
    finished_on is null
    or (kind = 'pokedex' and finished_on glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
  );

-- A deleted Pokédex binder's slot cards are in no pocket any more: kept
-- outside the binders, as every card in no pocket is. (Its delete left them
-- marked as in a pocket.)
create trigger binders_pokedex_empty_before_delete
before delete on binders
for each row
when old.kind = 'pokedex'
begin
  update cards set kept_outside = 1
  where is_featured = 1
    and kept_outside = 0
    and pokemon_id between old.first_pokemon_id and old.last_pokemon_id;
end;

-- Any left that way by an earlier delete.
update cards set kept_outside = 1
where is_featured = 1
  and kept_outside = 0
  and binder_id is null
  and not exists (
    select 1 from binders b
    where b.kind = 'pokedex' and cards.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
  );

-- A binder with its finish, and for a Pokédex binder how many of its Pokémon
-- are caught (their slot card in its pocket or kept outside).
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
  b.finished_on,
  b.created_at,
  b.updated_at,
  cast(
    case b.kind
      when 'pokedex' then (
        select count(*) from cards c
        where c.is_featured = 1
          and c.kept_outside = 0
          and c.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
      )
      else (select count(*) from cards c where c.binder_id = b.id)
    end as integer
  ) as card_count,
  cast(
    case b.kind
      when 'pokedex' then (
        select count(*) from cards c
        where c.is_featured = 1
          and c.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
      )
    end as integer
  ) as caught_count
from binders b;

-- "You need" counts the binders still being collected.
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
  and goal.finished_on is null
  and cp.pokemon_id between goal.first_pokemon_id and goal.last_pokemon_id
left join (select distinct pokemon_id from cards where gone_on is null) owned
  on owned.pokemon_id = cp.pokemon_id
group by s.id;
