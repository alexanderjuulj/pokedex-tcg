// Downloads the Pokémon artwork the app shows, public/pokemon/NNN.webp for
// #001–1025. The artwork is The Pokémon Company's, so it isn't in the
// repository: each checkout fetches its own copy, once, from PokéAPI's open
// sprites repository (the official artwork, 475 px PNG), converted to WebP.
// Only what's missing is fetched, so running it again is quick.
//
// Usage: pnpm pokemon:art [dir]   (dir defaults to public/pokemon)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "public", "pokemon"));
const LAST = 1025;
const SOURCE = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const PARALLEL = 8;

fs.mkdirSync(OUT, { recursive: true });
const file = (id) => path.join(OUT, `${String(id).padStart(3, "0")}.webp`);
const missing = Array.from({ length: LAST }, (_, index) => index + 1).filter(
  (id) => !fs.existsSync(file(id)),
);
if (!missing.length) {
  console.log(`artwork: all ${LAST} already in ${path.relative(ROOT, OUT) || OUT}`);
  process.exit(0);
}
console.log(`artwork: fetching ${missing.length} of ${LAST} into ${path.relative(ROOT, OUT) || OUT}`);

async function fetchPng(id) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(SOURCE(id)).catch((error) => error);
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (response.status === 404 || attempt === 3) {
      throw new Error(`#${id}: ${response.status ?? response.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
}

const failed = [];
let done = 0;
const queue = [...missing];
await Promise.all(
  Array.from({ length: PARALLEL }, async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      try {
        const png = await fetchPng(id);
        // Written under a temporary name first, so an interrupted run never
        // leaves a broken file that the next run would skip.
        await sharp(png).webp({ quality: 82 }).toFile(`${file(id)}.tmp`);
        fs.renameSync(`${file(id)}.tmp`, file(id));
      } catch (error) {
        failed.push(error.message);
      }
      if (++done % 100 === 0) console.log(`artwork: ${done} / ${missing.length}`);
    }
  }),
);

if (failed.length) {
  console.error(`artwork: ${failed.length} failed (run it again to retry):\n  ${failed.join("\n  ")}`);
  process.exit(1);
}
console.log(`artwork: done, ${missing.length} saved`);
