/**
 * Hacker News Scraper
 *
 * Uses the official HN Firebase API — no HTML scraping needed.
 * Works in both browser and Node.js environments (uses fetch).
 */

const HN_API = 'https://hacker-news.firebaseio.com/v0';

/**
 * Fetch a single HN item by ID.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function fetchItem(id) {
  try {
    const res = await fetch(`${HN_API}/item/${id}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Scrape the top stories from Hacker News.
 *
 * @param {number} limit - Maximum number of stories to return (default 30).
 * @returns {Promise<{ items: object[], error: string|null }>}
 */
export async function scrapeHN(limit = 30) {
  try {
    const res = await fetch(`${HN_API}/topstories.json`);
    if (!res.ok) {
      return {
        items: [],
        error: `Failed to fetch top stories: HTTP ${res.status}`,
      };
    }

    const storyIds = await res.json();
    const topIds = storyIds.slice(0, limit);

    // Fetch all items in parallel
    const stories = await Promise.all(topIds.map(fetchItem));

    const now = new Date().toISOString();
    const items = stories
      .filter((s) => s !== null)
      .map((s) => ({
        source: 'hn',
        title: s.title || '(no title)',
        url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
        score: s.score || 0,
        author: s.by || 'unknown',
        commentCount: s.descendants || 0,
        hnUrl: `https://news.ycombinator.com/item?id=${s.id}`,
        scrapedAt: now,
      }));

    return { items, error: null };
  } catch (err) {
    return {
      items: [],
      error: `HN scrape failed: ${err.message}`,
    };
  }
}

// Allow running as a standalone script
// Usage: node src/scrapers/hn.js
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('/hn.js') || process.argv[1].endsWith('\\hn.js'));

if (isMain) {
  scrapeHN(10).then((result) => {
    if (result.error) {
      console.error('Error:', result.error);
    }
    console.log(`Fetched ${result.items.length} stories from Hacker News:\n`);
    for (const item of result.items) {
      console.log(`  [${item.score}] ${item.title}`);
      console.log(`         ${item.url}\n`);
    }
  });
}
