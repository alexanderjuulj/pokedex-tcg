import fs from "node:fs";
import path from "node:path";
import { CATALOG_DIR } from "./config";

// Where `catalog pull` saves the card scans and set images, and the API reads
// them. Its own module: the db CLI imports it, and must not open the database
// the way routes.ts does on import.

export const IMAGE_SIZES = ["low", "high"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];
export const SET_IMAGES = ["logo", "symbol"] as const;
export type SetImage = (typeof SET_IMAGES)[number];

// TCGdex's images are WebP; pokemontcg.io's, which fill its gaps, PNG. Both
// are kept as they came: the server has nothing to convert them with.
export const IMAGE_TYPES = { webp: "image/webp", png: "image/png" } as const;
export type ImageFormat = keyof typeof IMAGE_TYPES;
const FORMATS = Object.keys(IMAGE_TYPES) as ImageFormat[];

// TCGdex ids hold dots and the odd "?" (Unown), so the folder name is encoded.
export function catalogImagePath(tcgdexId: string, size: ImageSize, format: ImageFormat) {
  return path.join(CATALOG_DIR, encodeURIComponent(tcgdexId), `${size}.${format}`);
}

// In a folder of their own, beside the cards' folders.
export function setImagePath(tcgdexId: string, image: SetImage, format: ImageFormat) {
  return path.join(CATALOG_DIR, "sets", encodeURIComponent(tcgdexId), `${image}.${format}`);
}

// The saved file in whichever format it came in, if any.
export function findCatalogImage(tcgdexId: string, size: ImageSize) {
  return FORMATS.map((format) => catalogImagePath(tcgdexId, size, format)).find(fs.existsSync);
}

export function findSetImage(tcgdexId: string, image: SetImage) {
  return FORMATS.map((format) => setImagePath(tcgdexId, image, format)).find(fs.existsSync);
}
