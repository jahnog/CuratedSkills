import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');
export const CATALOG_DIR = join(ROOT, 'catalog');

const PRIMARY_FILES = {
  skill: 'SKILL.md',
  mcp: 'README.md',
  action: 'action.yml',
};

export async function loadYaml(relativePath) {
  const content = await readFile(join(CATALOG_DIR, relativePath), 'utf8');
  return parseYaml(content);
}

export async function loadCatalog() {
  const [repositoriesDoc, tiersDoc, categoriesDoc, skillsDoc] = await Promise.all([
    loadYaml('repositories.yaml'),
    loadYaml('trust-tiers.yaml'),
    loadYaml('categories.yaml'),
    loadYaml('skills.yaml'),
  ]);

  const repositories = new Map(
    repositoriesDoc.repositories.map((repo) => [repo.id, repo]),
  );
  const tiers = new Map(tiersDoc.tiers.map((tier) => [tier.id, tier]));
  const categories = new Map(
    categoriesDoc.categories.map((category) => [category.id, category]),
  );

  return {
    repositories,
    tiers,
    categories,
    skills: skillsDoc.skills,
  };
}

export function resolvePrimaryFile(skill) {
  if (skill.primary_file) return skill.primary_file;
  const kind = skill.kind ?? 'skill';
  return PRIMARY_FILES[kind] ?? 'SKILL.md';
}

export function buildSkillFileUrl(repo, skill) {
  const primaryFile = resolvePrimaryFile(skill);
  const pathParts = [skill.path, primaryFile].filter(Boolean);
  const filePath = pathParts.join('/');
  return `https://github.com/${repo.owner}/${repo.name}/blob/${repo.ref}/${filePath}`;
}

export function folderUrlFromSkillFile(skillFileUrl) {
  return skillFileUrl.replace(/\/[^/]+$/, '').replace('/blob/', '/tree/');
}

export function rawUrlFromSkillFile(skillFileUrl) {
  return skillFileUrl
    .replace('https://github.com/', 'https://raw.githubusercontent.com/')
    .replace('/blob/', '/');
}

export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: text.trim() };
  }

  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }

  return { frontmatter, body: match[2].trim() };
}

export const FEATURED_SKILL_IDS = [
  'awesome-copilot-acquire-codebase-knowledge',
  'addyosmani-spec-driven-development',
  'superpowers-writing-plans',
  'addyosmani-incremental-implementation',
  'superpowers-test-driven-development',
  'superpowers-systematic-debugging',
  'superpowers-verification-before-completion',
  'addyosmani-constraint-driven-development',
  'addyosmani-code-simplification',
  'addyosmani-code-review-quality',
];

export function validateSkillEntry(skill, repositories, tiers, categories) {
  const errors = [];

  if (!skill.id) errors.push('missing id');
  if (!skill.name) errors.push('missing name');
  if (!skill.repository) errors.push('missing repository');
  if (!repositories.has(skill.repository)) {
    errors.push(`unknown repository: ${skill.repository}`);
  }
  if (!skill.trust_tier) errors.push('missing trust_tier');
  if (!tiers.has(skill.trust_tier)) {
    errors.push(`unknown trust_tier: ${skill.trust_tier}`);
  }
  if (!Array.isArray(skill.categories) || skill.categories.length === 0) {
    errors.push('missing categories');
  } else {
    for (const categoryId of skill.categories) {
      if (!categories.has(categoryId)) {
        errors.push(`unknown category: ${categoryId}`);
      }
    }
  }

  if (skill.featured_order != null) {
    const order = skill.featured_order;
    if (!Number.isInteger(order) || order < 1 || order > FEATURED_SKILL_IDS.length) {
      errors.push(
        `featured_order must be an integer 1-${FEATURED_SKILL_IDS.length}, got ${JSON.stringify(order)}`,
      );
    }
  }

  return errors;
}

export function validateFeaturedSet(skills) {
  const errors = [];
  const featured = skills.filter((skill) => skill.featured_order != null);
  const byOrder = new Map();

  for (const skill of featured) {
    const order = skill.featured_order;
    if (byOrder.has(order)) {
      errors.push(
        `duplicate featured_order ${order}: ${byOrder.get(order)} and ${skill.id}`,
      );
    } else {
      byOrder.set(order, skill.id);
    }
  }

  if (featured.length !== FEATURED_SKILL_IDS.length) {
    errors.push(
      `expected ${FEATURED_SKILL_IDS.length} featured skills, found ${featured.length}`,
    );
  }

  for (const [index, expectedId] of FEATURED_SKILL_IDS.entries()) {
    const order = index + 1;
    const actualId = byOrder.get(order);
    if (actualId !== expectedId) {
      errors.push(
        `featured_order ${order} must be ${expectedId}, got ${actualId ?? 'missing'}`,
      );
    }
  }

  return errors;
}