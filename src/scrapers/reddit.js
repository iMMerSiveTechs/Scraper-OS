/**
 * Reddit Scraper
 *
 * Uses Reddit's public JSON API. Tries server proxy first for reliability,
 * falls back to direct browser fetch (CORS sometimes works).
 */

const REDDIT_BASE = 'https://www.reddit.com';

/**
 * Check if the local server is available.
 */
async function serverAvailable() {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch a Reddit JSON endpoint, trying server proxy first.
 */
async function fetchReddit(path, params = {}) {
  const qs = new URLSearchParams({ raw_json: '1', ...params }).toString();
  const url = `${REDDIT_BASE}${path}.json?${qs}`;

  // Try server proxy first
  if (await serverAvailable()) {
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type: 'json' }),
      });
      if (res.ok) {
        const { data } = await res.json();
        return JSON.parse(data);
      }
    } catch {
      // Fall through to direct fetch
    }
  }

  // Direct fetch (sometimes works in browser)
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ScraperOS/1.0' },
  });
  if (!res.ok) throw new Error(`Reddit API error: ${res.status}`);
  return res.json();
}

/**
 * Parse Reddit listing response into normalized items.
 */
function parseListings(data) {
  const children = data?.data?.children || [];
  const now = new Date().toISOString();

  return children
    .filter((c) => c.kind === 't3') // Links only
    .map((c) => {
      const d = c.data;
      return {
        source: 'reddit',
        title: d.title,
        url: d.is_self ? `https://reddit.com${d.permalink}` : d.url,
        selftext: (d.selftext || '').slice(0, 300),
        score: d.score,
        author: d.author,
        subreddit: d.subreddit,
        numComments: d.num_comments,
        permalink: `https://reddit.com${d.permalink}`,
        created: new Date(d.created_utc * 1000).toISOString(),
        thumbnail: d.thumbnail?.startsWith('http') ? d.thumbnail : null,
        flair: d.link_flair_text || null,
        scrapedAt: now,
      };
    });
}

/**
 * Scrape Reddit posts.
 *
 * @param {number} [limit=25] - Max items per subreddit
 * @param {object} [config] - Reddit scraper config
 * @returns {Promise<{ items: object[], error: string|null }>}
 */
export async function scrapeReddit(limit = 25, config = {}) {
  const {
    subreddits = ['programming', 'webdev', 'machinelearning'],
    sort = 'hot',
    timeRange = 'day',
    searchQuery = '',
  } = config;

  const allItems = [];
  const errors = [];

  for (const sub of subreddits) {
    try {
      let data;
      if (searchQuery) {
        data = await fetchReddit(`/r/${sub}/search`, {
          q: searchQuery,
          sort: 'relevance',
          t: timeRange,
          restrict_sr: 'on',
          limit: String(limit),
        });
      } else {
        const params = { limit: String(limit) };
        if (sort === 'top') params.t = timeRange;
        data = await fetchReddit(`/r/${sub}/${sort}`, params);
      }

      const items = parseListings(data);
      allItems.push(...items);
    } catch (err) {
      errors.push(`r/${sub}: ${err.message}`);
    }
  }

  return {
    items: allItems.slice(0, limit * subreddits.length),
    error: errors.length > 0 ? errors.join('; ') : null,
  };
}
