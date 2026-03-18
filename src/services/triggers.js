/**
 * Action Triggers Engine
 *
 * Evaluates conditions against scraped data and fires actions.
 * Conditions: keyword match, score threshold, new count, cross-source detection
 * Actions: browser notification, webhook, highlight, digest inclusion
 */

/**
 * Evaluate a single trigger against a set of results.
 *
 * @param {object} trigger - Trigger configuration
 * @param {Array} results - Scraped items to evaluate
 * @param {object} context - Additional context (previous results, etc.)
 * @returns {{ fired: boolean, matches: Array, trigger: object }}
 */
export function evaluateTrigger(trigger, results, context = {}) {
  if (!trigger.enabled) return { fired: false, matches: [], trigger };

  const matches = [];
  const { condition } = trigger;

  switch (condition.type) {
    case 'keyword': {
      const keywords = (condition.keywords || []).map((k) => k.toLowerCase());
      for (const item of results) {
        const text = `${item.title || ''} ${item.description || ''} ${item.tagline || ''}`.toLowerCase();
        const matched = keywords.filter((kw) => text.includes(kw));
        if (matched.length > 0) {
          matches.push({ item, matchedKeywords: matched });
        }
      }
      break;
    }

    case 'score_threshold': {
      const threshold = condition.threshold || 100;
      for (const item of results) {
        if ((item.score || 0) >= threshold) {
          matches.push({ item, score: item.score });
        }
      }
      break;
    }

    case 'new_count': {
      const minCount = condition.minCount || 10;
      const sourceFilter = condition.source;
      const filtered = sourceFilter
        ? results.filter((r) => r.source === sourceFilter)
        : results;
      if (filtered.length >= minCount) {
        matches.push({ count: filtered.length, source: sourceFilter || 'all' });
      }
      break;
    }

    case 'cross_source': {
      // Find items with similar titles across different sources
      const byTitle = {};
      for (const item of results) {
        const normalized = (item.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        if (normalized.length < 5) continue;
        if (!byTitle[normalized]) byTitle[normalized] = new Set();
        byTitle[normalized].add(item.source);
      }
      for (const [title, sources] of Object.entries(byTitle)) {
        if (sources.size >= (condition.minSources || 2)) {
          matches.push({
            title,
            sources: Array.from(sources),
            items: results.filter((r) =>
              (r.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim() === title
            ),
          });
        }
      }
      break;
    }

    case 'regex': {
      try {
        const re = new RegExp(condition.pattern, condition.flags || 'i');
        for (const item of results) {
          const text = `${item.title || ''} ${item.description || ''}`;
          if (re.test(text)) {
            matches.push({ item, pattern: condition.pattern });
          }
        }
      } catch {
        // Invalid regex
      }
      break;
    }
  }

  return { fired: matches.length > 0, matches, trigger };
}

/**
 * Evaluate all triggers against results.
 */
export function evaluateAllTriggers(triggers, results, context = {}) {
  const fired = [];
  for (const trigger of triggers) {
    const result = evaluateTrigger(trigger, results, context);
    if (result.fired) {
      fired.push(result);
    }
  }
  return fired;
}

/**
 * Execute trigger actions.
 */
export async function executeActions(firedTriggers) {
  const results = [];

  for (const { trigger, matches } of firedTriggers) {
    for (const action of trigger.actions || []) {
      try {
        switch (action.type) {
          case 'notification': {
            if ('Notification' in window && Notification.permission === 'granted') {
              const title = trigger.name || 'Scraper OS Alert';
              const body = matches.length === 1 && matches[0].item
                ? matches[0].item.title
                : `${matches.length} items matched`;
              new Notification(title, { body, icon: '/favicon.ico' });
            }
            results.push({ action: 'notification', status: 'sent' });
            break;
          }

          case 'webhook': {
            if (action.url) {
              await fetch(action.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  trigger: trigger.name,
                  matchCount: matches.length,
                  matches: matches.slice(0, 10),
                  timestamp: new Date().toISOString(),
                }),
              });
              results.push({ action: 'webhook', status: 'sent', url: action.url });
            }
            break;
          }

          case 'highlight':
            results.push({ action: 'highlight', items: matches.map((m) => m.item).filter(Boolean) });
            break;

          case 'digest':
            results.push({ action: 'digest', items: matches.map((m) => m.item).filter(Boolean) });
            break;
        }
      } catch (err) {
        results.push({ action: action.type, status: 'error', error: err.message });
      }
    }
  }

  return results;
}

/**
 * Request notification permission.
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

/**
 * Create a default trigger template.
 */
export function createTrigger(overrides = {}) {
  return {
    id: 'tr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: 'New Trigger',
    enabled: true,
    condition: {
      type: 'keyword',
      keywords: [],
    },
    actions: [{ type: 'notification' }],
    source: null, // null = all sources
    createdAt: new Date().toISOString(),
    lastFired: null,
    fireCount: 0,
    ...overrides,
  };
}
