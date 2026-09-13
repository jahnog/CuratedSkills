const state = {
  index: null,
  miniSearch: null,
  query: '',
  activeTiers: new Set(),
  activeCategories: new Set(),
};

const elements = {
  search: document.getElementById('search'),
  tierFilters: document.getElementById('tier-filters'),
  categoryFilters: document.getElementById('category-filters'),
  skillGrid: document.getElementById('skill-grid'),
  emptyState: document.getElementById('empty-state'),
  resultsMeta: document.getElementById('results-meta'),
  themeToggle: document.getElementById('theme-toggle'),
};

function tierBadgeClass(tierId) {
  return `badge tier-${tierId}`;
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
    if (set.has(value)) {
      set.delete(value);
      button.classList.remove('active');
    } else {
      set.add(value);
      button.classList.add('active');
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

function getVisibleSkills() {
  const trimmed = state.query.trim();
  let skills = state.index.skills;

  if (trimmed) {
    const results = state.miniSearch.search(trimmed, {
      prefix: true,
      fuzzy: 0.15,
    });
    const ids = new Set(results.map((result) => result.id));
    skills = skills.filter((skill) => ids.has(skill.id));
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

  card.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">${escapeHtml(skill.name)}</h2>
      <span class="${tierClass}">${escapeHtml(skill.trust_label)}</span>
    </div>
    <p class="card-description">${escapeHtml(skill.description)}</p>
    <div class="card-meta">
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
    window.open(skill.skill_file_url, '_blank', 'noopener,noreferrer');
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

function render() {
  const visible = getVisibleSkills();

  elements.skillGrid.replaceChildren(...visible.map(renderCard));
  elements.emptyState.hidden = visible.length > 0;
  elements.resultsMeta.textContent = `${visible.length} of ${state.index.skills.length} skills`;
}

function initSearch() {
  state.miniSearch = new MiniSearch({
    fields: ['name', 'description', 'search_text', 'tags'],
    storeFields: ['id'],
    searchOptions: {
      boost: { name: 3, tags: 2, description: 1.5 },
    },
  });

  state.miniSearch.addAll(
    state.index.skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      search_text: skill.search_text,
      tags: skill.tags.join(' '),
    })),
  );
}

async function loadIndex() {
  const response = await fetch('./data/index.json');
  if (!response.ok) {
    throw new Error(`Failed to load index: HTTP ${response.status}`);
  }
  state.index = await response.json();
}

async function main() {
  initTheme();
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.search.addEventListener('input', (event) => {
    state.query = event.target.value;
    render();
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