#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import MiniSearch from 'minisearch';
import { FEATURED_SKILL_IDS, ROOT } from './lib/catalog.mjs';

const INDEX_PATH = join(ROOT, 'docs', 'data', 'index.json');

// Keep in sync with web/app.js
const SEARCH_OPTIONS = {
  fields: ['name', 'description', 'tags', 'categories', 'id'],
  storeFields: ['id'],
  processTerm(term) {
    const normalized = term.toLowerCase();
    return normalized.length < 2 ? null : normalized;
  },
  searchOptions: {
    boost: { name: 3, id: 2, tags: 2, description: 1.5, categories: 1.2 },
    prefix: true,
    combineWith: 'AND',
    fuzzy: (term) => (term.length > 3 ? 0.2 : null),
  },
};

function isFeatured(skill) {
  return Number.isInteger(skill.featured_order);
}

function defaultSort(a, b) {
  const aFeatured = isFeatured(a);
  const bFeatured = isFeatured(b);
  if (aFeatured && bFeatured) return a.featured_order - b.featured_order;
  if (aFeatured) return -1;
  if (bFeatured) return 1;
  return a.name.localeCompare(b.name);
}

function documentsForIndex(skills) {
  return skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description ?? '',
    tags: (skill.tags ?? []).join(' '),
    categories: (skill.categories ?? []).join(' '),
  }));
}

function searchSkills(miniSearch, skills, query) {
  const results = miniSearch.search(query);
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  return results.map((result) => byId.get(result.id)).filter(Boolean);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  let raw;
  try {
    raw = await readFile(INDEX_PATH, 'utf8');
  } catch {
    throw new Error(`Missing ${INDEX_PATH} — run npm run build first.`);
  }

  const index = JSON.parse(raw);
  const { skills } = index;
  assert(Array.isArray(skills) && skills.length > 0, 'index has no skills');

  const featured = [...skills].filter(isFeatured).sort((a, b) => a.featured_order - b.featured_order);
  assert(featured.length === FEATURED_SKILL_IDS.length, `expected ${FEATURED_SKILL_IDS.length} featured skills`);
  assert(
    featured.every((skill, i) => skill.id === FEATURED_SKILL_IDS[i] && skill.featured_order === i + 1),
    'featured_order 1-10 does not match FEATURED_SKILL_IDS',
  );

  const defaultOrder = [...skills].sort(defaultSort);
  assert(
    defaultOrder.slice(0, FEATURED_SKILL_IDS.length).every((skill, i) => skill.id === FEATURED_SKILL_IDS[i]),
    'default sort does not put featured skills first in featured_order',
  );

  const miniSearch = new MiniSearch(SEARCH_OPTIONS);
  miniSearch.addAll(documentsForIndex(skills));

  const nonsense = searchSkills(miniSearch, skills, 'zzzz-no-match-xyz');
  assert(nonsense.length === 0, `zzzz-no-match-xyz should return 0 hits, got ${nonsense.length}`);

  const codeql = searchSkills(miniSearch, skills, 'codeql');
  assert(codeql.some((skill) => skill.id === 'awesome-copilot-codeql'), 'codeql search should include CodeQL');
  assert(codeql[0].id === 'awesome-copilot-codeql', `codeql top hit should be CodeQL, got ${codeql[0]?.id}`);
  assert(
    !isFeatured(codeql[0]),
    'codeql search must not pin a featured skill ahead of CodeQL',
  );

  const semgrep = searchSkills(miniSearch, skills, 'semgrep');
  assert(semgrep.length > 0, 'semgrep search should return hits');
  assert(
    semgrep[0].id === 'semgrep-skills-semgrep' || semgrep[0].name === 'Semgrep',
    `semgrep top hit should be Semgrep, got ${semgrep[0]?.id}`,
  );
  assert(!isFeatured(semgrep[0]), 'semgrep search must not pin featured skills first');

  console.log(`Search smoke tests passed (${skills.length} skills).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
