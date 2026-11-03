import crypto from "node:crypto";

const SALT_BYTES = 16;
const KEY_BYTES = 64;

// "scrypt:<salt>:<hash>" in hex. Colons rather than the usual "$": the .env
// holding it is also sourced by bash (deploy.sh), which would expand "$…".
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = crypto.scryptSync(password, salt, KEY_BYTES);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}
