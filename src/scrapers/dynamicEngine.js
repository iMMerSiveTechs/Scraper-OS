/**
 * Dynamic Scraper Engine
 *
 * Executes user-defined scraper configurations at runtime.
 * Supports CSS (HTML parsing), JSON/API, and RSS feed types.
 * All parsing happens in-browser — no server required.
 */

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

/**
 * Attempt to fetch a URL. Tries local server proxy first (if available),
 * then direct fetch, then CORS proxies.
 */
async function fetchWithProxy(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  // Try local server proxy first (bypasses CORS entirely)
  try {
    const serverRes = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, timeout }),
      signal: AbortSignal.timeout(3000),
    });
    if (serverRes.ok) {
      const { data } = await serverRes.json();
      clearTimeout(timer);
      return data;
    }
  } catch {
    // Server not available, fall through
  }

  // Try direct first
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.ok) {
      clearTimeout(timer);
      return await res.text();
    }
  } catch {
    // Direct fetch failed, try proxies
  }

  // Try each proxy
  for (const proxy of CORS_PROXIES) {
    try {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), timeout);
      const res = await fetch(proxy + encodeURIComponent(url), {
        signal: controller2.signal,
      });
      clearTimeout(timer2);
      if (res.ok) {
        clearTimeout(timer);
        return await res.text();
      }
    } catch {
      continue;
    }
  }

  clearTimeout(timer);
  throw new Error(`Failed to fetch ${url} (tried direct + ${CORS_PROXIES.length} proxies)`);
}

/**
 * Extract data from HTML using CSS selectors.
 */
function extractCSS(html, config) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const { itemSelector, fields = [] } = config;
  if (!itemSelector) {
    return { items: [], error: 'No item selector defined' };
  }

  const containers = doc.querySelectorAll(itemSelector);
  const items = [];

  containers.forEach((el) => {
    const item = {};
    for (const field of fields) {
      const target = field.selector ? el.querySelector(field.selector) : el;
      if (!target) {
        item[field.name] = null;
        continue;
      }

      switch (field.extract || 'text') {
        case 'text':
          item[field.name] = target.textContent?.trim() || '';
          break;
        case 'html':
          item[field.name] = target.innerHTML?.trim() || '';
          break;
        case 'href':
          item[field.name] = target.getAttribute('href') || '';
          break;
        case 'src':
          item[field.name] = target.getAttribute('src') || '';
          break;
        case 'attr':
          item[field.name] = target.getAttribute(field.attribute || '') || '';
          break;
        default:
          item[field.name] = target.textContent?.trim() || '';
      }
    }
    items.push(item);
  });

  return { items, error: null };
}

/**
 * Extract data from JSON using dot-notation paths.
 */
function extractJSON(json, config) {
  const { dataPath, fields = [] } = config;

  let data;
  try {
    data = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (err) {
    return { items: [], error: `Invalid JSON: ${err.message}` };
  }

  // Navigate to data path (e.g., "data.items" or "results")
  if (dataPath) {
    const parts = dataPath.split('.');
    for (const part of parts) {
      if (data == null) break;
      if (part.endsWith('[]')) {
        data = data[part.slice(0, -2)];
      } else {
        data = data[part];
      }
    }
  }

  if (!Array.isArray(data)) {
    // If it's an object, wrap it
    data = data ? [data] : [];
  }

  const items = data.map((entry) => {
    const item = {};
    for (const field of fields) {
      const path = field.path || field.name;
      let value = entry;
      for (const p of path.split('.')) {
        value = value?.[p];
      }
      item[field.name] = value ?? null;
    }
    return item;
  });

  return { items, error: null };
}

/**
 * Parse RSS/Atom feeds.
 */
function extractRSS(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return { items: [], error: 'Invalid RSS/XML feed' };
  }

  // Try RSS 2.0 items
  let entries = doc.querySelectorAll('item');
  if (entries.length === 0) {
    // Try Atom entries
    entries = doc.querySelectorAll('entry');
  }

  const items = Array.from(entries).map((entry) => {
    const getText = (tag) => {
      const el = entry.querySelector(tag);
      return el?.textContent?.trim() || '';
    };
    const getAttr = (tag, attr) => {
      const el = entry.querySelector(tag);
      return el?.getAttribute(attr) || '';
    };

    return {
      title: getText('title'),
      url: getText('link') || getAttr('link', 'href'),
      description: getText('description') || getText('summary') || getText('content'),
      author: getText('author') || getText('dc\\:creator') || getText('creator'),
      pubDate: getText('pubDate') || getText('published') || getText('updated'),
      category: getText('category'),
    };
  });

  return { items, error: null };
}

/**
 * Execute a dynamic scraper config.
 *
 * @param {object} config - Scraper configuration
 * @param {string} config.url - URL to scrape
 * @param {string} config.type - 'css' | 'json' | 'rss'
 * @param {string} [config.itemSelector] - CSS selector for item containers
 * @param {Array} [config.fields] - Field extraction definitions
 * @param {string} [config.dataPath] - JSON data path
 * @param {number} [config.limit] - Max items to return
 * @returns {Promise<{ items: object[], error: string|null }>}
 */
export async function executeDynamicScraper(config) {
  const { url, type = 'css', limit } = config;

  if (!url) {
    return { items: [], error: 'No URL specified' };
  }

  try {
    const raw = await fetchWithProxy(url);
    let result;

    switch (type) {
      case 'css':
      case 'html':
        result = extractCSS(raw, config);
        break;
      case 'json':
      case 'api':
        result = extractJSON(raw, config);
        break;
      case 'rss':
      case 'feed':
        result = extractRSS(raw);
        break;
      default:
        return { items: [], error: `Unknown scraper type: ${type}` };
    }

    // Apply limit
    if (limit && result.items.length > limit) {
      result.items = result.items.slice(0, limit);
    }

    // Stamp metadata
    const now = new Date().toISOString();
    result.items = result.items.map((item, i) => ({
      ...item,
      source: config.id || config.name || 'custom',
      scrapedAt: now,
      _index: i,
    }));

    return result;
  } catch (err) {
    return { items: [], error: err.message };
  }
}

/**
 * Test a scraper config with a quick preview (limited items).
 */
export async function testScraper(config) {
  return executeDynamicScraper({ ...config, limit: config.limit || 5 });
}

/**
 * Validate a scraper configuration.
 */
export function validateConfig(config) {
  const errors = [];

  if (!config.name?.trim()) errors.push('Name is required');
  if (!config.url?.trim()) errors.push('URL is required');

  try {
    new URL(config.url);
  } catch {
    if (config.url?.trim()) errors.push('Invalid URL format');
  }

  if (config.type === 'css' || config.type === 'html') {
    if (!config.itemSelector?.trim()) {
      errors.push('Item selector is required for CSS scrapers');
    } else {
      try {
        document.querySelector(config.itemSelector);
      } catch {
        errors.push('Invalid CSS selector');
      }
    }
  }

  if (config.type === 'json' || config.type === 'api') {
    if (!config.dataPath?.trim() && (!config.fields || config.fields.length === 0)) {
      errors.push('Data path or fields are required for JSON scrapers');
    }
  }

  return { valid: errors.length === 0, errors };
}
