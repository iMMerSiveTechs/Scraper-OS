/**
 * Scraper Execution Engine
 *
 * Orchestrates scraper runs with optional Firestore persistence.
 * Gracefully degrades when Firestore is not available.
 */

import { SCRAPERS } from './index.js';

// Lazy-load Firestore to avoid top-level await
let _fs = null;
async function getFS() {
  if (_fs !== null) return _fs;
  try {
    _fs = await import('../services/firestore.js');
  } catch {
    _fs = false;
  }
  return _fs;
}

/**
 * Execute a scrape run for a given scraper ID.
 */
export async function executeScrape(scraperId, options = {}) {
  const { limit, alertKeywords = [] } = options;
  const scraperEntry = SCRAPERS[scraperId];

  if (!scraperEntry) {
    throw new Error(`Unknown scraper: "${scraperId}"`);
  }

  const fs = await getFS();
  const canPersist = fs && typeof fs.addScrapeRun === 'function';
  const startTime = Date.now();

  // 1. Create a run record
  let run = {
    scraperId,
    scraperName: scraperEntry.name,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    itemCount: 0,
    durationMs: 0,
    error: null,
  };

  if (canPersist) {
    try {
      run = await fs.addScrapeRun(run);
    } catch (err) {
      console.warn('Failed to create run record:', err.message);
    }
  }

  let results;

  try {
    // 2. Run the scraper
    results = await scraperEntry.fn(limit);
    const durationMs = Date.now() - startTime;

    // 3. Store results
    if (canPersist && results.items && results.items.length > 0) {
      try {
        await fs.addScrapeResults({
          scraperId,
          runId: run.id || null,
          data: results.items,
          source: scraperEntry.name,
        });
      } catch (err) {
        console.warn('Failed to store results:', err.message);
      }
    }

    // 4. Update run record
    const updates = {
      status: results.error ? 'partial' : 'success',
      completedAt: new Date().toISOString(),
      itemCount: results.items ? results.items.length : 0,
      durationMs,
      error: results.error || null,
    };

    run = { ...run, ...updates };

    if (canPersist && run.id) {
      try {
        await fs.updateScrapeRun(run.id, updates);
      } catch (err) {
        console.warn('Failed to update run:', err.message);
      }
    }

    // 5. Check for keyword alerts
    if (alertKeywords.length > 0 && results.items) {
      await checkAlerts(fs, canPersist, scraperId, scraperEntry.name, results.items, alertKeywords);
    }
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const updates = {
      status: 'failed',
      completedAt: new Date().toISOString(),
      itemCount: 0,
      durationMs,
      error: err.message,
    };

    run = { ...run, ...updates };

    if (canPersist && run.id) {
      try { await fs.updateScrapeRun(run.id, updates); } catch { /* best effort */ }
    }

    if (canPersist) {
      try {
        await fs.addAlert({
          type: 'error',
          message: `Scraper "${scraperEntry.name}" failed: ${err.message}`,
          scraperId,
        });
      } catch { /* best effort */ }
    }

    results = { items: [], error: err.message };
  }

  return { run, results };
}

async function checkAlerts(fs, canPersist, scraperId, scraperName, items, keywords) {
  if (!canPersist) return;
  const lower = keywords.map((k) => k.toLowerCase());

  for (const item of items) {
    const text = `${item.title || ''} ${item.description || ''} ${item.tagline || ''}`.toLowerCase();
    const matched = lower.filter((kw) => text.includes(kw));
    if (matched.length > 0) {
      try {
        await fs.addAlert({
          type: 'keyword_match',
          message: `"${item.title}" from ${scraperName} matched: ${matched.join(', ')}`,
          scraperId,
          matchedKeywords: matched,
        });
      } catch { /* best effort */ }
    }
  }
}

/**
 * Execute all browser-compatible scrapers in parallel.
 */
export async function executeAllScrapers(options = {}) {
  const { browserOnly = false, ...scraperOptions } = options;
  const allResults = {};

  const ids = Object.entries(SCRAPERS)
    .filter(([, entry]) => !browserOnly || entry.canRunInBrowser)
    .map(([id]) => id);

  await Promise.all(
    ids.map(async (id) => {
      try {
        allResults[id] = await executeScrape(id, scraperOptions);
      } catch (err) {
        allResults[id] = {
          run: { scraperId: id, status: 'failed', error: err.message },
          results: { items: [], error: err.message },
        };
      }
    })
  );

  return allResults;
}
