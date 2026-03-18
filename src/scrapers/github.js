/**
 * GitHub Trending Scraper
 *
 * Uses the GitHub Search API to find recently-created repos sorted by stars.
 * No authentication required for public data (but subject to rate limits).
 * Works in both browser and Node.js environments (uses fetch).
 */

/**
 * Build an ISO date string for N days ago (YYYY-MM-DD).
 * @param {number} days
 * @returns {string}
 */
function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

/**
 * Scrape trending GitHub repositories from the past week.
 *
 * @param {number} limit - Maximum number of repos to return (default 30, max 100).
 * @returns {Promise<{ items: object[], error: string|null }>}
 */
export async function scrapeGitHubTrending(limit = 30) {
  try {
    const weekAgo = daysAgo(7);
    const perPage = Math.min(limit, 100);
    const url =
      `https://api.github.com/search/repositories` +
      `?q=created:>${weekAgo}&sort=stars&order=desc&per_page=${perPage}`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        // Identify ourselves so GitHub is less likely to throttle
        'User-Agent': 'ScraperOS/1.0',
      },
    });

    // Handle rate limiting
    const remaining = res.headers.get('X-RateLimit-Remaining');
    const resetTimestamp = res.headers.get('X-RateLimit-Reset');

    if (res.status === 403 && remaining === '0') {
      const resetDate = resetTimestamp
        ? new Date(Number(resetTimestamp) * 1000).toISOString()
        : 'unknown';
      return {
        items: [],
        error: `GitHub API rate limit exceeded. Resets at ${resetDate}.`,
      };
    }

    if (!res.ok) {
      return {
        items: [],
        error: `GitHub API returned HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    const repos = data.items || [];
    const now = new Date().toISOString();

    const items = repos.slice(0, limit).map((repo) => ({
      source: 'github',
      title: repo.full_name,
      description: repo.description || '',
      stars: repo.stargazers_count,
      language: repo.language || null,
      url: repo.html_url,
      topics: repo.topics || [],
      scrapedAt: now,
    }));

    // Attach rate-limit info as metadata
    const rateLimitNote =
      remaining !== null
        ? `GitHub API requests remaining: ${remaining}`
        : null;

    return { items, error: null, rateLimit: rateLimitNote };
  } catch (err) {
    return {
      items: [],
      error: `GitHub scrape failed: ${err.message}`,
    };
  }
}

// Allow running as a standalone script
// Usage: node src/scrapers/github.js
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('/github.js') ||
    process.argv[1].endsWith('\\github.js'));

if (isMain) {
  scrapeGitHubTrending(10).then((result) => {
    if (result.error) {
      console.error('Error:', result.error);
    }
    if (result.rateLimit) {
      console.log(result.rateLimit);
    }
    console.log(
      `\nFetched ${result.items.length} trending repos from GitHub:\n`
    );
    for (const item of result.items) {
      console.log(`  [${item.stars}] ${item.title} (${item.language || 'n/a'})`);
      console.log(`         ${item.description}`);
      console.log(`         ${item.url}\n`);
    }
  });
}
