# CuratedSkills

A curated registry of high-trust agent skills for software engineering and security — specs, tests, review, delivery, Dependabot PRs, static analysis, and security MCP servers.

**Live search:** [https://jahnog.github.io/CuratedSkills/](https://jahnog.github.io/CuratedSkills/)

## Features

- Human-edited YAML catalog with trust tiers and categories
- Client-side full-text search (name, description, tags, categories) powered by [MiniSearch](https://github.com/lucaong/minisearch)
- Ten featured high-leverage engineering skills pinned at the top of the default view
- Minimal static UI (`web/`, styled by `weblab.css`) generated into `docs/` and hosted on GitHub Pages
- Each card's primary link opens the **skill folder** on GitHub; the secondary link opens the primary file (`SKILL.md`, `README.md`, or `action.yml`)

## Prerequisites

- Node.js 20 or newer (CI uses Node 22)
- Network access: `npm run build` checks every external primary file on GitHub and reads skills maintained in this repository from disk
- [uv](https://docs.astral.sh/uv/) when `skills/` contains a skill, because `npm test` then runs the pinned scanners

## Quick start

```bash
npm install
npm run build
npm run preview
```

Then open http://127.0.0.1:4173/ (set `PORT` to use a different port). `web/` is the source UI; `docs/` is the generated site and is gitignored. Do not open `web/index.html` directly — the app needs the generated `docs/data/` index.

## Install a skill from this repository

Skills maintained here live in `skills/`. Install them with the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add jahnog/CuratedSkills
npx skills add jahnog/CuratedSkills@<skill-name>
```

`<skill-name>` is the skill's frontmatter `name`. From a checkout, `npx skills add .` installs that same tree so you can try a skill before publishing.

Install copies the skill's instructions and any scripts into the agent directories the CLI finds. The agent will follow those instructions, including running scripts. This site does not sandbox that execution.

Authoring rules are in [CONTRIBUTING.md](CONTRIBUTING.md). Vulnerability reports are in [SECURITY.md](SECURITY.md).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run validate` | Validate catalog schema, the featured set, external primary files on GitHub, and first-party files on disk |
| `npm run build:index` | Fetch external frontmatter, read first-party files from disk, and emit `docs/data/index.json` + `docs/data/index.js` |
| `npm run build:site` | Copy `web/` assets into `docs/` |
| `npm run build` | Full pipeline: `validate` → `build:index` → `build:site` |
| `npm test` | First-party rules, then search, analytics, and theme checks (search checks need `npm run build` first) |
| `npm run preview` | Serve `docs/` at http://127.0.0.1:4173/ |
| `npm run vendor` | Refresh `web/vendor/minisearch.min.js` from `node_modules` after upgrading MiniSearch |

## Catalog layout

```
catalog/
├── skills.yaml          # External skills (featured_order on 10 skills)
├── first-party.yaml     # Skills maintained in this repository
├── repositories.yaml    # GitHub repo metadata, including this repository
├── trust-tiers.yaml     # highest / high / medium
└── categories.yaml      # define-and-plan, testing, security, delivery, etc.
skills/                  # Optional. One directory per first-party skill
```

`skill_file_url` and `folder_url` are always derived at build time from the repository metadata and `path`. They are never hand-authored.

### Adding a skill

See [CONTRIBUTING.md](CONTRIBUTING.md) for an external catalog row or a skill maintained in this repository.

## GitHub Pages

The site is built and published by `.github/workflows/build-and-deploy.yml`. Pushes to `master` or `main` build, test, and deploy; pull requests only build and test.

- Settings → Pages → Source must be **GitHub Actions** (not "Deploy from a branch"), because `docs/` is generated and not committed.
- Live URL: https://jahnog.github.io/CuratedSkills/
- Production visits are recorded cookie-less with Matomo (see `web/analytics.js`). Analytics are disabled on any other hostname, including `npm run preview`.

## License

[MIT](LICENSE)
