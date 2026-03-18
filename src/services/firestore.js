import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

// ---------------------------------------------------------------------------
// Demo / mock data
// ---------------------------------------------------------------------------

const DEMO_SCRAPER_CONFIGS = [
  {
    id: 'demo-config-1',
    name: 'Example News Scraper',
    type: 'html',
    url: 'https://example.com/news',
    selector: 'article.post',
    schedule: '0 */6 * * *',
    enabled: true,
    lastRun: new Date().toISOString(),
  },
  {
    id: 'demo-config-2',
    name: 'Example Price Monitor',
    type: 'json',
    url: 'https://api.example.com/prices',
    selector: '$.items[*]',
    schedule: '0 * * * *',
    enabled: false,
    lastRun: null,
  },
];

const DEMO_RUNS = [
  {
    id: 'demo-run-1',
    scraperId: 'demo-config-1',
    status: 'completed',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3500000).toISOString(),
    itemCount: 12,
    error: null,
  },
  {
    id: 'demo-run-2',
    scraperId: 'demo-config-2',
    status: 'failed',
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7100000).toISOString(),
    itemCount: 0,
    error: 'Connection timeout',
  },
];

const DEMO_RESULTS = [
  {
    id: 'demo-result-1',
    scraperId: 'demo-config-1',
    runId: 'demo-run-1',
    data: [
      { title: 'Demo Article 1', url: 'https://example.com/1' },
      { title: 'Demo Article 2', url: 'https://example.com/2' },
    ],
    scrapedAt: new Date().toISOString(),
    source: 'https://example.com/news',
  },
];

const DEMO_ALERTS = [
  {
    id: 'demo-alert-1',
    type: 'error',
    message: 'Scraper "Example Price Monitor" failed: Connection timeout',
    scraperId: 'demo-config-2',
    read: false,
    createdAt: new Date(Date.now() - 7100000).toISOString(),
  },
  {
    id: 'demo-alert-2',
    type: 'success',
    message: 'Scraper "Example News Scraper" completed with 12 items',
    scraperId: 'demo-config-1',
    read: true,
    createdAt: new Date(Date.now() - 3500000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a Firestore document snapshot to a plain object with `id`. */
function docToObj(docSnap) {
  const data = docSnap.data();
  // Convert Firestore Timestamps to ISO strings for convenience
  for (const key of Object.keys(data)) {
    if (data[key] instanceof Timestamp) {
      data[key] = data[key].toDate().toISOString();
    }
  }
  return { id: docSnap.id, ...data };
}

// ---------------------------------------------------------------------------
// Scrape Runs
// ---------------------------------------------------------------------------

export async function addScrapeRun(run) {
  if (!isFirebaseConfigured()) {
    const id = `demo-run-${Date.now()}`;
    return { id, ...run };
  }
  const docRef = await addDoc(collection(db, 'scrapeRuns'), {
    ...run,
    startedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...run };
}

export async function updateScrapeRun(id, updates) {
  if (!isFirebaseConfigured()) return;
  const ref = doc(db, 'scrapeRuns', id);
  await updateDoc(ref, updates);
}

export async function getScrapeRuns(limitCount = 50) {
  if (!isFirebaseConfigured()) {
    return DEMO_RUNS.slice(0, limitCount);
  }
  const q = query(
    collection(db, 'scrapeRuns'),
    orderBy('startedAt', 'desc'),
    firestoreLimit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToObj);
}

// ---------------------------------------------------------------------------
// Scrape Results
// ---------------------------------------------------------------------------

export async function addScrapeResults(results) {
  if (!isFirebaseConfigured()) {
    const id = `demo-result-${Date.now()}`;
    return { id, ...results };
  }
  const docRef = await addDoc(collection(db, 'scrapeResults'), {
    ...results,
    scrapedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...results };
}

export async function getScrapeResults(scraperId, limitCount = 50) {
  if (!isFirebaseConfigured()) {
    return DEMO_RESULTS.filter((r) => r.scraperId === scraperId).slice(
      0,
      limitCount
    );
  }
  const q = query(
    collection(db, 'scrapeResults'),
    where('scraperId', '==', scraperId),
    orderBy('scrapedAt', 'desc'),
    firestoreLimit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToObj);
}

export async function getLatestResults(limitCount = 50) {
  if (!isFirebaseConfigured()) {
    return DEMO_RESULTS.slice(0, limitCount);
  }
  const q = query(
    collection(db, 'scrapeResults'),
    orderBy('scrapedAt', 'desc'),
    firestoreLimit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToObj);
}

// ---------------------------------------------------------------------------
// Scraper Configs
// ---------------------------------------------------------------------------

export async function addScraperConfig(config) {
  if (!isFirebaseConfigured()) {
    const id = `demo-config-${Date.now()}`;
    return { id, ...config };
  }
  const docRef = await addDoc(collection(db, 'scraperConfigs'), config);
  return { id: docRef.id, ...config };
}

export async function getScraperConfigs() {
  if (!isFirebaseConfigured()) {
    return [...DEMO_SCRAPER_CONFIGS];
  }
  const q = query(collection(db, 'scraperConfigs'), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(docToObj);
}

export async function updateScraperConfig(id, updates) {
  if (!isFirebaseConfigured()) return;
  const ref = doc(db, 'scraperConfigs', id);
  await updateDoc(ref, updates);
}

export async function deleteScraperConfig(id) {
  if (!isFirebaseConfigured()) return;
  const ref = doc(db, 'scraperConfigs', id);
  await deleteDoc(ref);
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function addAlert(alert) {
  if (!isFirebaseConfigured()) {
    const id = `demo-alert-${Date.now()}`;
    return { id, ...alert };
  }
  const docRef = await addDoc(collection(db, 'alerts'), {
    ...alert,
    read: false,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...alert };
}

export async function getAlerts(limitCount = 50) {
  if (!isFirebaseConfigured()) {
    return DEMO_ALERTS.slice(0, limitCount);
  }
  const q = query(
    collection(db, 'alerts'),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToObj);
}

export async function markAlertRead(id) {
  if (!isFirebaseConfigured()) return;
  const ref = doc(db, 'alerts', id);
  await updateDoc(ref, { read: true });
}

// ---------------------------------------------------------------------------
// Real-time subscriptions
// ---------------------------------------------------------------------------

/**
 * Subscribe to real-time updates for scrape results.
 * Returns an unsubscribe function.
 */
export function subscribeToResults(callback) {
  if (!isFirebaseConfigured()) {
    // In demo mode, immediately invoke with demo data and return a no-op unsubscribe.
    callback(DEMO_RESULTS);
    return () => {};
  }
  const q = query(
    collection(db, 'scrapeResults'),
    orderBy('scrapedAt', 'desc'),
    firestoreLimit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToObj));
  });
}

/**
 * Subscribe to real-time updates for scrape runs.
 * Returns an unsubscribe function.
 */
export function subscribeToRuns(callback) {
  if (!isFirebaseConfigured()) {
    callback(DEMO_RUNS);
    return () => {};
  }
  const q = query(
    collection(db, 'scrapeRuns'),
    orderBy('startedAt', 'desc'),
    firestoreLimit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToObj));
  });
}

/**
 * Subscribe to real-time updates for alerts.
 * Returns an unsubscribe function.
 */
export function subscribeToAlerts(callback) {
  if (!isFirebaseConfigured()) {
    callback(DEMO_ALERTS);
    return () => {};
  }
  const q = query(
    collection(db, 'alerts'),
    orderBy('createdAt', 'desc'),
    firestoreLimit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToObj));
  });
}
