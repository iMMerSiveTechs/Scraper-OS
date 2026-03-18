import { useState, useEffect, useCallback } from 'react';
import { isFirebaseConfigured } from '../services/firebase';
import {
  signInWithGoogle,
  signOut as authSignOut,
  onAuthChange,
} from '../services/auth';
import {
  subscribeToRuns,
  subscribeToResults,
  subscribeToAlerts,
  markAlertRead,
  getScraperConfigs,
  addScraperConfig,
  updateScraperConfig,
  deleteScraperConfig,
  getScrapeResults,
} from '../services/firestore';

// ---------------------------------------------------------------------------
// useAuth
// ---------------------------------------------------------------------------

/**
 * Provides the current auth state and sign-in / sign-out helpers.
 *
 * @returns {{ user: object|null, loading: boolean, signIn: Function, signOut: Function, isDemo: boolean }}
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isDemo = !isFirebaseConfigured();

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    const u = await signInWithGoogle();
    // In demo mode onAuthChange won't fire, so set the user directly.
    if (isDemo) setUser(u);
    return u;
  }, [isDemo]);

  const signOut = useCallback(async () => {
    await authSignOut();
    if (isDemo) setUser(null);
  }, [isDemo]);

  return { user, loading, signIn, signOut, isDemo };
}

// ---------------------------------------------------------------------------
// useScrapeRuns
// ---------------------------------------------------------------------------

/**
 * Subscribe to scrape runs in real time.
 *
 * @param {number} [limit=50] - Maximum number of runs to return.
 * @returns {{ runs: Array, loading: boolean }}
 */
export function useScrapeRuns(limit = 50) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToRuns((data) => {
      setRuns(data.slice(0, limit));
      setLoading(false);
    });
    return unsubscribe;
  }, [limit]);

  return { runs, loading };
}

// ---------------------------------------------------------------------------
// useResults
// ---------------------------------------------------------------------------

/**
 * Subscribe to scrape results in real time.
 * When `scraperId` is provided, filters results for that scraper.
 * Otherwise returns the latest results across all scrapers.
 *
 * @param {string|null} [scraperId=null]
 * @param {number} [limit=50]
 * @returns {{ results: Array, loading: boolean }}
 */
export function useResults(scraperId = null, limit = 50) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scraperId) {
      // For a specific scraper we fall back to a one-time fetch since
      // subscribeToResults streams all results globally.
      let cancelled = false;
      getScrapeResults(scraperId, limit).then((data) => {
        if (!cancelled) {
          setResults(data);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    // Global real-time stream
    const unsubscribe = subscribeToResults((data) => {
      setResults(data.slice(0, limit));
      setLoading(false);
    });
    return unsubscribe;
  }, [scraperId, limit]);

  return { results, loading };
}

// ---------------------------------------------------------------------------
// useAlerts
// ---------------------------------------------------------------------------

/**
 * Subscribe to alerts in real time.
 *
 * @returns {{ alerts: Array, unreadCount: number, markRead: (id: string) => Promise<void> }}
 */
export function useAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToAlerts((data) => {
      setAlerts(data);
    });
    return unsubscribe;
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markRead = useCallback(async (id) => {
    await markAlertRead(id);
    // Optimistically update local state
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  }, []);

  return { alerts, unreadCount, markRead };
}

// ---------------------------------------------------------------------------
// useScraperConfigs
// ---------------------------------------------------------------------------

/**
 * Manages scraper configurations with add / update / remove helpers.
 *
 * @returns {{ configs: Array, loading: boolean, add: Function, update: Function, remove: Function }}
 */
export function useScraperConfigs() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    const data = await getScraperConfigs();
    setConfigs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const add = useCallback(
    async (config) => {
      const created = await addScraperConfig(config);
      // Optimistic update
      setConfigs((prev) => [...prev, created]);
      return created;
    },
    []
  );

  const update = useCallback(
    async (id, updates) => {
      await updateScraperConfig(id, updates);
      setConfigs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    },
    []
  );

  const remove = useCallback(
    async (id) => {
      await deleteScraperConfig(id);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    },
    []
  );

  return { configs, loading, add, update, remove };
}
