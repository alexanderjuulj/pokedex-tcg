-- Every physical card ever printed for Pokémon #1–251, from TCGdex (English
-- prints, without the digital TCG Pocket sets). Filled by `pnpm catalog:pull`
-- (db/catalog.ts), never by hand, which also saves each card's images under
-- data/catalog/. Reference data like pokemon: no timestamps, read through
-- views.

create table card_sets (
  id          integer primary key,
  tcgdex_id   text not null unique,
  name        text not null,
  series      text not null,
  released_on text check (released_on glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  -- The official count printed on the cards: the 102 of "4/102".
  card_count  integer
);

create table catalog_cards (
  id                integer primary key,
  tcgdex_id         text not null unique,
  card_set_id       integer not null references card_sets (id),
  name              text not null,
  -- The number on the card: "4" of "4/102", or "SWSH050" for a promo.
  local_id          text not null,
  rarity            text,
  illustrator       text,
  -- The versions it was printed in.
  has_normal        boolean not null default 0 check (has_normal in (0, 1)),
  has_holo          boolean not null default 0 check (has_holo in (0, 1)),
  has_reverse       boolean not null default 0 check (has_reverse in (0, 1)),
  has_first_edition boolean not null default 0 check (has_first_edition in (0, 1)),
  -- Where TCGdex keeps the scans (null: it has none, mostly old promos), and
  -- whether this machine has saved them (data/catalog/).
  image_url         text,
  has_image         boolean not null default 0 check (has_image in (0, 1))
);

create index catalog_cards_card_set_id on catalog_cards (card_set_id);

-- A card shows every Pokémon on it: "Mewtwo & Mew-GX" is listed under both.
create table catalog_card_pokemon (
  id              integer primary key,
  catalog_card_id integer not null references catalog_cards (id) on delete cascade,
  pokemon_id      integer not null references pokemon (id),
  unique (catalog_card_id, pokemon_id)
);

create index catalog_card_pokemon_pokemon_id on catalog_card_pokemon (pokemon_id);
