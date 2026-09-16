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
if (!styles.includes("var(--wl-gold)") || !styles.includes("var(--wl-bg)")) {
  throw new Error("web/styles.css does not bind host tokens to --wl-*");
}

console.log("theme tokens ok");
