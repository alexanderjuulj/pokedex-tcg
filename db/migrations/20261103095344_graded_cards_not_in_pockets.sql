-- A graded card is in a slab, which doesn't fit in a pocket: as a Pokémon's
-- slot card it still counts, but it isn't in the Pokédex binder. Its count is
-- the cards really in its pockets.

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
  b.created_at,
  b.updated_at,
  cast(
    case b.kind
      when 'pokedex' then (
        select count(*) from cards c
        where c.is_featured = 1
          and c.grading_company is null
          and c.pokemon_id between b.first_pokemon_id and b.last_pokemon_id
      )
      else (select count(*) from cards c where c.binder_id = b.id)
    end as integer
  ) as card_count
from binders b;
