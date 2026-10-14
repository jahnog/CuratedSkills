import { lstat, readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
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

export const FIRST_PARTY_REPO_ID = 'curated-skills';
const MAX_SKILL_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_SKILL_LINES = 500;
const OVERLAY_KEYS = new Set(['id', 'title', 'trust_tier', 'categories', 'tags']);
const BANNED_EXTENSIONS = new Set(['.zip', '.skill', '.whl', '.exe', '.dll', '.so', '.dylib']);
const SCRIPT_EXTENSIONS = new Set(['.py', '.mjs', '.js', '.cjs', '.sh']);

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

  const localError = localRepositoryError(repositories);
  if (localError) throw new Error(localError);

  const firstParty = await readFirstParty(ROOT, {
    tiers,
    categories,
    externalIds: new Set(skillsDoc.skills.map((skill) => skill.id)),
    repositories,
  });
  if (firstParty.errors.length > 0) {
    const details = firstParty.errors
      .map((failure) => `${failure.id}: ${failure.errors.join('; ')}`)
      .join('\n');
    throw new Error(`First-party skills are invalid:\n${details}`);
  }

  return {
    repositories,
    tiers,
    categories,
    skills: [...skillsDoc.skills, ...firstParty.skills],
  };
}

export function localRepositoryError(repositories) {
  const local = [...repositories.values()].filter((repo) => repo.source === 'local');
  if (local.length !== 1 || local[0].id !== FIRST_PARTY_REPO_ID) {
    return 'exactly one repository may set source: local, and its id must be curated-skills';
  }
  return '';
}

function characterLength(value) {
  return [...value].length;
}

function lineCount(text) {
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  return lines.length;
}

export function parseSkillDocument(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { error: 'SKILL.md is missing YAML frontmatter' };

  let frontmatter;
  try {
    frontmatter = parseYaml(match[1]);
  } catch (error) {
    return { error: `SKILL.md frontmatter is not valid YAML: ${error.message}` };
  }

  if (frontmatter === null || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    return { error: 'SKILL.md frontmatter must be a mapping' };
  }

  return { frontmatter, lineCount: lineCount(text) };
}

function skillNameErrors(name, dirName) {
  if (typeof name !== 'string' || name.trim() === '') {
    return ['name must be a non-empty string'];
  }

  const normalized = name.trim().normalize('NFKC');
  const errors = [];
  if (characterLength(normalized) > MAX_SKILL_NAME_LENGTH) {
    errors.push(`name exceeds ${MAX_SKILL_NAME_LENGTH} characters`);
  }
  if (normalized !== normalized.toLowerCase()) errors.push('name must be lowercase');
  if (normalized.startsWith('-') || normalized.endsWith('-')) {
    errors.push('name cannot start or end with a hyphen');
  }
  if (normalized.includes('--')) errors.push('name cannot contain consecutive hyphens');
  if (![...normalized].every((char) => char === '-' || /[\p{L}\p{N}]/u.test(char))) {
    errors.push('name contains invalid characters');
  }
  if (dirName.normalize('NFKC') !== normalized) {
    errors.push(`directory ${dirName} must match name ${normalized}`);
  }
  return errors;
}

function descriptionErrors(description) {
  if (typeof description !== 'string' || description.trim() === '') {
    return ['description must be a non-empty string'];
  }
  if (characterLength(description) > MAX_DESCRIPTION_LENGTH) {
    return [`description exceeds ${MAX_DESCRIPTION_LENGTH} characters`];
  }
  return [];
}

export function expectedScriptTest(root, id, filename) {
  const ext = extname(filename);
  const stem = filename.slice(0, -ext.length);
  const dir = join(root, 'tests', 'skills', id);
  if (ext === '.py') return join(dir, `test_${stem}.py`);
  return join(dir, `${stem}.test.mjs`);
}

async function inspectSkillTree(skillDir, root, id) {
  const errors = [];

  async function walk(dir, insideScripts) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        errors.push(`symlink: ${relative(skillDir, full)}`);
        continue;
      }
      if (entry.isDirectory()) {
        if (insideScripts) {
          errors.push(`scripts/ must contain only code files: ${entry.name}`);
          continue;
        }
        await walk(full, dir === skillDir && entry.name === 'scripts');
        continue;
      }

      if (entry.name === 'README.md') errors.push('README.md is not allowed in a skill directory');
      const ext = extname(entry.name).toLowerCase();
      if (BANNED_EXTENSIONS.has(ext)) errors.push(`banned file: ${relative(skillDir, full)}`);
      if (!insideScripts) continue;
      if (!SCRIPT_EXTENSIONS.has(ext)) {
        errors.push(`scripts/ must contain only code files: ${entry.name}`);
        continue;
      }
      const testPath = expectedScriptTest(root, id, entry.name);
      try {
        await readFile(testPath);
      } catch {
        errors.push(`missing unit test for scripts/${entry.name}`);
      }
    }
  }

  await walk(skillDir, false);
  return errors;
}

function overlayErrors(row, tiers, categories) {
  const errors = [];
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return ['each first-party entry must be a mapping'];
  }

  for (const key of Object.keys(row)) {
    if (!OVERLAY_KEYS.has(key)) errors.push(`unknown overlay key: ${key}`);
  }
  if (typeof row.id !== 'string' || row.id.trim() === '') errors.push('missing id');
  if (typeof row.title !== 'string' || row.title.trim() === '') errors.push('title is required');
  if (!row.trust_tier) errors.push('missing trust_tier');
  else if (!tiers.has(row.trust_tier)) errors.push(`unknown trust_tier: ${row.trust_tier}`);
  if (!Array.isArray(row.categories) || row.categories.length === 0) {
    errors.push('missing categories');
  } else {
    for (const categoryId of row.categories) {
      if (typeof categoryId !== 'string' || !categories.has(categoryId)) {
        errors.push(`unknown category: ${categoryId}`);
      }
    }
  }
  if (row.tags != null) {
    if (!Array.isArray(row.tags) || row.tags.some((tag) => typeof tag !== 'string')) {
      errors.push('tags must be an array of strings');
    }
  }
  return errors;
}

async function skillDirectoryNames(root) {
  try {
    const entries = await readdir(join(root, 'skills'), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function readFirstParty(root, { tiers, categories, externalIds, repositories }) {
  const failures = new Map();
  const add = (id, message) => {
    const key = id || 'first-party';
    if (!failures.has(key)) failures.set(key, []);
    failures.get(key).push(message);
  };

  let doc;
  try {
    doc = parseYaml(await readFile(join(root, 'catalog', 'first-party.yaml'), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        skills: [],
        errors: [{ id: 'first-party', errors: ['missing catalog/first-party.yaml'] }],
      };
    }
    return {
      skills: [],
      errors: [{ id: 'first-party', errors: [`catalog/first-party.yaml: ${error.message}`] }],
    };
  }

  if (!doc || typeof doc !== 'object' || Array.isArray(doc) || !Array.isArray(doc.skills)) {
    return {
      skills: [],
      errors: [{ id: 'first-party', errors: ['catalog/first-party.yaml must contain a skills list'] }],
    };
  }

  const rows = doc.skills;
  const directories = await skillDirectoryNames(root);
  const directorySet = new Set(directories);
  const seenIds = new Set();
  const skills = [];

  for (const row of rows) {
    const rowErrors = overlayErrors(row, tiers, categories);
    const id = row && typeof row.id === 'string' ? row.id : '';
    if (id && seenIds.has(id)) rowErrors.push(`duplicate id: ${id}`);
    if (id) seenIds.add(id);
    if (id && externalIds.has(id)) rowErrors.push(`id collides with an external skill: ${id}`);
    if (id && !directorySet.has(id)) rowErrors.push('no skill directory for this id');

    if (!id || !directorySet.has(id)) {
      for (const message of rowErrors) add(id, message);
      continue;
    }

    const skillDir = join(root, 'skills', id);
    const skillFile = join(skillDir, 'SKILL.md');
    let frontmatter = null;
    try {
      const stat = await lstat(skillFile);
      if (stat.isSymbolicLink()) rowErrors.push('symlink: SKILL.md');
      else if (!stat.isFile()) rowErrors.push('missing SKILL.md');
      else {
        const parsed = parseSkillDocument(await readFile(skillFile, 'utf8'));
        if (parsed.error) rowErrors.push(parsed.error);
        else {
          frontmatter = parsed.frontmatter;
          if (parsed.lineCount > MAX_SKILL_LINES) {
            rowErrors.push(`SKILL.md exceeds ${MAX_SKILL_LINES} lines`);
          }
          rowErrors.push(...skillNameErrors(frontmatter.name, id));
          rowErrors.push(...descriptionErrors(frontmatter.description));
          if (frontmatter.license !== 'MIT') rowErrors.push('license must be MIT');
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') rowErrors.push('missing SKILL.md');
      else rowErrors.push(error.message);
    }

    rowErrors.push(...(await inspectSkillTree(skillDir, root, id)));

    const merged = {
      id,
      name: typeof row.title === 'string' ? row.title : '',
      description: frontmatter && typeof frontmatter.description === 'string'
        ? frontmatter.description
        : '',
      repository: FIRST_PARTY_REPO_ID,
      path: `skills/${id}`,
      kind: 'skill',
      trust_tier: row.trust_tier,
      categories: Array.isArray(row.categories) ? row.categories : [],
      tags: Array.isArray(row.tags) ? row.tags : [],
      origin: 'first-party',
    };
    for (const message of validateSkillEntry(merged, repositories, tiers, categories)) {
      if (!rowErrors.includes(message)) rowErrors.push(message);
    }

    if (rowErrors.length > 0) {
      for (const message of rowErrors) add(id, message);
    } else {
      skills.push(merged);
    }
  }

  for (const dirName of directories) {
    if (!seenIds.has(dirName)) add(dirName, 'missing catalog/first-party.yaml entry');
  }

  return {
    skills,
    errors: [...failures.entries()].map(([id, errors]) => ({ id, errors })),
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