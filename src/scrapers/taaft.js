/**
 * TAAFT (There's An AI For That) Scraper
 *
 * Server-side HTML scraping of theresanaiforthat.com
 * Requires the Express backend for CORS bypass.
 * Falls back gracefully when server is unavailable.
 */

const TAAFT_BASE = 'https://theresanaiforthat.com';

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
 * Parse TAAFT listings from server-side HTML scrape.
 */
async function parseTAAFTPage(url) {
  const res = await fetch('/api/scrape/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      selectors: {
        itemSelector: '[class*="tool"], [class*="card"], article, .ai-tool, .tool-item, li[data-id]',
        fields: [
          { name: 'title', selector: 'h2, h3, [class*="name"], [class*="title"], a', extract: 'text' },
          { name: 'description', selector: 'p, [class*="desc"], [class*="tagline"]', extract: 'text' },
          { name: 'url', selector: 'a', extract: 'href' },
          { name: 'category', selector: '[class*="category"], [class*="tag"]', extract: 'text' },
          { name: 'pricing', selector: '[class*="price"], [class*="pricing"]', extract: 'text' },
        ],
      },
    }),
  });

  if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
  return res.json();
}

/**
 * Try a simpler scrape approach — just fetch and regex extract.
 */
async function simpleScrape(url) {
  const res = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'html' }),
  });

  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const { data: html } = await res.json();

  // Try to extract JSON-LD data
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (jsonLdMatch) {
    const items = [];
    for (const match of jsonLdMatch) {
      try {
        const json = JSON.parse(match.replace(/<\/?script[^>]*>/g, ''));
        if (json['@type'] === 'SoftwareApplication' || json['@type'] === 'Product') {
          items.push({
            title: json.name,
            description: json.description,
            url: json.url,
            category: json.applicationCategory || json.category || '',
          });
        }
        if (json['@graph']) {
          for (const node of json['@graph']) {
            if (node.name && node.description) {
              items.push({
                title: node.name,
                description: node.description,
                url: node.url || '',
                category: node.applicationCategory || '',
              });
            }
          }
        }
      } catch {
        // Skip invalid JSON-LD
      }
    }
    if (items.length > 0) return items;
  }

  // Fallback: regex extraction from HTML
  const items = [];
  const titleMatches = html.matchAll(/<h[23][^>]*>([^<]+)<\/h[23]>/g);
  for (const m of titleMatches) {
    const title = m[1].trim();
    if (title.length > 3 && title.length < 100) {
      items.push({ title, description: '', url: '', category: '' });
    }
  }

  return items;
}

/**
 * Scrape TAAFT.
 *
 * @param {number} [limit=30] - Max items
 * @param {object} [config] - TAAFT config
 * @returns {Promise<{ items: object[], error: string|null }>}
 */
export async function scrapeTAAFT(limit = 30, config = {}) {
  const {
    mode = 'trending',
    searchQuery = '',
    category = '',
  } = config;

  const hasServer = await serverAvailable();
  if (!hasServer) {
    return {
      items: [],
      error: 'TAAFT scraper requires the local server. Start it with: npm run dev',
    };
  }

  let url;
  switch (mode) {
    case 'search':
      url = searchQuery ? `${TAAFT_BASE}/s/${encodeURIComponent(searchQuery)}/` : TAAFT_BASE;
      break;
    case 'category':
      url = category ? `${TAAFT_BASE}/${encodeURIComponent(category)}/` : TAAFT_BASE;
      break;
    default:
      url = TAAFT_BASE;
  }

  try {
    // Try structured parsing first
    const result = await parseTAAFTPage(url);
    let items = result.items || [];

    // If structured parsing didn't work, try simple scrape
    if (items.length === 0) {
      items = await simpleScrape(url);
    }

    const now = new Date().toISOString();
    const normalized = items
      .filter((item) => item.title && item.title.length > 2)
      .slice(0, limit)
      .map((item) => ({
        source: 'taaft',
        title: item.title,
        description: item.description || '',
        url: item.url?.startsWith('http') ? item.url : item.url ? `${TAAFT_BASE}${item.url}` : '',
        taaftUrl: url,
        category: item.category || '',
        pricing: item.pricing || '',
        tags: item.tags || [],
        saves: item.saves || 0,
        scrapedAt: now,
      }));

    return {
      items: normalized,
      error: normalized.length === 0 ? 'No items extracted — TAAFT may have changed its HTML structure' : null,
    };
  } catch (err) {
    return { items: [], error: `TAAFT scrape failed: ${err.message}` };
  }
}
