-- What sets a Pokémon apart, for the Pokédex's "Legends & starters" row and
-- the pill on its page: legendary and mythical as PokéAPI marks them, the
-- Ultra Beasts and Paradox Pokémon as the games list them, and the line of
-- every region's three first partners. One class each: Necrozma, Koraidon
-- and Miraidon count as legendary.
alter table pokemon add column class text
  check (class in ('legendary', 'mythical', 'ultra_beast', 'paradox', 'starter'));

update pokemon set class = 'legendary' where id in (
  144, 145, 146, 150,
  243, 244, 245, 249, 250,
  377, 378, 379, 380, 381, 382, 383, 384,
  480, 481, 482, 483, 484, 485, 486, 487, 488,
  638, 639, 640, 641, 642, 643, 644, 645, 646,
  716, 717, 718,
  772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 800,
  888, 889, 890, 891, 892, 894, 895, 896, 897, 898, 905,
  1001, 1002, 1003, 1004, 1007, 1008, 1014, 1015, 1016, 1017, 1024
);

update pokemon set class = 'mythical' where id in (
  151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649,
  719, 720, 721, 801, 802, 807, 808, 809, 893, 1025
);

update pokemon set class = 'ultra_beast' where id in (
  793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806
);

-- Great Tusk to Iron Thorns, and the ones the later games added.
update pokemon set class = 'paradox' where id between 984 and 995
  or id in (1005, 1006, 1009, 1010, 1020, 1021, 1022, 1023);

-- Each region's starters and their evolutions sit together, nine in a row
-- (Hisui has none of its own).
update pokemon set class = 'starter' where id between 1 and 9
  or id between 152 and 160
  or id between 252 and 260
  or id between 387 and 395
  or id between 495 and 503
  or id between 650 and 658
  or id between 722 and 730
  or id between 810 and 818
  or id between 906 and 914;

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
left join cards c on c.pokemon_id = p.id
group by p.id;
