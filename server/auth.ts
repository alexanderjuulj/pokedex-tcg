import crypto from "node:crypto";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { ApiError } from "./errors";
import { verifyPassword } from "./password";

// One shared login, set with the CLI's `login` command
// (AUTH_* in .env). The session is a signed cookie: no session table, and
// a new AUTH_SECRET (every `login` run makes one) logs every device out.

const COOKIE = "session";
const DAY_MS = 86_400_000;
const SESSION_DAYS = 30;
// Per client IP, then locked out for the rest of the window.
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60_000;

const NOT_CONFIGURED =
  "Login isn't set up yet: run the login command (see deploy/README.md) and restart the API.";

type LoginConfig = { user: string; passwordHash: string; secret: string };

function loginConfig(): LoginConfig | null {
  const { AUTH_USER, AUTH_PASSWORD_HASH, AUTH_SECRET } = process.env;
  if (!AUTH_USER || !AUTH_PASSWORD_HASH || !AUTH_SECRET) return null;
  return { user: AUTH_USER, passwordHash: AUTH_PASSWORD_HASH, secret: AUTH_SECRET };
}

export const isLoginConfigured = () => loginConfig() !== null;

function requireConfig(): LoginConfig {
  const config = loginConfig();
  if (!config) throw new ApiError(503, NOT_CONFIGURED);
  return config;
}

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// Signed over the user too, so renaming the login also ends old sessions.
const signature = (config: LoginConfig, expires: number) =>
  crypto
    .createHmac("sha256", config.secret)
    .update(`${config.user}.${expires}`)
    .digest("base64url");

function startSession(c: Context, config: LoginConfig) {
  const expires = Date.now() + SESSION_DAYS * DAY_MS;
  setCookie(c, COOKIE, `${expires}.${signature(config, expires)}`, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    // nginx terminates HTTPS; plain http in development and on the LAN.
    secure: c.req.header("x-forwarded-proto") === "https",
    maxAge: SESSION_DAYS * 86_400,
  });
}

// The session's expiry, or null when there's no valid session.
function sessionExpiry(c: Context, config: LoginConfig): number | null {
  const [expiresText, given] = (getCookie(c, COOKIE) ?? "").split(".");
  const expires = Number(expiresText);
  if (!given || !Number.isFinite(expires) || expires < Date.now()) return null;
  return safeEqual(given, signature(config, expires)) ? expires : null;
}

const failures = new Map<string, { count: number; resetAt: number }>();

// The API only listens on loopback, behind nginx (or Vite in development),
// so X-Real-IP can be trusted.
const clientIp = (c: Context) => c.req.header("x-real-ip") ?? "local";

export const auth = new Hono();

auth.get("/session", (c) => {
  const config = requireConfig();
  if (sessionExpiry(c, config) === null) throw new ApiError(401, "Not logged in");
  return c.json({ user: config.user });
});

auth.post("/login", async (c) => {
  const config = requireConfig();
  const ip = clientIp(c);
  const now = Date.now();
  const failed = failures.get(ip);
  if (failed && failed.resetAt > now && failed.count >= MAX_FAILED_LOGINS) {
    const minutes = Math.ceil((failed.resetAt - now) / 60_000);
    throw new ApiError(
      429,
      `Too many attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
    );
  }

  const body = (await c.req.json().catch(() => null)) as {
    username?: unknown;
    password?: unknown;
  } | null;
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // Both checks always run, so a wrong username takes as long as a wrong
  // password. The username ignores case: phones capitalise the first letter.
  const passwordOk = verifyPassword(password, config.passwordHash);
  const userOk = safeEqual(username.toLowerCase(), config.user.toLowerCase());
  if (!passwordOk || !userOk) {
    const current = failed && failed.resetAt > now ? failed : { count: 0, resetAt: now + LOCKOUT_MS };
    failures.set(ip, { ...current, count: current.count + 1 });
    throw new ApiError(401, "Wrong username or password.");
  }

  failures.delete(ip);
  startSession(c, config);
  return c.json({ user: config.user });
});

auth.post("/logout", (c) => {
  deleteCookie(c, COOKIE, { path: "/" });
  return c.body(null, 204);
});

// Guards every other /api route. A session in its second half is renewed,
// so a device in daily use stays logged in.
export const requireLogin: MiddlewareHandler = async (c, next) => {
  const config = requireConfig();
  const expires = sessionExpiry(c, config);
  if (expires === null) throw new ApiError(401, "Not logged in");
  if (expires - Date.now() < (SESSION_DAYS / 2) * DAY_MS) startSession(c, config);
  await next();
};
