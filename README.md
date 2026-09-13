# CuratedSkills

A curated registry of high-trust agent skills for software engineering and security — specs, tests, review, delivery, Dependabot PRs, static analysis, and security MCP servers.

## Features

- Human-edited YAML catalog with trust tiers and categories
- Build-time full-text search index from remote skill content
- Minimal static UI (dark-first) hosted on GitHub Pages from `/docs`
- Primary navigation opens the **skill folder** on GitHub; secondary link opens the primary file (`SKILL.md`, `README.md`, or `action.yml`)

## Quick start

```bash
npm install
npm run build
```

Open `docs/index.html` locally or enable GitHub Pages with source set to `/docs`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run validate` | Validate catalog schema and remote file URLs |
| `npm run build:index` | Fetch skill content and emit `docs/data/index.json` |
| `npm run build:site` | Copy `web/` assets into `docs/` |
| `npm run build` | Full pipeline |

## Catalog layout

```
catalog/
├── skills.yaml          # Curated skill entries
├── repositories.yaml    # GitHub repo metadata
├── trust-tiers.yaml     # highest / high / medium
└── categories.yaml      # define-and-plan, testing, security, delivery, etc.
```

`folder_url` is always derived at build time from `skill_file_url` — never hand-authored.

## GitHub Pages

1. Push to `main` or `master`
2. Enable Pages: Settings → Pages → Source: **GitHub Actions**
3. The workflow builds and deploys from `/docs`
