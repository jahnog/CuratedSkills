#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import assert from 'node:assert/strict';
import {
  ROOT,
  buildSkillFileUrl,
  expectedScriptTest,
  folderUrlFromSkillFile,
  loadCatalog,
  loadYaml,
  localRepositoryError,
  readFirstParty,
  validateSkillEntry,
} from './lib/catalog.mjs';

const SKILLS_REF_REV = '69ef37e9424c0a7ea9dd2293b559e43ec8176379';
const SKILLSPECTOR_REV = 'c7958a3268d9498644b22edb75d0f051bbc8cbfc'; // v2.12.0
const PYTEST_VERSION = '8.4.2';

const tiersDoc = await loadYaml('trust-tiers.yaml');
const categoriesDoc = await loadYaml('categories.yaml');
const tiers = new Map(tiersDoc.tiers.map((tier) => [tier.id, tier]));
const categories = new Map(categoriesDoc.categories.map((category) => [category.id, category]));
const localRepo = {
  id: 'curated-skills',
  owner: 'jahnog',
  name: 'CuratedSkills',
  ref: 'master',
  url: 'https://github.com/jahnog/CuratedSkills',
  source: 'local',
};
const repositories = new Map([[localRepo.id, localRepo]]);

function context(externalIds = new Set()) {
  return { tiers, categories, externalIds, repositories };
}

function skillDocument({
  name = 'demo-skill',
  description = 'Does one clear thing.',
  license = 'MIT',
  body = 'Use the skill.',
} = {}) {
  return `---\nname: ${name}\ndescription: ${description}\nlicense: ${license}\n---\n\n${body}\n`;
}

function foldedSkillDocument() {
  return `---
name: demo-skill
description: >
  Checks the catalog
  reports one result.
license: MIT
---

Use the skill.
`;
}

function overlay(rows) {
  if (rows.length === 0) return 'skills: []\n';
  return `skills:\n${rows.map((row) => row.trimEnd()).join('\n')}\n`;
}

const VALID_ROW = `
  - id: demo-skill
    title: Demo Skill
    trust_tier: high
    categories: [code-quality]
    tags: [example]
`;

function messages(result) {
  return result.errors.flatMap((failure) => failure.errors);
}

function assertError(result, fragment) {
  const text = messages(result).join('\n');
  assert.ok(text.includes(fragment), `expected ${JSON.stringify(fragment)} in:\n${text}`);
}

async function withTree(files, run) {
  const root = await mkdtemp(join(tmpdir(), 'curated-skills-'));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const full = join(root, relativePath);
      await mkdir(join(full, '..'), { recursive: true });
      if (content !== null) await writeFile(full, content);
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export function toolCommands(skillDir) {
  return [
    [
      'uvx',
      '--from',
      `git+https://github.com/agentskills/agentskills.git@${SKILLS_REF_REV}#subdirectory=skills-ref`,
      'skills-ref',
      'validate',
      skillDir,
    ],
    [
      'uvx',
      '--from',
      `git+https://github.com/NVIDIA/SkillSpector.git@${SKILLSPECTOR_REV}`,
      'skillspector',
      'scan',
      skillDir,
      '--no-llm',
      '--fail-on-findings',
    ],
  ];
}

export function pythonTestCommand(testDir) {
  return ['uv', 'run', '--with', `pytest==${PYTEST_VERSION}`, 'pytest', testDir];
}

export function runChecked(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${file} exited ${code}`));
    });
  });
}

async function scriptNames(skillDir) {
  try {
    const entries = await readdir(join(skillDir, 'scripts'), { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function runSkillChecks(root, id, { tools = true, run = runChecked } = {}) {
  const jsTests = [];
  const pyTests = [];
  for (const name of await scriptNames(join(root, 'skills', id))) {
    const testPath = expectedScriptTest(root, id, name);
    if (extname(name) === '.py') pyTests.push(testPath);
    else jsTests.push(testPath);
  }
  if (jsTests.length > 0) await run(process.execPath, ['--test', ...jsTests]);
  if (pyTests.length > 0) {
    const [command, ...args] = pythonTestCommand(join(root, 'tests', 'skills', id));
    await run(command, args);
  }
  if (tools) {
    for (const argv of toolCommands(join(root, 'skills', id))) {
      await run(argv[0], argv.slice(1));
    }
  }
}

async function readTree(files, externalIds) {
  let result;
  await withTree(files, async (root) => {
    result = await readFirstParty(root, context(externalIds));
  });
  return result;
}

const empty = await readTree({ 'catalog/first-party.yaml': overlay([]) });
assert.deepEqual(empty, { skills: [], errors: [] });

const ignoredDraft = await readTree({
  'catalog/first-party.yaml': overlay([]),
  'skills/.draft/SKILL.md': 'not a skill\n',
});
assert.deepEqual(ignoredDraft, { skills: [], errors: [] });

const valid = await readTree({
  'catalog/first-party.yaml': overlay([VALID_ROW]),
  'skills/demo-skill/SKILL.md': foldedSkillDocument(),
});
assert.equal(valid.errors.length, 0, messages(valid).join('\n'));
assert.equal(valid.skills.length, 1);
const [skill] = valid.skills;
assert.equal(skill.origin, 'first-party');
assert.equal(skill.name, 'Demo Skill');
assert.equal(skill.description, 'Checks the catalog reports one result.\n');
assert.deepEqual(validateSkillEntry(skill, repositories, tiers, categories), []);
const fileUrl = buildSkillFileUrl(localRepo, skill);
assert.equal(fileUrl, 'https://github.com/jahnog/CuratedSkills/blob/master/skills/demo-skill/SKILL.md');
assert.equal(folderUrlFromSkillFile(fileUrl), 'https://github.com/jahnog/CuratedSkills/tree/master/skills/demo-skill');

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([]),
    'skills/demo-skill/SKILL.md': skillDocument(),
  }),
  'missing catalog/first-party.yaml entry',
);

assertError(
  await readTree({ 'catalog/first-party.yaml': overlay([VALID_ROW]) }),
  'no skill directory for this id',
);

await withTree({
  'catalog/first-party.yaml': overlay([VALID_ROW]),
  'skills/demo-skill/.keep': '',
}, async (root) => {
  assertError(await readFirstParty(root, context()), 'missing SKILL.md');
});

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW]),
    'skills/demo-skill/SKILL.md': skillDocument({ name: 'Bad_Name' }),
  }),
  'name must be lowercase',
);

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW]),
    'skills/demo-skill/SKILL.md': skillDocument({ license: 'Apache-2.0' }),
  }),
  'license must be MIT',
);

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW]),
    'skills/demo-skill/SKILL.md': skillDocument({ description: 'a'.repeat(1025) }),
  }),
  'description exceeds 1024 characters',
);

{
  const header = '---\nname: demo-skill\ndescription: Does one clear thing.\nlicense: MIT\n---\n';
  const headerLines = header.endsWith('\n') ? header.split('\n').length - 1 : header.split('\n').length;
  const body = `${Array.from({ length: 501 - headerLines }, (_, index) => `line ${index}`).join('\n')}\n`;
  assertError(
    await readTree({
      'catalog/first-party.yaml': overlay([VALID_ROW]),
      'skills/demo-skill/SKILL.md': header + body,
    }),
    'SKILL.md exceeds 500 lines',
  );
  const passingBody = `${Array.from({ length: 500 - headerLines }, (_, index) => `line ${index}`).join('\n')}\n`;
  const withinLimit = await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW]),
    'skills/demo-skill/SKILL.md': header + passingBody,
  });
  assert.equal(withinLimit.errors.length, 0, messages(withinLimit).join('\n'));
}

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW]),
    'skills/demo-skill/SKILL.md': skillDocument(),
    'skills/demo-skill/README.md': 'no\n',
  }),
  'README.md is not allowed in a skill directory',
);

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW.replace('trust_tier: high', 'trust_tier: legendary')]),
    'skills/demo-skill/SKILL.md': skillDocument(),
  }),
  'unknown trust_tier: legendary',
);

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW.replace('categories: [code-quality]', 'categories: [not-a-category]')]),
    'skills/demo-skill/SKILL.md': skillDocument(),
  }),
  'unknown category: not-a-category',
);

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([`${VALID_ROW}    featured_order: 1\n`]),
    'skills/demo-skill/SKILL.md': skillDocument(),
  }),
  'unknown overlay key: featured_order',
);

assertError(
  await readTree(
    {
      'catalog/first-party.yaml': overlay([VALID_ROW]),
      'skills/demo-skill/SKILL.md': skillDocument(),
    },
    new Set(['demo-skill']),
  ),
  'id collides with an external skill: demo-skill',
);

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW.replace('    title: Demo Skill\n', '')]),
    'skills/demo-skill/SKILL.md': skillDocument(),
  }),
  'title is required',
);

await withTree({
  'catalog/first-party.yaml': overlay([VALID_ROW]),
  'skills/demo-skill/SKILL.md': skillDocument(),
}, async (root) => {
  await symlink('SKILL.md', join(root, 'skills', 'demo-skill', 'extra.md'));
  assertError(await readFirstParty(root, context()), 'symlink: extra.md');
});

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW]),
    'skills/demo-skill/SKILL.md': skillDocument(),
    'skills/demo-skill/pack.zip': 'not a zip\n',
  }),
  'banned file: pack.zip',
);

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW]),
    'skills/demo-skill/SKILL.md': skillDocument(),
    'skills/demo-skill/scripts/extract.py': 'def extract():\n    return 1\n',
  }),
  'missing unit test for scripts/extract.py',
);

const paired = await readTree({
  'catalog/first-party.yaml': overlay([VALID_ROW]),
  'skills/demo-skill/SKILL.md': skillDocument(),
  'skills/demo-skill/scripts/extract.py': 'def extract():\n    return 1\n',
  'tests/skills/demo-skill/test_extract.py': 'def test_extract():\n    assert True\n',
});
assert.equal(paired.errors.length, 0, messages(paired).join('\n'));

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW]),
    'skills/demo-skill/SKILL.md': skillDocument(),
    'skills/demo-skill/scripts/notes.txt': 'notes\n',
  }),
  'scripts/ must contain only code files: notes.txt',
);

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW]),
    'skills/demo-skill/SKILL.md': skillDocument(),
    'skills/demo-skill/scripts/nested/run.py': 'print(1)\n',
  }),
  'scripts/ must contain only code files: nested',
);

const withImage = await readTree({
  'catalog/first-party.yaml': overlay([VALID_ROW]),
  'skills/demo-skill/SKILL.md': skillDocument(),
  'skills/demo-skill/assets/diagram.png': 'png\n',
});
assert.equal(withImage.errors.length, 0, messages(withImage).join('\n'));

assertError(
  await readTree({
    'catalog/first-party.yaml': overlay([VALID_ROW.replace('tags: [example]', 'tags: [1]')]),
    'skills/demo-skill/SKILL.md': skillDocument(),
  }),
  'tags must be an array of strings',
);

assert.equal(
  localRepositoryError(new Map([
    ['curated-skills', { id: 'curated-skills', source: 'local' }],
    ['other', { id: 'other', source: 'local' }],
  ])),
  'exactly one repository may set source: local, and its id must be curated-skills',
);
assert.equal(
  localRepositoryError(new Map([['curated-skills', { id: 'curated-skills', source: 'local' }]])),
  '',
);

const rootPair = '/tmp/pair-root';
assert.equal(expectedScriptTest(rootPair, 'demo-skill', 'extract.py'), join(rootPair, 'tests/skills/demo-skill/test_extract.py'));
assert.equal(expectedScriptTest(rootPair, 'demo-skill', 'check.mjs'), join(rootPair, 'tests/skills/demo-skill/check.test.mjs'));
assert.equal(expectedScriptTest(rootPair, 'demo-skill', 'run.sh'), join(rootPair, 'tests/skills/demo-skill/run.test.mjs'));
assert.equal(expectedScriptTest(rootPair, 'demo-skill', 'check.js'), join(rootPair, 'tests/skills/demo-skill/check.test.mjs'));
assert.equal(expectedScriptTest(rootPair, 'demo-skill', 'check.cjs'), join(rootPair, 'tests/skills/demo-skill/check.test.mjs'));

const demoDir = '/tmp/skills/demo-skill';
const commands = toolCommands(demoDir);
assert.equal(commands.length, 2);
assert.ok(commands[0].some((arg) => arg.includes(SKILLS_REF_REV)));
assert.ok(commands[0].includes('skills-ref'));
assert.ok(commands[0].includes(demoDir));
assert.ok(commands[1].includes('--no-llm'));
assert.ok(commands[1].includes('--fail-on-findings'));
assert.ok(commands[1].includes('skillspector'));
assert.ok(commands[1].includes(demoDir));
assert.ok(commands[1].some((arg) => arg.includes(SKILLSPECTOR_REV)));
assert.ok(pythonTestCommand('/tmp/tests').includes(`pytest==${PYTEST_VERSION}`));

await assert.rejects(
  () => runChecked(process.execPath, ['-e', 'process.exit(1)']),
  /exited 1/,
);
await runChecked(process.execPath, ['-e', 'process.exit(0)']);

await withTree({
  'skills/demo-skill/scripts/add.mjs': 'export function add(left, right) {\n  return left + right;\n}\n',
  'tests/skills/demo-skill/add.test.mjs': `import assert from 'node:assert/strict';
import test from 'node:test';
import { add } from '../../../skills/demo-skill/scripts/add.mjs';

test('add returns the sum', () => {
  assert.equal(add(1, 2), 3);
});
`,
}, async (root) => {
  await runSkillChecks(root, 'demo-skill', { tools: false });
  const calls = [];
  await runSkillChecks(root, 'demo-skill', {
    tools: true,
    run: async (command, args) => {
      calls.push([command, ...args]);
    },
  });
  assert.equal(calls.filter((argv) => argv.includes('--test')).length, 1);
  assert.equal(calls.filter((argv) => argv[0] === 'uvx').length, 2);
  assert.equal(calls.filter((argv) => argv.includes(`pytest==${PYTEST_VERSION}`)).length, 0);
});

await withTree({
  'skills/demo-skill/scripts/extract.py': 'def extract():\n    return 1\n',
  'skills/demo-skill/scripts/add.mjs': 'export const value = 1;\n',
}, async (root) => {
  const calls = [];
  await runSkillChecks(root, 'demo-skill', {
    tools: false,
    run: async (command, args) => {
      calls.push([command, ...args].join(' '));
    },
  });
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes('--test'));
  assert.ok(calls[1].includes(`pytest==${PYTEST_VERSION}`));
  assert.equal(calls.filter((call) => call.startsWith('uvx')).length, 0);
});

const catalog = await loadCatalog();
const firstParty = catalog.skills.filter((skill) => skill.origin === 'first-party');
assert.equal(firstParty.length, 0);
assert.equal(catalog.skills.length, 75);
for (const entry of firstParty) {
  await runSkillChecks(ROOT, entry.id, { tools: true });
}

console.log('First-party tests passed.');
