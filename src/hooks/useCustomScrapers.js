import { useState, useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

const DEFAULT_FIELDS = [
  { name: 'title', selector: '', extract: 'text' },
  { name: 'url', selector: 'a', extract: 'href' },
];

function generateId() {
  return 'cs_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Manages custom scraper configurations with CRUD operations,
 * test runs, and integration with the dynamic engine.
 */
export function useCustomScrapers() {
  const [scrapers, setScrapers] = useLocalStorage('scraper-os-custom-scrapers', []);
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState({});
  const engineRef = useRef(null);

  // Lazy-load the dynamic engine
  const getEngine = useCallback(async () => {
    if (!engineRef.current) {
      engineRef.current = await import('../scrapers/dynamicEngine.js');
    }
    return engineRef.current;
  }, []);

  const addScraper = useCallback((config) => {
    const newScraper = {
      id: generateId(),
      name: config.name || 'Untitled Scraper',
      url: config.url || '',
      type: config.type || 'css',
      itemSelector: config.itemSelector || '',
      fields: config.fields || [...DEFAULT_FIELDS],
      dataPath: config.dataPath || '',
      schedule: config.schedule || 'manual',
      enabled: true,
      icon: config.icon || '\u2699',
      color: config.color || '#00d4ff',
      limit: config.limit || 30,
      createdAt: new Date().toISOString(),
      lastRun: null,
      lastRunStatus: null,
    };
    setScrapers((prev) => [...prev, newScraper]);
    return newScraper;
  }, [setScrapers]);

  const updateScraper = useCallback((id, updates) => {
    setScrapers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, [setScrapers]);

  const removeScraper = useCallback((id) => {
    setScrapers((prev) => prev.filter((s) => s.id !== id));
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [setScrapers]);

  const toggleScraper = useCallback((id) => {
    setScrapers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  }, [setScrapers]);

  const testScraper = useCallback(async (scraperOrId) => {
    const config = typeof scraperOrId === 'string'
      ? scrapers.find((s) => s.id === scraperOrId)
      : scraperOrId;

    if (!config) return { items: [], error: 'Scraper not found' };

    const id = config.id || 'preview';
    setTesting((prev) => ({ ...prev, [id]: true }));

    try {
      const engine = await getEngine();
      const result = await engine.testScraper(config);
      setTestResults((prev) => ({ ...prev, [id]: result }));
      return result;
    } catch (err) {
      const result = { items: [], error: err.message };
      setTestResults((prev) => ({ ...prev, [id]: result }));
      return result;
    } finally {
      setTesting((prev) => ({ ...prev, [id]: false }));
    }
  }, [scrapers, getEngine]);

  const runScraper = useCallback(async (id) => {
    const config = scrapers.find((s) => s.id === id);
    if (!config) return { items: [], error: 'Scraper not found' };

    try {
      const engine = await getEngine();
      const result = await engine.executeDynamicScraper(config);

      // Update last run metadata
      updateScraper(id, {
        lastRun: new Date().toISOString(),
        lastRunStatus: result.error ? 'partial' : 'success',
      });

      return result;
    } catch (err) {
      updateScraper(id, {
        lastRun: new Date().toISOString(),
        lastRunStatus: 'failed',
      });
      return { items: [], error: err.message };
    }
  }, [scrapers, getEngine, updateScraper]);

  const duplicateScraper = useCallback((id) => {
    const original = scrapers.find((s) => s.id === id);
    if (!original) return;
    const copy = { ...original, id: generateId(), name: original.name + ' (copy)', createdAt: new Date().toISOString() };
    setScrapers((prev) => [...prev, copy]);
    return copy;
  }, [scrapers, setScrapers]);

  const importScrapers = useCallback((configs) => {
    const imported = configs.map((c) => ({
      ...c,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }));
    setScrapers((prev) => [...prev, ...imported]);
    return imported;
  }, [setScrapers]);

  const exportScrapers = useCallback(() => {
    return scrapers.map(({ lastRun, lastRunStatus, ...rest }) => rest);
  }, [scrapers]);

  return {
    scrapers,
    testResults,
    testing,
    addScraper,
    updateScraper,
    removeScraper,
    toggleScraper,
    testScraper,
    runScraper,
    duplicateScraper,
    importScrapers,
    exportScrapers,
  };
}
