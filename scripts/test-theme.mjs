#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "./lib/catalog.mjs";

const weblabPath = join(ROOT, "web", "weblab.css");
const stylesPath = join(ROOT, "web", "styles.css");
const indexPath = join(ROOT, "web", "index.html");

const weblab = await readFile(weblabPath, "utf8");
const styles = await readFile(stylesPath, "utf8");
const index = await readFile(indexPath, "utf8");

for (const token of ["#050821", "#f4b223", "#121548", "#b5c5e8"]) {
  if (!weblab.includes(token)) {
    throw new Error(`missing ${token} in ${weblabPath}`);
  }
}
for (const token of ["backdrop-filter", "#72d6cb", "#04111d"]) {
  if (weblab.includes(token)) {
    throw new Error(`forbidden ${token} in ${weblabPath}`);
  }
}
if (!index.includes("./weblab.css")) {
  throw new Error("web/index.html does not link weblab.css");
}
if (!styles.includes("var(--wl-gold)") || !styles.includes("var(--wl-muted)")) {
  throw new Error("web/styles.css does not bind host tokens to --wl-*");
}
if (/data-theme|#[0-9a-f]{3,6}\b/i.test(styles.replace(/\/\*[\s\S]*?\*\//g, ""))) {
  throw new Error("web/styles.css has a light theme or a hardcoded colour");
}
for (const needle of ['class="wl-page"', "wl-topbar", "wl-footer", 'class="wl-input"', 'rel="icon"', 'property="og:image"', "jahnog.github.io", 'aria-live="polite"']) {
  if (!index.includes(needle)) throw new Error(`web/index.html is missing ${needle}`);
}
if (index.includes("theme-toggle")) throw new Error("web/index.html still has the theme toggle");
const app = await readFile(join(ROOT, "web", "app.js"), "utf8");
if (!app.includes("wl-chip-btn") || !app.includes("aria-pressed")) throw new Error("web/app.js filter chips are not template chip buttons");
if (app.includes("role', 'listitem'") || app.includes("window.open(")) throw new Error("web/app.js still has the old card semantics");

console.log("theme tokens ok");
