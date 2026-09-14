#!/usr/bin/env node
import { cp, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './lib/catalog.mjs';

const WEB_DIR = join(ROOT, 'web');
const DOCS_DIR = join(ROOT, 'docs');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function copyWebAssets() {
  const entries = await readdir(WEB_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'data') continue;
    const source = join(WEB_DIR, entry.name);
    const destination = join(DOCS_DIR, entry.name);

    if (entry.isDirectory()) {
      await cp(source, destination, { recursive: true, force: true });
    } else {
      await cp(source, destination, { force: true });
    }
  }
}

async function main() {
  await mkdir(DOCS_DIR, { recursive: true });

  if (!(await exists(join(DOCS_DIR, 'data', 'index.json')))) {
    console.error('Missing docs/data/index.json — run build:index first.');
    process.exit(1);
  }

  if (!(await exists(join(DOCS_DIR, 'data', 'index.js')))) {
    console.error('Missing docs/data/index.js — run build:index first.');
    process.exit(1);
  }

  await copyWebAssets();
  await writeFile(join(DOCS_DIR, '.nojekyll'), '');
  console.log('Copied web assets to docs/.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});