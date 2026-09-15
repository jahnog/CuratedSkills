# CuratedSkills

A curated registry of high-trust agent skills for software engineering and security — specs, tests, review, delivery, Dependabot PRs, static analysis, and security MCP servers.

**Live search:** [https://jahnog.github.io/CuratedSkills/](https://jahnog.github.io/CuratedSkills/)

## Features

- Human-edited YAML catalog with trust tiers and categories
- Client-side catalog search (name, description, tags, categories)
- Ten featured high-leverage engineering skills pinned at the top of the default view
- Minimal static UI (dark-first) generated into `docs/` and hosted on GitHub Pages
- Primary navigation opens the **skill folder** on GitHub; secondary link opens the primary file (`SKILL.md`, `README.md`, or `action.yml`)

## Quick start

```bash
npm install
npm run build
npm run preview
```

Then open http://127.0.0.1:4173/ . `web/` is the source UI; `docs/` is the generated site. Do not open `web/index.html` as the app.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run validate` | Validate catalog schema, featured set, and remote file URLs |
| `npm run build:index` | Fetch skill frontmatter and emit `docs/data/index.json` + `docs/data/index.js` |
| `npm run build:site` | Copy `web/` assets into `docs/` |
| `npm run build` | Full pipeline |
| `npm test` | Search and featured-order smoke tests against the generated index |
| `npm run preview` | Serve `docs/` at http://127.0.0.1:4173/ |

## Catalog layout

```
catalog/
├── skills.yaml          # Curated skill entries (featured_order on 10 skills)
├── repositories.yaml    # GitHub repo metadata
├── trust-tiers.yaml     # highest / high / medium
└── categories.yaml      # define-and-plan, testing, security, delivery, etc.
```

`folder_url` is always derived at build time from `skill_file_url` — never hand-authored.

## GitHub Pages

The site is built and published by `.github/workflows/build-and-deploy.yml` on push to `master` or `main`.

1. Settings → Pages → Source: **GitHub Actions** (not “Deploy from a branch /docs”; `docs/` is generated and gitignored)
2. Live URL: https://jahnog.github.io/CuratedSkills/
3. Production visits are recorded cookie-less in Matomo; `npm run preview` does not track.
