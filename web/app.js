const REPO_URL = 'https://github.com/jahnog/CuratedSkills';

// Keep in sync with scripts/test-search.mjs
const SEARCH_OPTIONS = {
  fields: ['name', 'description', 'tags', 'categories', 'id'],
  storeFields: ['id'],
  processTerm(term) {
    const normalized = term.toLowerCase();
    return normalized.length < 2 ? null : normalized;
  },
  searchOptions: {
    boost: { name: 3, id: 2, tags: 2, description: 1.5, categories: 1.2 },
    prefix: true,
    combineWith: 'AND',
    fuzzy: (term) => (term.length > 3 ? 0.2 : null),
  },
};

const SEARCH_TRACK_DELAY_MS = 500;

const state = {
  index: null,
  miniSearch: null,
  query: '',
  activeTiers: new Set(),
  activeCategories: new Set(),
  searchTrackTimer: 0,
  lastTrackedQuery: '',
};

function analyticsApi() {
  return (
    window.CuratedSkillsAnalytics || {
      trackSearch() {},
      trackSiteSearch() {},
      trackEvent() {},
      setTheme() {},
      trackSkill() {},
    }
  );
}

const elements = {
  search: document.getElementById('search'),
  tierFilters: document.getElementById('tier-filters'),
  categoryFilters: document.getElementById('category-filters'),
  skillGrid: document.getElementById('skill-grid'),
  emptyState: document.getElementById('empty-state'),
  resultsMeta: document.getElementById('results-meta'),
  themeToggle: document.getElementById('theme-toggle'),
  repoLink: document.getElementById('repo-link'),
};

function tierBadgeClass(tierId) {
  return `badge tier-${tierId}`;
}

function isFeatured(skill) {
  return Number.isInteger(skill.featured_order);
}

function defaultSort(a, b) {
  const aFeatured = isFeatured(a);
  const bFeatured = isFeatured(b);
  if (aFeatured && bFeatured) return a.featured_order - b.featured_order;
  if (aFeatured) return -1;
  if (bFeatured) return 1;
  return a.name.localeCompare(b.name);
}

function initTheme() {
  const saved = localStorage.getItem('curated-skills-theme');
  const theme = saved === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  const icon = elements.themeToggle.querySelector('.theme-icon');
  icon.textContent = theme === 'dark' ? '☀' : '☾';
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('curated-skills-theme', next);
  updateThemeIcon(next);
  analyticsApi().setTheme(next);
  analyticsApi().trackEvent('ui', 'theme_toggle', next);
}

function createChip(label, value, group) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.textContent = label;
  button.dataset.value = value;
  button.dataset.group = group;
  button.addEventListener('click', () => {
    const set = group === 'tier' ? state.activeTiers : state.activeCategories;
    const action = group === 'tier' ? 'filter_tier' : 'filter_category';
    if (set.has(value)) {
      set.delete(value);
      button.classList.remove('active');
      analyticsApi().trackEvent('catalog', action, value, 0);
    } else {
      set.add(value);
      button.classList.add('active');
      analyticsApi().trackEvent('catalog', action, value, 1);
    }
    render();
  });
  return button;
}

function renderFilters() {
  const { meta } = state.index;

  elements.tierFilters.replaceChildren(
    ...meta.tiers.map((tier) => createChip(tier.label, tier.id, 'tier')),
  );

  elements.categoryFilters.replaceChildren(
    ...meta.categories.map((category) =>
      createChip(category.label, category.id, 'category'),
    ),
  );
}

function matchesFilters(skill) {
  if (state.activeTiers.size > 0 && !state.activeTiers.has(skill.trust_tier)) {
    return false;
  }
  if (state.activeCategories.size > 0) {
    const hasCategory = skill.categories.some((id) => state.activeCategories.has(id));
    if (!hasCategory) return false;
  }
  return true;
}

function documentsForIndex(skills) {
  return skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description ?? '',
    tags: (skill.tags ?? []).join(' '),
    categories: (skill.categories ?? []).join(' '),
  }));
}

function getVisibleSkills() {
  const trimmed = state.query.trim();
  let skills;

  if (trimmed) {
    const results = state.miniSearch.search(trimmed);
    const byId = new Map(state.index.skills.map((skill) => [skill.id, skill]));
    skills = results.map((result) => byId.get(result.id)).filter(Boolean);
  } else {
    skills = [...state.index.skills].sort(defaultSort);
  }

  return skills.filter(matchesFilters);
}

function primaryFileLabel(skill) {
  if (skill.kind === 'mcp') return 'Open README';
  if (skill.kind === 'action') return `Open ${skill.primary_file}`;
  if (skill.primary_file && skill.primary_file !== 'SKILL.md') {
    return `Open ${skill.primary_file}`;
  }
  return 'Open SKILL.md';
}

function renderCard(skill) {
  const card = document.createElement('a');
  card.className = 'skill-card';
  card.href = skill.folder_url;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.setAttribute('role', 'listitem');
  card.title = `Open ${skill.name} folder on GitHub`;

  const tierClass = tierBadgeClass(skill.trust_tier);
  const featuredPill = isFeatured(skill)
    ? '<span class="meta-pill featured-pill">Featured</span>'
    : '';

  card.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">${escapeHtml(skill.name)}</h2>
      <span class="${tierClass}">${escapeHtml(skill.trust_label)}</span>
    </div>
    <p class="card-description">${escapeHtml(skill.description)}</p>
    <div class="card-meta">
      ${featuredPill}
      ${skill.category_labels.map((label) => `<span class="meta-pill">${escapeHtml(label)}</span>`).join('')}
      ${skill.tags.slice(0, 3).map((tag) => `<span class="meta-pill">${escapeHtml(tag)}</span>`).join('')}
    </div>
    <div class="card-footer">
      <span class="repo-label">${escapeHtml(`${skill.repository.owner}/${skill.repository.name}`)}</span>
      <span class="file-link" data-file-link>${escapeHtml(primaryFileLabel(skill))}</span>
    </div>
  `;

  const fileLink = card.querySelector('[data-file-link]');
  fileLink.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    flushSearchTracking();
    analyticsApi().trackSkill('open_file', skill.id, skill.categories && skill.categories[0]);
    window.open(skill.skill_file_url, '_blank', 'noopener,noreferrer');
  });

  card.addEventListener('click', () => {
    flushSearchTracking();
    analyticsApi().trackSkill('open_folder', skill.id, skill.categories && skill.categories[0]);
  });

  return card;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sendSearchTracking() {
  const trimmed = state.query.trim();
  if (trimmed.length < 2) {
    state.lastTrackedQuery = '';
    return;
  }
  if (state.lastTrackedQuery === trimmed) return;
  state.lastTrackedQuery = trimmed;
  analyticsApi().trackSearch(trimmed, getVisibleSkills().length);
}

function flushSearchTracking() {
  if (state.searchTrackTimer) {
    clearTimeout(state.searchTrackTimer);
    state.searchTrackTimer = 0;
  }
  sendSearchTracking();
}

function scheduleSearchTracking() {
  if (state.searchTrackTimer) {
    clearTimeout(state.searchTrackTimer);
  }
  state.searchTrackTimer = setTimeout(() => {
    state.searchTrackTimer = 0;
    sendSearchTracking();
  }, SEARCH_TRACK_DELAY_MS);
}

function render() {
  const visible = getVisibleSkills();

  elements.skillGrid.replaceChildren(...visible.map(renderCard));
  elements.emptyState.hidden = visible.length > 0;
  elements.resultsMeta.textContent = `${visible.length} of ${state.index.skills.length} skills`;
}

function initSearch() {
  state.miniSearch = new MiniSearch(SEARCH_OPTIONS);
  state.miniSearch.addAll(documentsForIndex(state.index.skills));
}

async function loadIndex() {
  if (globalThis.__CURATED_SKILLS_INDEX__) {
    state.index = globalThis.__CURATED_SKILLS_INDEX__;
    return;
  }

  const response = await fetch('./data/index.json');
  if (!response.ok) {
    throw new Error(`Failed to load index: HTTP ${response.status}`);
  }
  state.index = await response.json();
}

async function main() {
  initTheme();
  if (elements.repoLink) {
    elements.repoLink.href = REPO_URL;
  }
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.search.addEventListener('input', (event) => {
    state.query = event.target.value;
    render();
    scheduleSearchTracking();
  });
  elements.search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      flushSearchTracking();
    }
  });
  elements.search.addEventListener('blur', () => {
    flushSearchTracking();
  });

  await loadIndex();
  initSearch();
  renderFilters();
  render();
}

main().catch((error) => {
  console.error(error);
  elements.resultsMeta.textContent = 'Failed to load skill index.';
});
