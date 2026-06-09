#!/usr/bin/env node
import {
  buildSkillFileUrl,
  folderUrlFromSkillFile,
  loadCatalog,
  rawUrlFromSkillFile,
  validateSkillEntry,
} from './lib/catalog.mjs';
import { checkUrl } from './lib/fetch.mjs';

async function main() {
  const { repositories, tiers, categories, skills } = await loadCatalog();
  const failures = [];

  for (const skill of skills) {
    const schemaErrors = validateSkillEntry(skill, repositories, tiers, categories);
    if (schemaErrors.length > 0) {
      failures.push({ id: skill.id, errors: schemaErrors });
      continue;
    }

    const repo = repositories.get(skill.repository);
    const skillFileUrl = buildSkillFileUrl(repo, skill);
    const folderUrl = folderUrlFromSkillFile(skillFileUrl);
    const rawUrl = rawUrlFromSkillFile(skillFileUrl);

    const recomputedFolder = folderUrlFromSkillFile(skillFileUrl);
    if (recomputedFolder !== folderUrl) {
      failures.push({
        id: skill.id,
        errors: ['folder_url derivation inconsistent'],
      });
      continue;
    }

    const ok = await checkUrl(rawUrl);
    if (!ok) {
      failures.push({
        id: skill.id,
        errors: [`primary file not reachable: ${rawUrl}`],
      });
    }
  }

  if (failures.length > 0) {
    console.error(`Validation failed for ${failures.length} entr${failures.length === 1 ? 'y' : 'ies'}:`);
    for (const failure of failures) {
      console.error(`  - ${failure.id}: ${failure.errors.join('; ')}`);
    }
    process.exit(1);
  }

  console.log(`Validated ${skills.length} catalog entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});