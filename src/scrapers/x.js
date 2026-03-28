/**
 * X / Twitter Scraper (Layered)
 *
 * Layer 1 (default): RSS bridges — free, stable, public tweets only
 * Layer 2: Server-side HTML scraping — richer data, more fragile
 * Layer 3: Official API — paid, most reliable (future)
 *
 * Auto-selects the best available layer.
 */

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
 * Fetch via server proxy.
 */
async function serverFetch(url) {
  const res = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'html', timeout: 10000 }),
  });
  if (!res.ok) throw new Error(`Server proxy error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// ---------------------------------------------------------------------------
// Layer 1: RSS Bridges
// ---------------------------------------------------------------------------

const RSS_BRIDGES = [
  (username) => `https://rsshub.app/twitter/user/${username}`,
  (username) => `https://nitter.privacydev.net/${username}/rss`,
  (username) => `https://twiiit.com/${username}/rss`,
];

const RSS_SEARCH_BRIDGES = [
  (query) => `https://rsshub.app/twitter/search/${encodeURIComponent(query)}`,
];

/**
 * Fetch RSS feed, trying multiple bridges.
 */
async function fetchRSS(bridges, arg) {
  for (const bridge of bridges) {
    const url = bridge(arg);
    try {
      let xml;
      if (await serverAvailable()) {
        xml = await serverFetch(url);
      } else {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        xml = await res.text();
      }

      // Parse RSS
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      if (doc.querySelector('parsererror')) continue;

      const items = doc.querySelectorAll('item');
      if (items.length === 0) continue;

      return { items: Array.from(items), bridgeUrl: url };
    } catch {
      continue;
    }
  }
  return null;
}

function parseRSSItems(rssItems, handle) {
  const now = new Date().toISOString();

  return rssItems.map((item) => {
    const title = item.querySelector('title')?.textContent?.trim() || '';
    const link = item.querySelector('link')?.textContent?.trim() || '';
    const description = item.querySelector('description')?.textContent?.trim() || '';
    const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
    const creator = item.querySelector('dc\\:creator, creator')?.textContent?.trim() || handle || '';

    // Clean HTML from description
    const cleanDesc = description.replace(/<[^>]+>/g, '').trim();

    return {
      source: 'x',
      title: cleanDesc.slice(0, 120) || title,
      description: cleanDesc,
      url: link,
      author: creator,
      authorHandle: handle || creator,
      pubDate: pubDate ? new Date(pubDate).toISOString() : now,
      engagement: null, // Not available via RSS
      scrapedAt: now,
    };
  });
}

// ---------------------------------------------------------------------------
// Layer 2: Server-side HTML scraping (placeholder — sites change frequently)
// ---------------------------------------------------------------------------

async function scrapeHTML(username) {
  // This is intentionally minimal — X's HTML changes frequently
  // The RSS bridge layer is more reliable
  const hasServer = await serverAvailable();
  if (!hasServer) return null;

  try {
    const res = await fetch('/api/scrape/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `https://xcancel.com/${username}`,
        selectors: {
          itemSelector: '.tweet-body, .timeline-item',
          fields: [
            { name: 'title', selector: '.tweet-content, .tweet-text', extract: 'text' },
            { name: 'url', selector: 'a.tweet-link, a.tweet-date', extract: 'href' },
            { name: 'date', selector: '.tweet-date, time', extract: 'text' },
          ],
        },
      }),
    });

    if (!res.ok) return null;
    const { items } = await res.json();
    if (!items || items.length === 0) return null;

    const now = new Date().toISOString();
    return items.map((item) => ({
      source: 'x',
      title: (item.title || '').slice(0, 120),
      description: item.title || '',
      url: item.url ? (item.url.startsWith('http') ? item.url : `https://x.com${item.url}`) : '',
      author: username,
      authorHandle: username,
      pubDate: now,
      engagement: null,
      scrapedAt: now,
    }));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Layer 3: Official API (future)
// ---------------------------------------------------------------------------

async function scrapeAPI(username, bearerToken, limit) {
  // Placeholder for official X API v2
  if (!bearerToken) return null;

  try {
    // First get user ID
    const userRes = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
      headers: { 'Authorization': `Bearer ${bearerToken}` },
    });
    if (!userRes.ok) return null;
    const userData = await userRes.json();
    const userId = userData.data?.id;
    if (!userId) return null;

    // Get tweets
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=${limit}&tweet.fields=created_at,public_metrics`,
      { headers: { 'Authorization': `Bearer ${bearerToken}` } }
    );
    if (!tweetsRes.ok) return null;
    const tweetsData = await tweetsRes.json();

    const now = new Date().toISOString();
    return (tweetsData.data || []).map((tweet) => ({
      source: 'x',
      title: tweet.text.slice(0, 120),
      description: tweet.text,
      url: `https://x.com/${username}/status/${tweet.id}`,
      author: username,
      authorHandle: username,
      pubDate: tweet.created_at || now,
      engagement: tweet.public_metrics ? {
        likes: tweet.public_metrics.like_count,
        retweets: tweet.public_metrics.retweet_count,
        replies: tweet.public_metrics.reply_count,
      } : null,
      scrapedAt: now,
    }));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main scraper function
// ---------------------------------------------------------------------------

/**
 * Scrape X/Twitter posts.
 *
 * @param {number} [limit=20] - Max items per user
 * @param {object} [config] - X scraper config
 * @returns {Promise<{ items: object[], error: string|null }>}
 */
export async function scrapeX(limit = 20, config = {}) {
  const {
    usernames = [],
    searchTerms = [],
    layer = 'auto',
    bearerToken = null,
  } = config;

  const allItems = [];
  const errors = [];

  // Scrape user feeds
  for (const username of usernames) {
    let items = null;

    // Layer 3: Official API (if token provided)
    if ((layer === 'auto' || layer === 'api') && bearerToken) {
      items = await scrapeAPI(username, bearerToken, limit);
    }

    // Layer 2: HTML scraping
    if (!items && (layer === 'auto' || layer === 'html')) {
      items = await scrapeHTML(username);
    }

    // Layer 1: RSS bridges
    if (!items && (layer === 'auto' || layer === 'rss')) {
      const result = await fetchRSS(RSS_BRIDGES, username);
      if (result) {
        items = parseRSSItems(result.items.slice(0, limit), username);
      }
    }

    if (items) {
      allItems.push(...items);
    } else {
      errors.push(`@${username}: all layers failed`);
    }
  }

  // Search terms (RSS only)
  for (const term of searchTerms) {
    const result = await fetchRSS(RSS_SEARCH_BRIDGES, term);
    if (result) {
      const items = parseRSSItems(result.items.slice(0, limit), null);
      allItems.push(...items);
    } else {
      errors.push(`Search "${term}": failed`);
    }
  }

  return {
    items: allItems,
    error: errors.length > 0 ? errors.join('; ') : null,
  };
}
