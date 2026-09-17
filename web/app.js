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
  clearFilters: document.getElementById('clear-filters'),
  loadError: document.getElementById('load-error'),
  resultsMeta: document.getElementById('results-meta'),
  repoLink: document.getElementById('repo-link'),
};

function tierBadgeClass(tierId) {
  return `wl-chip badge tier-${tierId}`;
}

function tierDescription(tierId) {
  const tier = state.index.meta.tiers.find((t) => t.id === tierId);
  return tier ? tier.description : '';
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

function createChip(label, value, group, description) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'wl-chip wl-chip-btn';
  button.textContent = label;
  button.dataset.value = value;
  button.dataset.group = group;
  button.setAttribute('aria-pressed', 'false');
  if (description) button.title = description;
  button.addEventListener('click', () => {
    const set = group === 'tier' ? state.activeTiers : state.activeCategories;
    const action = group === 'tier' ? 'filter_tier' : 'filter_category';
    if (set.has(value)) {
      set.delete(value);
      button.setAttribute('aria-pressed', 'false');
      analyticsApi().trackEvent('catalog', action, value, 0);
    } else {
      set.add(value);
      button.setAttribute('aria-pressed', 'true');
      analyticsApi().trackEvent('catalog', action, value, 1);
    }
    render();
  });
  return button;
}

function clearFilters() {
  state.activeTiers.clear();
  state.activeCategories.clear();
  state.query = '';
  elements.search.value = '';
  for (const chip of document.querySelectorAll('#filters [aria-pressed]')) {
    chip.setAttribute('aria-pressed', 'false');
  }
  render();
  elements.search.focus();
}

function renderFilters() {
  const { meta } = state.index;

  elements.tierFilters.replaceChildren(
    ...meta.tiers.map((tier) => createChip(tier.label, tier.id, 'tier', tier.description)),
  );

  elements.categoryFilters.replaceChildren(
    ...meta.categories.map((category) =>
      createChip(category.label, category.id, 'category', category.description),
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
  const card = document.createElement('article');
  card.className = 'skill-card wl-panel';

  const tierClass = tierBadgeClass(skill.trust_tier);
  const featuredPill = isFeatured(skill)
    ? '<span class="wl-chip meta-pill featured-pill">Featured</span>'
    : '';

  // The title link is stretched over the whole card (see styles.css), so
  // the card acts as one link while the markup stays valid: no nested <a>.
  card.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">
        <a class="card-link" data-folder-link href="${escapeHtml(skill.folder_url)}" target="_blank" rel="noopener noreferrer" title="Open ${escapeHtml(skill.name)} folder on GitHub">${escapeHtml(skill.name)}</a>
      </h2>
      <span class="${tierClass}" title="${escapeHtml(tierDescription(skill.trust_tier))}">${escapeHtml(skill.trust_label)} trust</span>
    </div>
    <p class="card-description">${escapeHtml(skill.description)}</p>
    <div class="card-meta">
      ${featuredPill}
      ${skill.category_labels.map((label) => `<span class="wl-chip meta-pill">${escapeHtml(label)}</span>`).join('')}
      ${skill.tags.slice(0, 3).map((tag) => `<span class="wl-chip meta-pill">${escapeHtml(tag)}</span>`).join('')}
    </div>
    <div class="card-footer">
      <span class="repo-label">${escapeHtml(`${skill.repository.owner}/${skill.repository.name}`)}</span>
      <a class="file-link" data-file-link href="${escapeHtml(skill.skill_file_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(primaryFileLabel(skill))}</a>
    </div>
  `;

  card.querySelector('[data-file-link]').addEventListener('click', () => {
    flushSearchTracking();
    analyticsApi().trackSkill('open_file', skill.id, skill.categories && skill.categories[0]);
  });

  card.querySelector('[data-folder-link]').addEventListener('click', () => {
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
  elements.resultsMeta.textContent = `Showing ${visible.length} of ${state.index.skills.length} skills`;
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
  if (elements.repoLink) {
    elements.repoLink.href = REPO_URL;
  }
  elements.clearFilters.addEventListener('click', clearFilters);
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
  elements.resultsMeta.textContent = '';
  elements.loadError.textContent = 'The skill catalog could not be loaded. Reload the page or open the source repository.';
  elements.loadError.hidden = false;
});
