/**
 * Scraper OS — Firebase Cloud Functions
 *
 * Provides scheduled and on-demand scraping via Cloud Functions (2nd gen).
 * Standalone ESM code that runs on Node.js 20+.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Firebase Admin initialisation
// ---------------------------------------------------------------------------

const app = initializeApp();
const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Inline scraper implementations
//
// Cloud Functions has its own package.json and cannot import from ../src.
// We inline lightweight versions of the scrapers here.
// ---------------------------------------------------------------------------

const HN_API = 'https://hacker-news.firebaseio.com/v0';

async function scrapeHN(limit = 30) {
  try {
    const res = await fetch(`${HN_API}/topstories.json`);
    if (!res.ok) return { items: [], error: `HN HTTP ${res.status}` };
    const ids = (await res.json()).slice(0, limit);
    const stories = await Promise.all(
      ids.map(async (id) => {
        try {
          const r = await fetch(`${HN_API}/item/${id}.json`);
          return r.ok ? await r.json() : null;
        } catch {
          return null;
        }
      })
    );
    const now = new Date().toISOString();
    const items = stories.filter(Boolean).map((s) => ({
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
    return { items: [], error: err.message };
  }
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

async function scrapeGitHubTrending(limit = 30) {
  try {
    const weekAgo = daysAgo(7);
    const perPage = Math.min(limit, 100);
    const url =
      `https://api.github.com/search/repositories` +
      `?q=created:>${weekAgo}&sort=stars&order=desc&per_page=${perPage}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ScraperOS-CloudFunction/1.0',
      },
    });
    if (res.status === 403) {
      return { items: [], error: 'GitHub rate limit exceeded' };
    }
    if (!res.ok) {
      return { items: [], error: `GitHub HTTP ${res.status}` };
    }
    const data = await res.json();
    const now = new Date().toISOString();
    const items = (data.items || []).slice(0, limit).map((r) => ({
      source: 'github',
      title: r.full_name,
      description: r.description || '',
      stars: r.stargazers_count,
      language: r.language || null,
      url: r.html_url,
      topics: r.topics || [],
      scrapedAt: now,
    }));
    return { items, error: null };
  } catch (err) {
    return { items: [], error: err.message };
  }
}

async function scrapeProductHunt(limit = 20) {
  try {
    const res = await fetch('https://www.producthunt.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScraperOS/1.0)',
        Accept: 'text/html',
      },
    });
    if (!res.ok) {
      return { items: [], error: `PH HTTP ${res.status}` };
    }
    // Best-effort HTML parse — may return empty if markup changes
    const html = await res.text();
    const now = new Date().toISOString();
    const items = [];
    const re =
      /<a[^>]*href="\/posts\/([^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g;
    let m;
    while ((m = re.exec(html)) !== null && items.length < limit) {
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      if (title) {
        items.push({
          source: 'producthunt',
          title,
          tagline: '',
          url: `https://www.producthunt.com/posts/${m[1]}`,
          votesCount: 0,
          scrapedAt: now,
        });
      }
    }
    return { items, error: items.length === 0 ? 'No products parsed from HTML' : null };
  } catch (err) {
    return { items: [], error: err.message };
  }
}

const SCRAPERS = {
  hn: { name: 'Hacker News', fn: scrapeHN },
  github: { name: 'GitHub Trending', fn: scrapeGitHubTrending },
  producthunt: { name: 'Product Hunt', fn: scrapeProductHunt },
};

// ---------------------------------------------------------------------------
// Helper: run a single scraper and persist to Firestore
// ---------------------------------------------------------------------------

async function runAndPersist(scraperId) {
  const entry = SCRAPERS[scraperId];
  if (!entry) throw new Error(`Unknown scraper: ${scraperId}`);

  const startTime = Date.now();

  // Create run document
  const runRef = await db.collection('scrapeRuns').add({
    scraperId,
    scraperName: entry.name,
    status: 'running',
    startedAt: FieldValue.serverTimestamp(),
    completedAt: null,
    itemCount: 0,
    durationMs: 0,
    error: null,
  });

  try {
    const result = await entry.fn();
    const durationMs = Date.now() - startTime;

    // Store results
    if (result.items && result.items.length > 0) {
      await db.collection('scrapeResults').add({
        scraperId,
        runId: runRef.id,
        data: result.items,
        source: entry.name,
        scrapedAt: FieldValue.serverTimestamp(),
      });
    }

    // Update run
    await runRef.update({
      status: result.error ? 'partial' : 'success',
      completedAt: FieldValue.serverTimestamp(),
      itemCount: result.items ? result.items.length : 0,
      durationMs,
      error: result.error || null,
    });

    return { scraperId, status: 'success', itemCount: result.items.length, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    await runRef.update({
      status: 'failed',
      completedAt: FieldValue.serverTimestamp(),
      durationMs,
      error: err.message,
    });

    // Store failure alert
    await db.collection('alerts').add({
      type: 'error',
      message: `Scraper "${entry.name}" failed: ${err.message}`,
      scraperId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { scraperId, status: 'failed', error: err.message, durationMs };
  }
}

// ---------------------------------------------------------------------------
// Cloud Functions
// ---------------------------------------------------------------------------

/**
 * scheduledScrape — runs every hour, executes all scrapers.
 */
export const scheduledScrape = onSchedule(
  { schedule: 'every 1 hours', timeoutSeconds: 120, memory: '256MiB' },
  async () => {
    console.log('Scheduled scrape starting...');
    const results = [];

    for (const id of Object.keys(SCRAPERS)) {
      try {
        const result = await runAndPersist(id);
        results.push(result);
        console.log(
          `[${id}] ${result.status} — ${result.itemCount ?? 0} items in ${result.durationMs}ms`
        );
      } catch (err) {
        console.error(`[${id}] Unexpected error:`, err);
        results.push({ scraperId: id, status: 'error', error: err.message });
      }
    }

    console.log('Scheduled scrape complete:', JSON.stringify(results));
  }
);

/**
 * onDemandScrape — HTTP callable to trigger a specific scraper.
 *
 * Call with: { scraperId: 'hn' }
 */
export const onDemandScrape = onCall(
  { timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    const { scraperId } = request.data || {};

    if (!scraperId || !SCRAPERS[scraperId]) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid scraperId. Must be one of: ${Object.keys(SCRAPERS).join(', ')}`
      );
    }

    try {
      const result = await runAndPersist(scraperId);
      return result;
    } catch (err) {
      throw new HttpsError('internal', `Scraper failed: ${err.message}`);
    }
  }
);

/**
 * cleanupOldData — runs daily, deletes scrape results and runs older than 30 days.
 */
export const cleanupOldData = onSchedule(
  { schedule: 'every day 03:00', timeoutSeconds: 300, memory: '256MiB' },
  async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffTimestamp = cutoff;

    console.log(`Cleaning up data older than ${cutoff.toISOString()}...`);

    let totalDeleted = 0;

    // Clean up scrapeResults
    const resultsSnap = await db
      .collection('scrapeResults')
      .where('scrapedAt', '<', cutoffTimestamp)
      .limit(500)
      .get();

    const resultsBatch = db.batch();
    resultsSnap.docs.forEach((doc) => resultsBatch.delete(doc.ref));
    if (resultsSnap.size > 0) {
      await resultsBatch.commit();
      totalDeleted += resultsSnap.size;
      console.log(`Deleted ${resultsSnap.size} old scrapeResults documents.`);
    }

    // Clean up scrapeRuns
    const runsSnap = await db
      .collection('scrapeRuns')
      .where('startedAt', '<', cutoffTimestamp)
      .limit(500)
      .get();

    const runsBatch = db.batch();
    runsSnap.docs.forEach((doc) => runsBatch.delete(doc.ref));
    if (runsSnap.size > 0) {
      await runsBatch.commit();
      totalDeleted += runsSnap.size;
      console.log(`Deleted ${runsSnap.size} old scrapeRuns documents.`);
    }

    // Clean up old alerts
    const alertsSnap = await db
      .collection('alerts')
      .where('createdAt', '<', cutoffTimestamp)
      .limit(500)
      .get();

    const alertsBatch = db.batch();
    alertsSnap.docs.forEach((doc) => alertsBatch.delete(doc.ref));
    if (alertsSnap.size > 0) {
      await alertsBatch.commit();
      totalDeleted += alertsSnap.size;
      console.log(`Deleted ${alertsSnap.size} old alerts documents.`);
    }

    console.log(`Cleanup complete. Total documents deleted: ${totalDeleted}`);
  }
);
