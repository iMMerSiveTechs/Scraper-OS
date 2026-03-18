import { useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Manages action triggers with CRUD and evaluation.
 */
export function useTriggers() {
  const [triggers, setTriggers] = useLocalStorage('scraper-os-triggers', []);
  const [triggerLog, setTriggerLog] = useLocalStorage('scraper-os-trigger-log', []);
  const engineRef = useRef(null);

  const getEngine = useCallback(async () => {
    if (!engineRef.current) {
      engineRef.current = await import('../services/triggers.js');
    }
    return engineRef.current;
  }, []);

  const addTrigger = useCallback(async (overrides = {}) => {
    const engine = await getEngine();
    const trigger = engine.createTrigger(overrides);
    setTriggers((prev) => [...prev, trigger]);
    return trigger;
  }, [getEngine, setTriggers]);

  const updateTrigger = useCallback((id, updates) => {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, [setTriggers]);

  const removeTrigger = useCallback((id) => {
    setTriggers((prev) => prev.filter((t) => t.id !== id));
  }, [setTriggers]);

  const toggleTrigger = useCallback((id) => {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  }, [setTriggers]);

  const evaluate = useCallback(async (results) => {
    const engine = await getEngine();
    const fired = engine.evaluateAllTriggers(triggers, results);

    if (fired.length > 0) {
      // Execute actions
      const actionResults = await engine.executeActions(fired);

      // Update fire counts and log
      const now = new Date().toISOString();
      setTriggers((prev) =>
        prev.map((t) => {
          const match = fired.find((f) => f.trigger.id === t.id);
          if (match) {
            return { ...t, lastFired: now, fireCount: (t.fireCount || 0) + 1 };
          }
          return t;
        })
      );

      // Add to log
      const logEntries = fired.map((f) => ({
        triggerId: f.trigger.id,
        triggerName: f.trigger.name,
        matchCount: f.matches.length,
        timestamp: now,
      }));
      setTriggerLog((prev) => [...logEntries, ...prev].slice(0, 100));

      return { fired, actionResults };
    }

    return { fired: [], actionResults: [] };
  }, [triggers, getEngine, setTriggers, setTriggerLog]);

  return {
    triggers,
    triggerLog,
    addTrigger,
    updateTrigger,
    removeTrigger,
    toggleTrigger,
    evaluate,
  };
}
