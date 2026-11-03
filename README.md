# Pokédex TCG

A Pokémon TCG collection for your phone, built to be handed down. Pick the
regions you collect (Kanto and Johto, say), and the Pokédex fills with color
as you catch a card for each of their Pokémon, from any era of the card game.
Every card keeps its details (set, rarity, finish, condition, grade)
and its story. Virtual binders show where each card sits, page by page, and
the sets show where to find the Pokémon you're still missing.

It runs on your own computer, or your own server: one shared login for the
household, everything stored locally, nothing looked up while you use it.

> Pokémon and its trademarks are © Nintendo, Creatures and GAME FREAK, and
> the artwork and card images are The Pokémon Company's. This project isn't
> affiliated with or endorsed by any of them. None of the images are in this
> repository: each install downloads its own copy (below).

## What you need

- [Node.js](https://nodejs.org) 22.13 or newer (the database is Node's
  built-in `node:sqlite`)
- [pnpm](https://pnpm.io/installation)
- About 3 GB of free disk space, and an internet connection for the first
  downloads
- Some comfort with a terminal. Written and tested on macOS; Linux works the
  same.

## Getting started

```sh
git clone <this repository> pokedex-tcg
cd pokedex-tcg
pnpm install
```

Then, once:

1. **The database.** `pnpm db:migrate` creates `data/pokedex-tcg.sqlite`,
   with all 1,025 Pokémon in it.
2. **The Pokémon artwork.** `pnpm pokemon:art` downloads the official
   artwork of every Pokémon from [PokéAPI](https://pokeapi.co)'s open
   sprites (about 20 MB, under a minute) into `public/pokemon/`.
3. **The card catalogue.** `pnpm catalog:pull` copies every printed English
   card, with its scan, and every set's logo and symbol. The first run takes
   about an hour and 2.5–3 GB. It only fetches what's missing, so it's safe
   to stop and start again, and running it later picks up newly released
   sets.
4. **The login.** `pnpm auth:login .env` asks for a username and password
   (everyone in the household shares it) and saves them in `.env`, the
   password only as a hash.
5. **Start it.** `pnpm dev`, then open http://localhost:5320.

The first time you log in, the app walks you through setting it up: pick the
regions to collect, then the size of your binder (pockets per page and
pages). It works out how the regions fit, in one binder or several, and
makes them. More regions can be added later from **Binders**.

## On your phone

While `pnpm dev` runs, any phone or tablet on the same Wi-Fi can open the
app at `http://<your-computer>.local:5320` (on a Mac, the name is under
System Settings → General → Sharing), or at the "Network" address `pnpm dev`
prints. In Safari, Share → **Add to Home Screen** makes it an app.

To use it away from home (at a card shop, say), it needs a server:
[`deploy/README.md`](deploy/README.md) sets one up step by step, with HTTPS
and nightly backups. After that, every update is `pnpm deploy:server`.

## How the collection works

- **The goal:** the Pokémon of the regions you collect. A Pokémon is caught
  once it has a card, and "x of 251 caught" counts only those. Cards of
  every other Pokémon are kept too; they just don't count.
- **Pokédex binders:** one pocket for each Pokémon of the goal, in Pokédex
  order, each region starting on a fresh page. A Pokémon's pocket holds the
  card in its slot (its first card, or the one you choose), so nothing ever
  moves. The goal is exactly what these binders cover.
- **Free binders:** for extras and duplicates. A card goes in the first empty
  pocket.
- **Adding a card:** find its Pokémon (or its set), tap the printed card you
  have, and fill in the details. The form says which binder and pocket it
  goes in: a Pokémon's first card goes in its Pokédex pocket, a duplicate in
  your free binder, and you can change it. A graded card's slab doesn't fit
  in a pocket, so it's kept outside the binders, and its Pokédex pocket stays
  free for a loose card. Cards the catalogue doesn't know (other prints,
  jumbo cards) can be entered by hand.
- **Sets:** every set, with how many of the Pokémon you still need are in it,
  to see which packs are worth opening.

## How it fits together

```
Phone / browser ──▶ Vite (:5320)  ──/api──▶  Hono API (:5321)  ──▶  data/pokedex-tcg.sqlite
                    React app                  server/            (node:sqlite)
```

- **Database:** SQL migrations in `db/migrations/`, applied by
  `pnpm db:migrate`, which also regenerates the TypeScript types in
  `src/lib/database.types.ts`.
- **API:** generic CRUD over an allowlist of tables (`server/tables.ts`),
  plus RPC routes for writes that span several rows (`server/rpc.ts`).
  Everything except the health check and login sits behind the login.
- **App:** one folder per feature in `src/features/`, data hooks in
  `src/hooks/queries.ts`, shared UI in `src/components/`.

`deploy/README.md` is the server guide.

## Everyday tasks

| Task                            | How                                                                |
| ------------------------------- | ------------------------------------------------------------------ |
| Get newly released cards        | `pnpm catalog:pull` (only fetches what's missing)                  |
| Collect more regions            | In the app: Binders → Collect more regions                         |
| Back up the local database      | `pnpm db:backup` (to `data/backups/`)                              |
| Change the login                | `pnpm auth:login .env`, then restart `pnpm dev`                    |
| Deploy                          | `pnpm deploy:server` (the one-time setup is in `deploy/README.md`) |
| Change the database             | `pnpm db:new "add x"`, write the SQL, `pnpm db:migrate`            |
| Change the name                 | `src/constants/app.ts`, `index.html`, `public/site.webmanifest`    |
| Change the colors               | `src/utils/scss/base/_colors.scss`                                 |
| Change the icon                 | Replace `public/AppIcon.png` (1024 px), then `pnpm icons` (macOS)  |
| Start the local data over       | `pnpm db:reset` (backs up first), then `pnpm catalog:pull`         |

Checks: `pnpm lint` and `pnpm build` (which type-checks the app, the server
and the db tool). The deploy runs both before shipping anything.

## Data safety

- `data/` (the database, backups and card scans), `public/pokemon/` (the
  artwork) and `.env` (the login) are gitignored.
- The backups hold the database only. The card scans and the artwork can
  always be downloaded again.
- Once the app is on a server, the server holds the real data; a computer's
  copy is for development. Never run `seed` or `reset` on the server.
- Every deploy backs up the database before migrating, and a nightly timer
  keeps 30 days of copies.

## Where the data comes from

- **Cards, sets and scans:** [TCGdex](https://tcgdex.dev), with
  [pokemontcg.io](https://pokemontcg.io)'s open data for the scans, logos
  and symbols TCGdex lacks. Pulled once by `pnpm catalog:pull`.
- **The Pokémon:** names and types from
  [Bulbapedia](https://bulbapedia.bulbagarden.net)'s National Pokédex list;
  category, height, weight, Pokédex entries and evolutions from
  [PokéAPI](https://pokeapi.co). They ship in the migrations
  (`scripts/pull-pokemon.mjs` wrote them).
- **The artwork:** the official artwork, from PokéAPI's
  [sprites repository](https://github.com/PokeAPI/sprites), by
  `pnpm pokemon:art`.

## License

The code is MIT licensed (`LICENSE`). That covers this repository only: the
Pokémon, their names and artwork, and the cards and their images belong to
their owners (top of this page) and aren't part of it.
