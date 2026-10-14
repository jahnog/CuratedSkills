# Contributing

## External skill

1. Add the source repository to `catalog/repositories.yaml` if it is not already there. Do not set `source: local`. That field belongs only to the `curated-skills` record.
2. Add a row to `catalog/skills.yaml` with a unique `id`, `name`, `description`, `repository`, `path`, `trust_tier`, `categories`, and optional `tags`.
3. Set `kind` to `mcp` or `action` when the primary file is `README.md` or `action.yml`. Set `primary_file` to override the filename.
4. Do not set `skill_file_url` or `folder_url`. The build derives them from the repository record and `path`.
5. Run `npm run validate`. It checks the schema and that the primary file is reachable on GitHub.

Do not point a `catalog/skills.yaml` row at `curated-skills`. Skills maintained in this repository come from `skills/` and `catalog/first-party.yaml`.

## First-party skill

Create `skills/<name>/SKILL.md`. `<name>` is one directory deep. It matches the frontmatter `name`: 1–64 characters, lowercase letters, digits, and hyphens, no leading, trailing, or doubled hyphen. The [skills CLI](https://github.com/vercel-labs/skills) discovers that layout.

`SKILL.md` follows the [Agent Skills specification](https://agentskills.io/specification), plus these registry rules:

- `license` is `MIT`, the same grant as this repository.
- `description` is a non-empty string of at most 1024 characters. The catalog card uses it and does not copy it into YAML.
- The whole file is at most 500 lines. Put longer material in `references/` or `scripts/`, using paths relative to the skill root.
- No `README.md` in the skill directory. Instructions belong in `SKILL.md`.
- No symlinks, and no `.zip`, `.skill`, `.whl`, `.exe`, `.dll`, `.so`, or `.dylib` files. Images in `assets/` are allowed.

Add one row to `catalog/first-party.yaml`:

```yaml
skills:
  - id: skill-name
    title: Skill Name
    trust_tier: high
    categories: [code-quality]
    tags: [example]
```

`id` is the directory name. `title` is the card heading. `tags` is optional and defaults to an empty list. Any other key fails validation. `trust_tier` is `highest`, `high`, or `medium`, and it is required. `high` is the usual tier for a skill this registry publishes. Do not set `featured_order`. Local skills are not featured.

`npm test` runs [skills-ref](https://github.com/agentskills/agentskills/tree/main/skills-ref) and [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) (`skillspector scan --no-llm --fail-on-findings`) when `skills/` contains a skill. A clean scan is not a safety promise. There is no allowance list. Fix findings in the skill.

Code under `scripts/` is limited to `.py`, `.mjs`, `.js`, `.cjs`, and `.sh`, with no subdirectories. Pair each file with a unit test kept outside the skill so `npx skills add` does not install the test:

| Script | Test |
| --- | --- |
| `scripts/extract.py` | `tests/skills/<name>/test_extract.py` |
| `scripts/check.mjs` (also `.js` and `.cjs`) | `tests/skills/<name>/check.test.mjs` |
| `scripts/run.sh` | `tests/skills/<name>/run.test.mjs` |

Assert an observable result. The runner checks that the test command exits 0. It does not judge how strong the assertion is. For each skill it runs `node --test` once for the JavaScript and shell tests, and `uv run` with the pinned pytest version once for the Python tests. The pin is in `scripts/test-first-party.mjs`. No scripts means those commands do not start.

Do not copy vendor skill packs (Claude, Cursor, Grok, or editor bundles) into this repository. Write the skill here, or link an external repository from `catalog/skills.yaml`.

Install instructions are in the README. From a checkout, the local install command there is how you try a skill before publishing.

## Checks

`npm test` runs the registry rules without network, then the search, analytics, and theme checks. The search checks need a prior `npm run build`. When `skills/` contains a skill, `npm test` also needs [uv](https://docs.astral.sh/uv/). Do not install pytest into the system Python.

Report security issues as described in [SECURITY.md](SECURITY.md).
