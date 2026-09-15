#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';
import { ROOT } from './lib/catalog.mjs';

const SITE_ID = '17';
const INDEX_PATH = join(ROOT, 'web', 'index.html');
const ANALYTICS_PATH = join(ROOT, 'web', 'analytics.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runAnalytics(source, hostname) {
  let injectedSrc = null;
  const document = {
    title: 'CuratedSkills',
    createElement() {
      return { async: false, src: '' };
    },
    getElementsByTagName() {
      return [
        {
          parentNode: {
            insertBefore(el) {
              injectedSrc = el.src;
            },
          },
        },
      ];
    },
  };
  const window = { document };
  const context = {
    window,
    document,
    location: {
      hostname,
      pathname: '/CuratedSkills/',
      origin: `https://${hostname}`,
      search: '',
    },
    localStorage: {
      getItem() {
        return null;
      },
    },
  };
  vm.runInNewContext(source, context);
  return { window, injectedSrc };
}

async function main() {
  const html = await readFile(INDEX_PATH, 'utf8');
  const analytics = await readFile(ANALYTICS_PATH, 'utf8');

  assert(html.includes('src="./analytics.js"'), 'index.html must load analytics.js');
  assert(
    html.includes(`matomo.php?idsite=${SITE_ID}&amp;rec=1`),
    `index.html noscript pixel must use idsite=${SITE_ID}`,
  );
  assert(html.includes('contentlabstudy.com/Mat0mo/matomo.php'), 'noscript pixel must hit Matomo');

  assert(analytics.includes("SITE_ID = '17'"), 'analytics.js must set site id 17');
  assert(analytics.includes('contentlabstudy.com/Mat0mo/'), 'analytics.js must use the Matomo host');
  assert(analytics.includes("disableCookies"), 'analytics.js must disable cookies');
  assert(analytics.includes('send_image=1'), 'analytics.js must work around Firefox 204/nosniff');
  assert(analytics.includes("setSiteId"), 'analytics.js must call setSiteId');
  assert(
    analytics.includes("PRODUCTION_HOST = 'jahnog.github.io'"),
    'analytics.js must guard on the GitHub Pages host',
  );
  assert(analytics.includes("THEME_DIMENSION_ID = 2"), 'visit Theme dimension id must be 2');
  assert(
    analytics.includes('SKILL_CATEGORY_DIMENSION_ID = 1'),
    'action Skill category dimension id must be 1',
  );
  assert(
    analytics.includes('location.hostname !== PRODUCTION_HOST'),
    'analytics.js must no-op off the production host',
  );

  const local = runAnalytics(analytics, '127.0.0.1');
  assert(!local.injectedSrc, 'must not inject matomo.js on 127.0.0.1');
  assert(!local.window._paq, 'must not create a tracker queue on preview');
  assert(typeof local.window.CuratedSkillsAnalytics.trackEvent === 'function', 'helpers must exist locally');
  assert(typeof local.window.CuratedSkillsAnalytics.trackSearch === 'function', 'trackSearch helper must exist');

  const prod = runAnalytics(analytics, 'jahnog.github.io');
  assert(
    typeof prod.injectedSrc === 'string' && prod.injectedSrc.includes('matomo.js'),
    'must inject matomo.js on GitHub Pages',
  );
  assert(Array.isArray(prod.window._paq), 'must queue tracker commands on production');
  assert(
    prod.window._paq.some((command) => command[0] === 'disableCookies'),
    'production bootstrap must disable cookies',
  );
  assert(
    prod.window._paq.some((command) => command[0] === 'setSiteId' && command[1] === SITE_ID),
    'production bootstrap must set site id 17',
  );

  prod.window.CuratedSkillsAnalytics.trackSearch('codeql', 1);
  const siteSearch = prod.window._paq.find(
    (command) => command[0] === 'trackSiteSearch' && command[1] === 'codeql',
  );
  assert(siteSearch, 'trackSearch must queue trackSiteSearch with the query');
  assert(siteSearch[3] === 1, 'trackSiteSearch result count must be 1');
  const searchEvent = prod.window._paq.find(
    (command) => command[0] === 'trackEvent' && command[1] === 'catalog' && command[2] === 'search',
  );
  assert(searchEvent, 'trackSearch must also queue a catalog/search event');
  assert(searchEvent[3] === 'codeql', 'search event name must be the query');
  assert(searchEvent[4] === 1, 'search event value must be the result count');
  assert(
    prod.window._paq.some(
      (command) => command[0] === 'setCustomUrl' && String(command[1]).includes('q=codeql'),
    ),
    'search action URL must include q= so the query is visible on the hit',
  );

  prod.window.CuratedSkillsAnalytics.trackSkill('open_folder', 'awesome-copilot-codeql', 'static-analysis');
  const skillEvent = prod.window._paq.find(
    (command) => command[0] === 'trackEvent' && command[2] === 'open_folder',
  );
  assert(skillEvent, 'trackSkill must queue a skill event');
  assert(skillEvent[3] === 'awesome-copilot-codeql', 'skill id is the event name');
  assert(skillEvent[4] === 0, 'event value placeholder must be numeric 0');
  assert(
    skillEvent[5] && skillEvent[5].dimension1 === 'static-analysis',
    'action dimension must use id 1 so it is not stored as event value',
  );

  console.log('analytics smoke tests passed');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
