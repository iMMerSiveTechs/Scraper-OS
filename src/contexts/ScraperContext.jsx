import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ScraperContext = createContext(null);

export function useScraperContext() {
  const ctx = useContext(ScraperContext);
  if (!ctx) throw new Error("useScraperContext must be used within ScraperProvider");
  return ctx;
}

export function ScraperProvider({ children }) {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [user, setUser] = useState(null);
  const [isDemo, setIsDemo] = useState(true);
  const [runs, setRuns] = useState([]);
  const [results, setResults] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Try to initialize Firebase
  useEffect(() => {
    let unsubAuth = null;
    let unsubRuns = null;
    let unsubResults = null;
    let unsubAlerts = null;

    async function init() {
      try {
        const { isFirebaseConfigured } = await import("../services/firebase");
        if (!isFirebaseConfigured()) {
          setIsDemo(true);
          // Load demo data
          const { DEMO_RESULTS, DEMO_RUNS, DEMO_ALERTS } = await import("../data/demoData");
          setResults(DEMO_RESULTS);
          setRuns(DEMO_RUNS);
          setAlerts(DEMO_ALERTS);
          setLoading(false);
          return;
        }

        setIsDemo(false);
        setFirebaseReady(true);

        const { onAuthChange } = await import("../services/auth");
        const { subscribeToRuns, subscribeToResults, subscribeToAlerts, getScraperConfigs } = await import("../services/firestore");

        unsubAuth = onAuthChange((u) => setUser(u));
        unsubRuns = subscribeToRuns((data) => setRuns(data));
        unsubResults = subscribeToResults((data) => setResults(data));
        unsubAlerts = subscribeToAlerts((data) => setAlerts(data));

        const cfgs = await getScraperConfigs();
        setConfigs(cfgs);
        setLoading(false);
      } catch {
        // Firebase not available, use demo mode
        setIsDemo(true);
        try {
          const { DEMO_RESULTS, DEMO_RUNS, DEMO_ALERTS } = await import("../data/demoData");
          setResults(DEMO_RESULTS);
          setRuns(DEMO_RUNS);
          setAlerts(DEMO_ALERTS);
        } catch {
          // Demo data also failed, start empty
        }
        setLoading(false);
      }
    }

    init();

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubRuns) unsubRuns();
      if (unsubResults) unsubResults();
      if (unsubAlerts) unsubAlerts();
    };
  }, []);

  const runScraper = useCallback(async (scraperId) => {
    try {
      const { executeScrape } = await import("../scrapers/runner");
      const result = await executeScrape(scraperId);

      // Update local state immediately
      if (result.run) {
        setRuns((prev) => [result.run, ...prev]);
      }
      if (result.results?.length) {
        setResults((prev) => [...result.results, ...prev]);
      }

      return result;
    } catch (err) {
      console.error(`Scrape failed for ${scraperId}:`, err);
      throw err;
    }
  }, []);

  const runAllScrapers = useCallback(async () => {
    try {
      const { SCRAPERS } = await import("../scrapers/index");
      const browserScrapers = Object.entries(SCRAPERS)
        .filter(([, s]) => s.canRunInBrowser);

      const results = await Promise.allSettled(
        browserScrapers.map(([id]) => runScraper(id))
      );

      return results;
    } catch (err) {
      console.error("Run all scrapers failed:", err);
      throw err;
    }
  }, [runScraper]);

  const dismissAlert = useCallback(async (alertId) => {
    setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, read: true } : a));
    if (!isDemo) {
      try {
        const { markAlertRead } = await import("../services/firestore");
        await markAlertRead(alertId);
      } catch {
        // Silent fail
      }
    }
  }, [isDemo]);

  const stats = {
    totalRuns: runs.length,
    successRate: runs.length > 0
      ? Math.round((runs.filter((r) => r.status === "success").length / runs.length) * 100)
      : 0,
    totalItems: results.length,
    activeScrapers: configs.filter((c) => c.enabled).length || (isDemo ? 3 : 0),
  };

  return (
    <ScraperContext.Provider
      value={{
        user,
        isDemo,
        firebaseReady,
        loading,
        runs,
        results,
        alerts,
        configs,
        stats,
        runScraper,
        runAllScrapers,
        dismissAlert,
      }}
    >
      {children}
    </ScraperContext.Provider>
  );
}
