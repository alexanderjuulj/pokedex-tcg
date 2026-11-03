// Makes the app's icons: public/favicon.svg, plus the home-screen PNGs
// (icon-512.png, icon-192.png, apple-touch-icon.png), which the Logo also shows.
// - With an icon of its own, public/AppIcon.png (square, full-bleed, opaque,
//   1024 px), they're scaled from it with sips (macOS).
// - Without one, they're drawn from its logo mark (APP_MARK in
//   src/constants/app.ts) and primary color (--clr-primary in
//   src/utils/scss/base/_colors.scss), rendered with headless Chrome in Figtree.
//
// Usage: pnpm icons   (after changing the icon, the mark or the color)

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const SOURCE = path.join(PUBLIC, "AppIcon.png");
const CHROME =
  process.env.CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "icons-"));
const sips = (size, from, to) =>
  execFileSync("sips", ["-z", String(size), String(size), from, "--out", to], { stdio: "ignore" });

function read(file, pattern, what) {
  const match = fs.readFileSync(path.join(ROOT, file), "utf8").match(pattern);
  if (!match) throw new Error(`${what} not found in ${file}`);
  return match[1];
}

function fromSource() {
  for (const [size, name] of [[512, "icon-512.png"], [192, "icon-192.png"], [180, "apple-touch-icon.png"]]) {
    sips(size, SOURCE, path.join(PUBLIC, name));
  }
  console.log("wrote: public/icon-512.png, icon-192.png, apple-touch-icon.png");

  // Browser tabs don't round corners the way home screens do, so the tab
  // icon gets them here.
  const small = path.join(tmp, "favicon.png");
  sips(64, SOURCE, small);
  const data = fs.readFileSync(small).toString("base64");
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <clipPath id="corners"><rect width="64" height="64" rx="16"/></clipPath>
  <image width="64" height="64" clip-path="url(#corners)" href="data:image/png;base64,${data}"/>
</svg>
`;
  fs.writeFileSync(path.join(PUBLIC, "favicon.svg"), favicon);
  console.log("wrote: public/favicon.svg");
}

function fromMark() {
  const mark = read("src/constants/app.ts", /APP_MARK = "([^"]+)"/, "APP_MARK");
  const color = read("src/utils/scss/base/_colors.scss", /--clr-primary:\s*([^;]+);/, "--clr-primary");
  const onColor = read("src/utils/scss/base/_colors.scss", /--clr-on-primary:\s*([^;]+);/, "--clr-on-primary");
  const escape = (text) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Longer marks get smaller type so they keep the same margins.
  const scale = [0.62, 0.48, 0.38][Math.min(mark.length, 3) - 1];

  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="${color}"/>
  <text x="16" y="16.5" text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-size="${Math.round(32 * scale)}" font-weight="700" fill="${onColor}">${escape(mark)}</text>
</svg>
`;
  fs.writeFileSync(path.join(PUBLIC, "favicon.svg"), favicon);
  console.log("wrote: public/favicon.svg");

  if (!fs.existsSync(CHROME)) {
    console.log(`Chrome not found (${CHROME}), so the PNG icons are unchanged. Set CHROME=<path> to use another one.`);
    return;
  }

  const font = pathToFileURL(
    path.join(ROOT, "node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2"),
  );
  // Full-bleed and square: iOS and Android round the corners themselves.
  const html = `<!doctype html><style>
@font-face { font-family: Figtree; src: url("${font}"); font-weight: 100 900; }
html, body { margin: 0; width: 512px; height: 512px; overflow: hidden; }
body { display: flex; align-items: center; justify-content: center; background: ${color}; }
span { font: 700 ${Math.round(512 * scale)}px Figtree; letter-spacing: -0.02em; color: ${onColor}; }
</style><span>${escape(mark)}</span>`;

  const page = path.join(tmp, "icon.html");
  const big = path.join(PUBLIC, "icon-512.png");
  fs.writeFileSync(page, html);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=512,512",
    "--virtual-time-budget=2000",
    `--user-data-dir=${path.join(tmp, "profile")}`,
    `--screenshot=${big}`,
    pathToFileURL(page).href,
  ], { stdio: "ignore" });
  for (const [size, name] of [[192, "icon-192.png"], [180, "apple-touch-icon.png"]]) {
    sips(size, big, path.join(PUBLIC, name));
  }
  console.log("wrote: public/icon-512.png, icon-192.png, apple-touch-icon.png");
}

try {
  if (fs.existsSync(SOURCE)) fromSource();
  else fromMark();
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
