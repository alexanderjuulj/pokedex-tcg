<p align="center">
  <img src="public/icon-192.png" alt="" width="96" height="96">
</p>

<h1 align="center">Pokédex TCG</h1>

<p align="center">
  <strong>Your Pokémon card collection as a Pokédex that fills with color, one card at a time.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Pok%C3%A9dex-1%2C025%20Pok%C3%A9mon-ee1515" alt="Pokédex: 1,025 Pokémon">
  <img src="https://img.shields.io/badge/self--hosted-your%20data%20stays%20home-222224" alt="Self-hosted: your data stays home">
  <img src="https://img.shields.io/badge/runs%20on-macOS%20%C2%B7%20Linux-222224?logo=apple&logoColor=white" alt="Runs on macOS and Linux">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/alexanderjuulj/pokedex-tcg?color=222224" alt="MIT license"></a>
  <a href="https://github.com/alexanderjuulj/pokedex-tcg/commits/main"><img src="https://img.shields.io/github/last-commit/alexanderjuulj/pokedex-tcg?color=222224" alt="Last commit"></a>
</p>

<img width="960" height="540" alt="readme-demo" src="https://github.com/user-attachments/assets/875cd9b9-e686-4cc4-a4a3-f357780673d7" />

Pick the regions you collect: E.g Kanto and Johto. Every Pokémon starts as
a gray silhouette and turns to color when you add a card of it, from any era
of the card game. Each card keeps its details and its story: where it came
from, who gave it to you. Virtual binders show where every card sits, page by
page, and the sets show which packs hold the Pokémon you're still missing.

It runs on your own computer, and the whole family uses it from their
phones. There's no sign-up and no subscription, and your collection never
leaves your home.

> [!NOTE]
> Pokémon and its trademarks are © Nintendo, Creatures and GAME FREAK, and
> the artwork and card images are The Pokémon Company's. This project isn't
> affiliated with or endorsed by any of them. None of the images are in this
> repository: your computer downloads its own copy during setup.

**Contents:** [Before you start](#before-you-start) ·
[Set it up](#set-it-up-once) · [Every time you use it](#every-time-you-use-it) ·
[On your phone](#on-your-phone) · [Keep it up to date](#keep-it-up-to-date) ·
[Keep your collection safe](#keep-your-collection-safe) ·
[If something goes wrong](#if-something-goes-wrong) ·
[How the collection works](#how-the-collection-works) ·
[For developers](#for-developers)

## Before you start

You need:

- **A Computer.** Linux or Mac works the same way. Windows may work, but it hasn't been
  tested.
- **About 3 GB of free space**, and an internet connection for the first
  downloads.
- **About an hour**, most of it waiting for the cards to download.

You don't need to know how to program. You'll copy a few commands into the
Terminal, one at a time, and this guide says what each one does and what
you'll see.

**The Terminal in 30 seconds.** The Terminal is an app that's already on
your Mac, where you type commands instead of clicking.

- **Open it:** press ⌘ Space, type `Terminal` and press Return.
- **Run a command:** copy it from this page, paste it into the Terminal with
  ⌘ V and press Return.
- **Know when it's done:** you can type again.
- **Stop a command:** press Control C. Your Mac's Control key, not ⌘.

> [!TIP]
> Text appearing in the Terminal is normal. Things only went wrong if it says
> `error` and stops. Then look up the message in
> [If something goes wrong](#if-something-goes-wrong).

## Set it up (once)

### 1. Install Node.js

The app is built on Node.js. Go to [nodejs.org](https://nodejs.org),
download the **LTS** version for macOS, and open the installer. Click
Continue, Agree and Install, as with any app.

### 2. Install pnpm

pnpm downloads the building blocks the app is made of. Paste this into the
Terminal:

```sh
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

> [!IMPORTANT]
> When it's done, **quit the Terminal (⌘ Q) and open it again**. Otherwise it
> won't find pnpm in the next steps.

### 3. Download the app

```sh
git clone https://github.com/alexanderjuulj/pokedex-tcg.git
```

If your Mac offers to install the "command line developer tools", click
**Install**. Wait for it to finish, then run the command again.

This makes a folder called `pokedex-tcg` in your home folder. **Your
collection will be saved in this folder too, so keep it.**

Then go into the folder:

```sh
cd pokedex-tcg
```

Every command from here on runs inside this folder.

### 4. Install the app's building blocks

```sh
pnpm install
```

This takes a minute or two.

### 5. Make the database

```sh
pnpm db:migrate
```

This creates the file your collection is saved in, with all 1,025 Pokémon
already in it. It takes a few seconds.

### 6. Download the Pokémon pictures

```sh
pnpm pokemon:art
```

This downloads the official artwork of every Pokémon (about 20 MB, under a
minute). When it's done, it says `artwork: done, 1025 saved`.

### 7. Download the cards

```sh
pnpm catalog:pull
```

This is the big one: every English Pokémon card ever printed, with a picture
of each, plus every set's logo. It takes about an hour and 2.5–3 GB. It
counts as it goes, and when it's done it says how many cards it has.

Need to stop halfway? Press Control C. Run the same command later and it
picks up where it stopped.

### 8. Choose a login

```sh
pnpm auth:login .env
```

It asks for a username, then a password (at least 10 characters), then the
password again.

> [!TIP]
> Nothing shows while you type the password. That's normal: keep typing and
> press Return.

Everyone in the family shares this one login.

### 9. Start the app

```sh
pnpm dev
```

Open [http://localhost:5320](http://localhost:5320) in your browser and log
in. The app walks you through the rest:

1. Pick the regions you want to collect.
2. Tell it your binder's size: pockets per page and number of pages.
3. It works out how many binders that takes, and makes them.

Then add your first card.

## Every time you use it

Open the Terminal and run these two commands:

```sh
cd pokedex-tcg
pnpm dev
```

Leave the Terminal window open while you use the app (you can minimise it).
When you're done, press Control C or quit the Terminal.

## On your phone

While `pnpm dev` is running, any phone or tablet on the same Wi-Fi can use
the app.

1. **Find your Mac's name.** Open System Settings → General → Sharing.
   At the bottom, under **Local hostname**, it says something like
   `Annas-MacBook-Air.local`.
2. **Open it on the phone.** In the phone's browser, go to that name with
   `http://` in front and `:5320` after it:
   `http://Annas-MacBook-Air.local:5320`
3. **Make it an app.** On an iPhone or iPad, in Safari: the Share button,
   then **Add to Home Screen**. On Android, in Chrome: the ⋮ menu, then
   **Add to Home screen** (or **Install app**).

The phone can only reach the app while your Mac is on, awake and running
`pnpm dev`.

**Away from home**, at a card shop or a market, you need a server, rented
online. That part is technical: [`deploy/README.md`](deploy/README.md) walks
through it, for someone who's comfortable with servers.

## Keep it up to date

**New cards** come out every few months. To get them, run this (it only
fetches what's new, so it takes a few minutes):

```sh
cd pokedex-tcg
pnpm catalog:pull
```

A new set can take a few days after its release to appear here, and its
cards' details (which versions were printed, the illustrators) keep filling
in for a few weeks. Each pull checks the sets of the last 90 days again, so
pulling early is fine.

**A new version of the app.** Stop the app first (Control C), then:

```sh
cd pokedex-tcg
git pull
pnpm install
pnpm dev
```

`pnpm dev` updates the database by itself. Your cards stay as they are.

## Keep your collection safe

Your whole collection is one file:
`pokedex-tcg/data/pokedex-tcg.sqlite`.

**Make a copy now and then:**

```sh
cd pokedex-tcg
pnpm db:backup
```

This puts a dated copy in the `pokedex-tcg/data/backups` folder. For real
safety, copy that folder somewhere else from time to time: iCloud Drive, a
USB stick. The card pictures and Pokémon artwork aren't in the backups,
because they can always be downloaded again.

> [!WARNING]
> Never delete the `pokedex-tcg` folder. Your collection is inside it.

**To go back to a copy,** stop the app (Control C). If the collection you're
replacing might be worth keeping, back it up first (above). Then run these
one at a time. The second command lists the copies, newest last; in the
third, replace `<date>` with the one you want.

```sh
cd ~/pokedex-tcg/data
ls backups
cp backups/pokedex-tcg-<date>.sqlite pokedex-tcg.sqlite
rm -f pokedex-tcg.sqlite-wal pokedex-tcg.sqlite-shm
```

Then start the app again.

## If something goes wrong

| What you see                                                      | What to do                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command not found: pnpm`                                         | Quit the Terminal (⌘ Q), open it again and retry. If it still says that, repeat step 2.                                                                                                                                                         |
| `command not found: node`, or a message about the Node.js version | Install Node.js (step 1), then quit and reopen the Terminal.                                                                                                                                                                                    |
| `No such file or directory` after `cd pokedex-tcg`                | The Terminal is in another folder. Run `cd ~/pokedex-tcg` instead.                                                                                                                                                                              |
| `address already in use`, or `Port 5320 is already in use`        | The app is already running in another Terminal window. Use that one, or press Control C there first.                                                                                                                                            |
| The app says "Login isn't set up yet", or your login doesn't work | Do step 8 again, then stop the app (Control C) and run `pnpm dev`.                                                                                                                                                                              |
| You forgot the password                                           | Do step 8 again with a new one. Every phone has to log in again.                                                                                                                                                                                |
| The phone can't open the app                                      | Check that the phone is on the same Wi-Fi, and that the Mac is awake and running `pnpm dev`. If your Mac asked whether "node" may accept incoming connections, the answer has to be **Allow** (System Settings → Network → Firewall → Options). |
| `pnpm catalog:pull` stops with an error                           | The card websites are sometimes slow or busy. Run it again a bit later: it keeps everything it already has.                                                                                                                                     |
| Some cards show a blank card instead of a picture                 | Nobody has published a scan of those cards yet. Each `pnpm catalog:pull` checks again.                                                                                                                                                          |

## How the collection works

- **The goal** is the Pokémon of the regions you picked. A Pokémon is caught
  once you have a card of it, and "x of 251 caught" counts only those.
  Cards of every other Pokémon are kept too; they just don't count.
- **Pokédex binders** have one pocket for each Pokémon of the goal, in
  Pokédex order, with each region starting on a fresh page. Each pocket
  holds that Pokémon's card: its first, or one you choose. So nothing ever
  needs to move.
- **Free binders** are for duplicates and extras. Each card goes in the
  next empty pocket.
- **Adding a card:** find its Pokémon (or its set), tap the card you have
  among all the cards ever printed, and fill in the details. The form says
  which binder and pocket the card goes in, and you can change it.
  - **A card in a top loader** (or a box) can be kept outside the binders:
    pick "Not in a binder" and say where it is. A graded card always is,
    since a slab doesn't fit in a pocket. If it's the Pokémon's card in the
    Pokédex, it still counts, and its pocket stays free for a loose card.
  - **A card that isn't in the list** (another print, a jumbo card) can be
    entered by hand.
- **Sets** show how many of the Pokémon you still need are in each one, to
  help you pick which packs to open.
- **Pack odds:** a Pokémon's Sets tab says about how many packs of each
  set it takes to pull it ("About 1 in 9 packs"). It also names the set
  with the best odds, and the best one from the last two years, which a
  shop is more likely to have. It's an estimate from how many commons and
  uncommons each set has. Rarer cards aren't counted, since nobody
  publishes their odds.
- **Legends & starters** on the Pokédex gathers the legendary, mythical,
  Ultra Beast, Paradox and starter Pokémon from every region. A Pokémon's
  page says which one it is and what that means, for the card you pulled
  and didn't recognise.
- **More regions** can be added any time: Binders → Collect more regions.

## For developers

<p>
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A5%2022.13-5fa04e?logo=nodedotjs&logoColor=white" alt="Node.js 22.13 or newer">
  <img src="https://img.shields.io/badge/pnpm-12-f69220?logo=pnpm&logoColor=white" alt="pnpm 12">
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white" alt="TypeScript, strict">
  <img src="https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white" alt="Vite 7">
  <img src="https://img.shields.io/badge/Hono-API-e36002?logo=hono&logoColor=white" alt="Hono API">
  <img src="https://img.shields.io/badge/SQLite-node%3Asqlite-003b57?logo=sqlite&logoColor=white" alt="SQLite through node:sqlite">
</p>

```
Phone / browser ──▶ Vite (:5320)  ──/api──▶  Hono API (:5321)  ──▶  data/pokedex-tcg.sqlite
                    React app                  server/            (node:sqlite)
```

- **Stack:** Node.js 22.13 or newer, pnpm, React 19 with Vite and
  TypeScript, a Hono API and Node's built-in `node:sqlite`.
- **Database:** SQL migrations in `db/migrations/`, applied by
  `pnpm db:migrate`. It also regenerates the TypeScript types in
  `src/lib/database.types.ts`.
- **API:** generic CRUD over an allowlist of tables (`server/tables.ts`),
  plus RPC routes for writes that span several rows (`server/rpc.ts`).
  Everything except the health check and login sits behind the login.
- **App:** one folder per feature in `src/features/`, data hooks in
  `src/hooks/queries.ts`, shared UI in `src/components/`.

| Task                      | How                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Change the database       | `pnpm db:new "add x"`, write the SQL, `pnpm db:migrate`                                  |
| Check the code            | `pnpm lint` and `pnpm build` (type-checks the app, the server and the db tool)           |
| Deploy to a server        | `pnpm deploy:server`, after the one-time setup in [`deploy/README.md`](deploy/README.md) |
| Change the name           | `src/constants/app.ts`, `index.html`, `public/site.webmanifest`                          |
| Change the colors         | `src/utils/scss/base/_colors.scss`                                                       |
| Change the icon           | Replace `public/AppIcon.png` (1024 px), then `pnpm icons` (macOS)                        |
| Start the local data over | `pnpm db:reset` (backs up first), then `pnpm catalog:pull`                               |

`data/` (the database, backups and card scans), `public/pokemon/` (the
artwork) and `.env` (the login) are gitignored. Once the app runs on a
server, the server holds the real data: never run `seed` or `reset` there.
Every deploy backs up the database before migrating, and a nightly timer
keeps 30 days of copies.

## Where the data comes from

- **Cards, sets and scans:** [TCGdex](https://tcgdex.dev), with
  [pokemontcg.io](https://pokemontcg.io)'s open data for the scans, logos
  and symbols TCGdex lacks. Downloaded once by `pnpm catalog:pull`.
- **The Pokémon:** names and types from
  [Bulbapedia](https://bulbapedia.bulbagarden.net)'s National Pokédex list;
  category, height, weight, Pokédex entries and evolutions from
  [PokéAPI](https://pokeapi.co). They ship with the app, in the database
  migrations (`scripts/pull-pokemon.mjs` wrote them).
- **The artwork:** the official artwork, from PokéAPI's
  [sprites repository](https://github.com/PokeAPI/sprites), downloaded by
  `pnpm pokemon:art`.

## License

The code is MIT licensed (`LICENSE`). That covers this repository only: the
Pokémon, their names and artwork, and the cards and their images belong to
their owners (see the top of this page) and aren't part of it.
