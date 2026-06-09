#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  ROOT,
  buildSkillFileUrl,
  folderUrlFromSkillFile,
  loadCatalog,
  parseFrontmatter,
  rawUrlFromSkillFile,
  resolvePrimaryFile,
  validateSkillEntry,
} from './lib/catalog.mjs';
import { fetchText } from './lib/fetch.mjs';

const OUTPUT_DIR = join(ROOT, 'docs', 'data');
const CONCURRENCY = 6;

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function buildSearchText(skill, frontmatter, body) {
  const parts = [
    skill.name,
    skill.description,
    skill.id,
    ...(skill.tags ?? []),
    ...(skill.categories ?? []),
    frontmatter.description,
    frontmatter.name,
    body,
  ];

  return parts.filter(Boolean).join('\n').replace(/\s+/g, ' ').trim();
}

async function buildEntry(skill, repositories, tiers, categories) {
  const schemaErrors = validateSkillEntry(skill, repositories, tiers, categories);
  if (schemaErrors.length > 0) {
    throw new Error(`${skill.id}: ${schemaErrors.join(', ')}`);
  }

  const repo = repositories.get(skill.repository);
  const kind = skill.kind ?? 'skill';
  const primaryFile = resolvePrimaryFile(skill);
  const skillFileUrl = buildSkillFileUrl(repo, skill);
  const folderUrl = folderUrlFromSkillFile(skillFileUrl);
  const rawUrl = rawUrlFromSkillFile(skillFileUrl);

  let content = '';
  let frontmatter = {};
  try {
    content = await fetchText(rawUrl);
    ({ frontmatter } = parseFrontmatter(content));
  } catch (error) {
    console.warn(`Warning: could not fetch ${skill.id}: ${error.message}`);
  }

  const tier = tiers.get(skill.trust_tier);
  const categoryLabels = skill.categories.map((id) => categories.get(id)?.label ?? id);

  return {
    id: skill.id,
    name: skill.name,
    description: skill.description ?? frontmatter.description ?? '',
    kind,
    primary_file: primaryFile,
    trust_tier: skill.trust_tier,
    trust_label: tier.label,
    trust_order: tier.order,
    categories: skill.categories,
    category_labels: categoryLabels,
    tags: skill.tags ?? [],
    repository: {
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      ref: repo.ref,
      url: repo.url,
    },
    path: skill.path ?? '',
    skill_file_url: skillFileUrl,
    folder_url: folderUrl,
    repo_url: repo.url,
    search_text: buildSearchText(skill, frontmatter, content),
  };
}

async function main() {
  const { repositories, tiers, categories, skills } = await loadCatalog();

  console.log(`Building index for ${skills.length} skills...`);
  const entries = await mapWithConcurrency(skills, CONCURRENCY, (skill) =>
    buildEntry(skill, repositories, tiers, categories),
  );

  const index = {
    generated_at: new Date().toISOString(),
    version: 1,
    meta: {
      total: entries.length,
      tiers: [...tiers.values()].sort((a, b) => a.order - b.order),
      categories: [...categories.values()].sort((a, b) => a.order - b.order),
    },
    skills: entries.sort((a, b) => a.name.localeCompare(b.name)),
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(join(OUTPUT_DIR, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);

  console.log(`Wrote ${join('docs/data/index.json')} (${entries.length} entries).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});