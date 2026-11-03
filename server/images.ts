import fs from "node:fs";
import path from "node:path";
import { Hono, type Context } from "hono";
import {
  findCatalogImage,
  findSetImage,
  IMAGE_SIZES,
  IMAGE_TYPES,
  SET_IMAGES,
  type ImageFormat,
  type ImageSize,
  type SetImage,
} from "./catalogImages";
import { ApiError } from "./errors";
import { db } from "./routes";

// The catalogue's card scans and set images, saved by `pnpm catalog:pull`
// (db/catalog.ts):
//
//   GET /api/card-images/:catalogCardId/:size   (size: low | high)
//   GET /api/set-images/:cardSetId/:image       (image: logo | symbol)

export const images = new Hono();
export const setImages = new Hono();

function sendImage(c: Context, file: string | undefined) {
  if (!file) throw new ApiError(404, "Not found");
  const format = path.extname(file).slice(1) as ImageFormat;
  return c.body(fs.readFileSync(file), 200, {
    "Content-Type": IMAGE_TYPES[format],
    // Saved once, never changed. Private: it sits behind the login.
    "Cache-Control": "private, max-age=31536000, immutable",
  });
}

function tcgdexId(table: "catalog_cards" | "card_sets", id: number) {
  const row = db.prepare(`select tcgdex_id from ${table} where id = ?`).get(id) as
    | { tcgdex_id: string }
    | undefined;
  return row?.tcgdex_id;
}

images.get("/:id/:size", (c) => {
  const id = Number(c.req.param("id"));
  const size = c.req.param("size") as ImageSize;
  if (!Number.isInteger(id) || !IMAGE_SIZES.includes(size)) throw new ApiError(404, "Not found");
  const card = tcgdexId("catalog_cards", id);
  return sendImage(c, card && findCatalogImage(card, size));
});

setImages.get("/:id/:image", (c) => {
  const id = Number(c.req.param("id"));
  const image = c.req.param("image") as SetImage;
  if (!Number.isInteger(id) || !SET_IMAGES.includes(image)) throw new ApiError(404, "Not found");
  const set = tcgdexId("card_sets", id);
  return sendImage(c, set && findSetImage(set, image));
});
