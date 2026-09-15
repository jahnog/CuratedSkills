(function () {
  const SITE_ID = '17';
  const TRACKER_BASE = 'https://contentlabstudy.com/Mat0mo/';
  const THEME_DIMENSION_ID = 2;
  const SKILL_CATEGORY_DIMENSION_ID = 1;
  const THEME_KEY = 'curated-skills-theme';
  const PRODUCTION_HOST = 'jahnog.github.io';

  function noop() {}

  const disabled = {
    trackSearch: noop,
    trackSiteSearch: noop,
    trackEvent: noop,
    setTheme: noop,
    trackSkill: noop,
  };

  if (typeof location === 'undefined' || location.hostname !== PRODUCTION_HOST) {
    window.CuratedSkillsAnalytics = disabled;
    return;
  }

  const _paq = (window._paq = window._paq || []);

  function currentTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }

  function canonicalUrl() {
    let path = location.pathname.replace(/\/index\.html$/i, '/');
    if (path !== '/' && path.slice(-1) !== '/') {
      path += '/';
    }
    return location.origin + path + location.search;
  }

  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    _paq.push(['setCustomDimension', THEME_DIMENSION_ID, theme]);
  }

  function trackSiteSearch(query, resultCount) {
    const keyword = String(query ?? '').trim();
    if (keyword.length < 2) return;
    const count = Number(resultCount);
    _paq.push(['trackSiteSearch', keyword, false, Number.isFinite(count) ? count : false]);
  }

  function searchActionUrl(keyword) {
    const base = canonicalUrl();
    const encoded = encodeURIComponent(keyword);
    return base.includes('?') ? `${base}&q=${encoded}` : `${base}?q=${encoded}`;
  }

  function trackSearch(query, resultCount) {
    const keyword = String(query ?? '').trim();
    if (keyword.length < 2) return;
    const count = Number(resultCount);
    const results = Number.isFinite(count) ? count : false;
    const pageUrl = canonicalUrl();
    _paq.push(['setCustomUrl', searchActionUrl(keyword)]);
    _paq.push(['trackSiteSearch', keyword, false, results]);
    _paq.push(['setCustomUrl', pageUrl]);
    trackEvent('catalog', 'search', keyword, Number.isFinite(count) ? count : 0);
  }

  function trackEvent(category, action, name, value, dimensions) {
    if (!category || !action) return;
    const command = ['trackEvent', category, action];
    if (name != null && name !== '') {
      command.push(name);
      const numeric = Number(value);
      const hasDims = dimensions && typeof dimensions === 'object';
      if (hasDims) {
        command.push(Number.isFinite(numeric) ? numeric : 0);
        command.push(dimensions);
      } else if (Number.isFinite(numeric)) {
        command.push(numeric);
      }
    }
    _paq.push(command);
  }

  function trackSkill(action, skillId, categoryId) {
    if (!skillId) return;
    let dimensions;
    if (categoryId) {
      dimensions = { [`dimension${SKILL_CATEGORY_DIMENSION_ID}`]: String(categoryId) };
    }
    trackEvent('skill', action, skillId, 0, dimensions);
  }

  _paq.push(['disableCookies']);
  _paq.push(['appendToTrackingUrl', 'send_image=1']);
  _paq.push(['setCustomUrl', canonicalUrl()]);
  _paq.push(['setDocumentTitle', document.title]);
  setTheme(currentTheme());
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  _paq.push(['enableHeartBeatTimer', 15]);
  (function () {
    const u = TRACKER_BASE;
    _paq.push(['setTrackerUrl', u + 'matomo.php']);
    _paq.push(['setSiteId', SITE_ID]);
    const d = document;
    const g = d.createElement('script');
    const s = d.getElementsByTagName('script')[0];
    g.async = true;
    g.src = u + 'matomo.js';
    s.parentNode.insertBefore(g, s);
  })();

  window.CuratedSkillsAnalytics = {
    trackSearch,
    trackSiteSearch,
    trackEvent,
    setTheme,
    trackSkill,
  };
})();
