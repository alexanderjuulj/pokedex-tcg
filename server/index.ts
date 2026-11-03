import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { auth, isLoginConfigured, requireLogin } from "./auth";
import { API_PORT } from "./config";
import { onError } from "./errors";
import { images, setImages } from "./images";
import { api } from "./routes";
import { rpc } from "./rpc";

const app = new Hono();

// For the deploy check: up, and refusing service until a login is set.
app.get("/api/health", (c) =>
  isLoginConfigured()
    ? c.json({ ok: true })
    : c.json({ ok: false, error: "Login isn't set up" }, 503),
);
app.route("/api/auth", auth);
// Everything else under /api needs a session. Registered after the routes
// above, which answer before it would run.
app.use("/api/*", requireLogin);
// Before the generic routes, so these never read as table names.
app.route("/api/rpc", rpc);
app.route("/api/card-images", images);
app.route("/api/set-images", setImages);
app.route("/api", api);
app.onError(onError);

// Loopback only: devices on the LAN go through the Vite dev server (nginx in
// production), which proxies /api here.
serve({ fetch: app.fetch, hostname: "127.0.0.1", port: API_PORT }, (info) => {
  console.log(`API listening on http://127.0.0.1:${info.port}`);
});
