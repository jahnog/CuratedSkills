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
- Network access: `npm run build` validates every catalog entry against GitHub and fetches each skill's frontmatter

## Quick start

```bash
npm install
npm run build
npm run preview
```

Then open http://127.0.0.1:4173/ (set `PORT` to use a different port). `web/` is the source UI; `docs/` is the generated site and is gitignored. Do not open `web/index.html` directly — the app needs the generated `docs/data/` index.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run validate` | Validate catalog schema, the featured set, and that every primary file is reachable on GitHub |
| `npm run build:index` | Fetch skill frontmatter and emit `docs/data/index.json` + `docs/data/index.js` |
| `npm run build:site` | Copy `web/` assets into `docs/` |
| `npm run build` | Full pipeline: `validate` → `build:index` → `build:site` |
| `npm test` | Search and featured-order tests against the generated index, plus analytics and theme checks (run `npm run build` first) |
| `npm run preview` | Serve `docs/` at http://127.0.0.1:4173/ |
| `npm run vendor` | Refresh `web/vendor/minisearch.min.js` from `node_modules` after upgrading MiniSearch |

## Catalog layout

```
catalog/
├── skills.yaml          # Curated skill entries (featured_order on 10 skills)
├── repositories.yaml    # GitHub repo metadata (owner, name, ref, url)
├── trust-tiers.yaml     # highest / high / medium
└── categories.yaml      # define-and-plan, testing, security, delivery, etc.
```

### Adding a skill

1. Make sure the source repository exists in `catalog/repositories.yaml` (add it if not).
2. Add an entry to `catalog/skills.yaml` with a unique `id`, `name`, `description`, `repository`, `path`, `trust_tier`, `categories`, and optional `tags`.
3. Set `kind` to `mcp` or `action` when the primary file is `README.md` or `action.yml` rather than `SKILL.md`; use `primary_file` to override the filename explicitly.
4. Run `npm run validate` — it checks references and confirms the primary file is reachable.

`skill_file_url` and `folder_url` are always derived at build time from the repository metadata and `path` — never hand-authored.

## GitHub Pages

The site is built and published by `.github/workflows/build-and-deploy.yml`. Pushes to `master` or `main` build, test, and deploy; pull requests only build and test.

- Settings → Pages → Source must be **GitHub Actions** (not "Deploy from a branch"), because `docs/` is generated and not committed.
- Live URL: https://jahnog.github.io/CuratedSkills/
- Production visits are recorded cookie-less with Matomo (see `web/analytics.js`). Analytics are disabled on any other hostname, including `npm run preview`.

## License

[MIT](LICENSE)
