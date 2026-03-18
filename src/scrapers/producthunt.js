/**
 * Product Hunt Scraper
 *
 * Product Hunt requires server-side scraping (no public JSON API without auth).
 * In a browser context this will return demo data since the request will fail
 * due to CORS restrictions.
 *
 * canRunInBrowser: false
 */

/**
 * Detect whether we are running in a browser environment.
 * @returns {boolean}
 */
function isBrowser() {
  return (
    typeof window !== 'undefined' && typeof window.document !== 'undefined'
  );
}

/**
 * Demo data returned when the scraper cannot reach Product Hunt
 * (e.g. in a browser, or when the network request fails).
 */
function getDemoData() {
  const now = new Date().toISOString();
  return [
    {
      source: 'producthunt',
      title: 'Example Product 1',
      tagline: 'An amazing tool for developers',
      url: 'https://www.producthunt.com',
      votesCount: 420,
      scrapedAt: now,
    },
    {
      source: 'producthunt',
      title: 'Example Product 2',
      tagline: 'The next-gen productivity app',
      url: 'https://www.producthunt.com',
      votesCount: 315,
      scrapedAt: now,
    },
    {
      source: 'producthunt',
      title: 'Example Product 3',
      tagline: 'AI-powered workflow automation',
      url: 'https://www.producthunt.com',
      votesCount: 287,
      scrapedAt: now,
    },
  ];
}

/**
 * Attempt to extract product data from the Product Hunt homepage HTML.
 * This is a best-effort parser that looks for JSON-LD or common patterns
 * in the rendered markup. Product Hunt may change their markup at any time.
 *
 * @param {string} html
 * @param {number} limit
 * @returns {object[]}
 */
function parseProducts(html, limit) {
  const now = new Date().toISOString();
  const items = [];

  // Strategy 1: Try to find Next.js / Apollo embedded JSON data
  const jsonChunks = html.match(
    /<script[^>]*>self\.__next_f\.push\(\[1,".*?"\]\)<\/script>/gs
  );

  // Strategy 2: Look for structured data (JSON-LD)
  const ldMatches = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  );
  if (ldMatches) {
    for (const match of ldMatches) {
      try {
        const jsonStr = match
          .replace(/<script type="application\/ld\+json">/, '')
          .replace(/<\/script>/, '');
        const ld = JSON.parse(jsonStr);
        if (ld && ld.name) {
          items.push({
            source: 'producthunt',
            title: ld.name,
            tagline: ld.description || '',
            url: ld.url || 'https://www.producthunt.com',
            votesCount: 0,
            scrapedAt: now,
          });
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  // Strategy 3: Regex-based extraction of post titles from meta or og tags
  // Look for data-test attributes or common class-based patterns
  const titleRegex =
    /<a[^>]*href="\/posts\/([^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g;
  let m;
  while ((m = titleRegex.exec(html)) !== null && items.length < limit) {
    const slug = m[1];
    const title = m[2].replace(/<[^>]+>/g, '').trim();
    if (title) {
      items.push({
        source: 'producthunt',
        title,
        tagline: '',
        url: `https://www.producthunt.com/posts/${slug}`,
        votesCount: 0,
        scrapedAt: now,
      });
    }
  }

  return items.slice(0, limit);
}

/**
 * Scrape products from Product Hunt.
 *
 * In a browser context this returns demo data with an explanatory note.
 * In Node.js it attempts to fetch and parse the PH homepage.
 *
 * @param {number} limit - Maximum number of products to return (default 20).
 * @returns {Promise<{ items: object[], error: string|null, isDemo: boolean }>}
 */
export async function scrapeProductHunt(limit = 20) {
  // In the browser, don't even try — CORS will block it
  if (isBrowser()) {
    return {
      items: getDemoData().slice(0, limit),
      error:
        'Product Hunt requires server-side scraping (CORS blocks browser requests). Showing demo data.',
      isDemo: true,
    };
  }

  // Node.js path: attempt real fetch
  try {
    const res = await fetch('https://www.producthunt.com', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ScraperOS/1.0; +https://github.com/scraper-os)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) {
      return {
        items: getDemoData().slice(0, limit),
        error: `Product Hunt returned HTTP ${res.status}. Showing demo data.`,
        isDemo: true,
      };
    }

    const html = await res.text();
    const items = parseProducts(html, limit);

    if (items.length === 0) {
      return {
        items: getDemoData().slice(0, limit),
        error:
          'Could not parse products from Product Hunt HTML (markup may have changed). Showing demo data.',
        isDemo: true,
      };
    }

    return { items, error: null, isDemo: false };
  } catch (err) {
    return {
      items: getDemoData().slice(0, limit),
      error: `Product Hunt scrape failed: ${err.message}. Showing demo data.`,
      isDemo: true,
    };
  }
}

/** Flag indicating this scraper cannot run in a browser. */
scrapeProductHunt.canRunInBrowser = false;

// Allow running as a standalone script
// Usage: node src/scrapers/producthunt.js
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('/producthunt.js') ||
    process.argv[1].endsWith('\\producthunt.js'));

if (isMain) {
  scrapeProductHunt(10).then((result) => {
    if (result.error) {
      console.error('Note:', result.error);
    }
    console.log(
      `\nFetched ${result.items.length} products${result.isDemo ? ' (demo data)' : ''}:\n`
    );
    for (const item of result.items) {
      console.log(`  [${item.votesCount}] ${item.title}`);
      console.log(`         ${item.tagline}`);
      console.log(`         ${item.url}\n`);
    }
  });
}
