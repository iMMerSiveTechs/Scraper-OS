/**
 * Scraper Registry
 *
 * Central registry of all available scrapers with metadata.
 */

import { scrapeHN } from './hn.js';
import { scrapeGitHubTrending } from './github.js';
import { scrapeProductHunt } from './producthunt.js';
import { scrapeReddit } from './reddit.js';
import { scrapeX } from './x.js';
import { scrapeTAAFT } from './taaft.js';

export { scrapeHN } from './hn.js';
export { scrapeGitHubTrending } from './github.js';
export { scrapeProductHunt } from './producthunt.js';
export { scrapeReddit } from './reddit.js';
export { scrapeX } from './x.js';
export { scrapeTAAFT } from './taaft.js';

/**
 * Registry of all scrapers.
 * Each entry contains metadata and the scraper function.
 */
export const SCRAPERS = {
  hn: {
    name: 'Hacker News',
    fn: scrapeHN,
    icon: '\uD83D\uDD36',
    color: '#ff6b35',
    canRunInBrowser: true,
    schedule: 'hourly',
  },
  github: {
    name: 'GitHub Trending',
    fn: scrapeGitHubTrending,
    icon: '\uD83D\uDC19',
    color: '#a78bfa',
    canRunInBrowser: true,
    schedule: 'daily',
  },
  producthunt: {
    name: 'Product Hunt',
    fn: scrapeProductHunt,
    icon: '\uD83D\uDC31',
    color: '#da552f',
    canRunInBrowser: false,
    schedule: 'daily',
  },
  reddit: {
    name: 'Reddit',
    fn: scrapeReddit,
    icon: '\uD83E\uDD16',
    color: '#ff4500',
    canRunInBrowser: true,
    schedule: 'hourly',
  },
  x: {
    name: 'X / Twitter',
    fn: scrapeX,
    icon: '\uD835\uDD4F',
    color: '#1da1f2',
    canRunInBrowser: false,
    schedule: 'hourly',
  },
  taaft: {
    name: 'TAAFT',
    fn: scrapeTAAFT,
    icon: '\uD83E\uDD16',
    color: '#6366f1',
    canRunInBrowser: false,
    schedule: 'daily',
  },
};

/**
 * Run a specific scraper by its registry ID.
 *
 * @param {string} id - Scraper ID (e.g. 'hn', 'github', 'producthunt').
 * @param {number} [limit] - Optional limit to pass to the scraper function.
 * @returns {Promise<{ items: object[], error: string|null }>}
 */
export async function runScraper(id, limit) {
  const entry = SCRAPERS[id];
  if (!entry) {
    return { items: [], error: `Unknown scraper ID: "${id}"` };
  }

  try {
    const result = await entry.fn(limit);
    return result;
  } catch (err) {
    return {
      items: [],
      error: `Scraper "${entry.name}" threw an unexpected error: ${err.message}`,
    };
  }
}

/**
 * Run all scrapers that are safe to execute in a browser context.
 * Returns a map of scraper ID -> result.
 *
 * @returns {Promise<Record<string, { items: object[], error: string|null }>>}
 */
export async function runAllBrowserScrapers() {
  const browserScraperIds = Object.entries(SCRAPERS)
    .filter(([, entry]) => entry.canRunInBrowser)
    .map(([id]) => id);

  const results = {};
  const promises = browserScraperIds.map(async (id) => {
    results[id] = await runScraper(id);
  });

  await Promise.all(promises);
  return results;
}

/**
 * Run ALL scrapers (browser-safe and server-only).
 * Returns a map of scraper ID -> result.
 *
 * @returns {Promise<Record<string, { items: object[], error: string|null }>>}
 */
export async function runAllScrapers() {
  const results = {};
  const promises = Object.keys(SCRAPERS).map(async (id) => {
    results[id] = await runScraper(id);
  });

  await Promise.all(promises);
  return results;
}
