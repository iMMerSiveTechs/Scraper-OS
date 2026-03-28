import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Manages file upload, directory scanning, file watching, and ingested data.
 */
export function useFileIngestion() {
  const [ingestedItems, setIngestedItems] = useLocalStorage('scraper-os-ingested', []);
  const [watchDirs, setWatchDirs] = useLocalStorage('scraper-os-watch-dirs', []);
  const [watchPatterns, setWatchPatterns] = useLocalStorage('scraper-os-watch-patterns', ['*.json', '*.csv', '*.md', '*.txt']);
  const [scanning, setScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [watching, setWatching] = useState(false);
  const [watchEvents, setWatchEvents] = useState([]);
  const [serverOnline, setServerOnline] = useState(false);
  const eventSourceRef = useRef(null);

  // Check server health
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
        setServerOnline(res.ok);
      } catch {
        setServerOnline(false);
      }
    }
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // Upload files via multipart form
  const uploadFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return [];
    setUploading(true);
    setUploadProgress({ current: 0, total: fileList.length });

    const allItems = [];

    // If server available, upload there for full parsing (including PDF)
    if (serverOnline) {
      const formData = new FormData();
      for (const file of fileList) {
        formData.append('files', file);
      }

      try {
        const res = await fetch('/api/ingest', { method: 'POST', body: formData });
        if (res.ok) {
          const { items } = await res.json();
          allItems.push(...items);
        }
      } catch {
        // Fall through to browser-side parsing
      }
    }

    // Browser-side parsing fallback (text-based files only)
    if (allItems.length === 0) {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress({ current: i + 1, total: fileList.length });

        try {
          const text = await file.text();
          const now = new Date().toISOString();
          const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';

          // Basic browser-side parsing
          let items;
          if (ext === 'json') {
            try {
              const data = JSON.parse(text);
              const arr = Array.isArray(data) ? data : [data];
              items = arr.slice(0, 50).map((item, j) => ({
                source: 'file',
                sourceType: 'json',
                title: item.title || item.name || `${file.name} [${j}]`,
                content: JSON.stringify(item, null, 2).slice(0, 500),
                url: `file://${file.name}`,
                scrapedAt: now,
              }));
            } catch {
              items = [{ source: 'file', sourceType: 'json', title: file.name, content: text.slice(0, 1000), url: `file://${file.name}`, scrapedAt: now, metadata: { error: 'Invalid JSON' } }];
            }
          } else if (ext === 'csv' || ext === 'tsv') {
            const lines = text.split('\n').filter(Boolean);
            const headers = lines[0]?.split(ext === 'tsv' ? '\t' : ',') || [];
            items = lines.slice(1, 51).map((line, j) => {
              const vals = line.split(ext === 'tsv' ? '\t' : ',');
              const row = {};
              headers.forEach((h, k) => { row[h.trim()] = vals[k]?.trim() || ''; });
              return {
                source: 'file', sourceType: 'csv',
                title: row.title || row.name || row.Title || `${file.name} row ${j + 1}`,
                content: headers.map((h, k) => `${h.trim()}: ${vals[k]?.trim()}`).join('\n'),
                url: `file://${file.name}`, scrapedAt: now,
              };
            });
          } else {
            // Plain text / markdown / code
            items = [{
              source: 'file', sourceType: ext === 'md' ? 'markdown' : ext,
              title: text.split('\n')[0]?.trim().slice(0, 100) || file.name,
              content: text.slice(0, 2000),
              url: `file://${file.name}`, scrapedAt: now,
              metadata: { lineCount: text.split('\n').length },
            }];
          }

          allItems.push(...items);
        } catch {
          // Skip unreadable files
        }
      }
    }

    setIngestedItems((prev) => [...allItems, ...prev].slice(0, 500));
    setUploading(false);
    return allItems;
  }, [serverOnline, setIngestedItems]);

  // Scan directory via server
  const scanDirectory = useCallback(async (dir, patterns) => {
    if (!serverOnline) return [];
    setScanning(true);
    try {
      const res = await fetch('/api/files/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir, patterns: patterns || watchPatterns, maxDepth: 5 }),
      });
      if (!res.ok) throw new Error(`Scan failed: ${res.status}`);
      const { files } = await res.json();
      setScannedFiles(files);
      return files;
    } catch (err) {
      console.error('Scan failed:', err);
      return [];
    } finally {
      setScanning(false);
    }
  }, [serverOnline, watchPatterns]);

  // Ingest a single file by path (via server)
  const ingestFile = useCallback(async (filePath) => {
    if (!serverOnline) return [];
    try {
      const res = await fetch('/api/ingest/path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      if (!res.ok) return [];
      const { items } = await res.json();
      setIngestedItems((prev) => [...items, ...prev].slice(0, 500));
      return items;
    } catch {
      return [];
    }
  }, [serverOnline, setIngestedItems]);

  // Ingest all scanned files
  const ingestAll = useCallback(async () => {
    if (!serverOnline || scannedFiles.length === 0) return [];
    const paths = scannedFiles.map((f) => f.path);
    try {
      const res = await fetch('/api/ingest/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
      if (!res.ok) return [];
      const { items } = await res.json();
      setIngestedItems((prev) => [...items, ...prev].slice(0, 500));
      return items;
    } catch {
      return [];
    }
  }, [serverOnline, scannedFiles, setIngestedItems]);

  // File watching via SSE
  const startWatching = useCallback(() => {
    if (!serverOnline || watchDirs.length === 0) return;
    stopWatching();

    const params = new URLSearchParams({
      dirs: watchDirs.join(','),
      patterns: watchPatterns.join(','),
    });

    const es = new EventSource(`/api/files/watch?${params}`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setWatchEvents((prev) => [data, ...prev].slice(0, 50));

        // Auto-ingest on file add/change
        if ((data.event === 'add' || data.event === 'change') && data.path) {
          ingestFile(data.path);
        }
      } catch {
        // Skip parse errors
      }
    };
    es.onerror = () => {
      stopWatching();
      setServerOnline(false);
    };

    eventSourceRef.current = es;
    setWatching(true);
  }, [serverOnline, watchDirs, watchPatterns, ingestFile]);

  const stopWatching = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setWatching(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopWatching();
  }, [stopWatching]);

  const addWatchDir = useCallback((dir) => {
    setWatchDirs((prev) => prev.includes(dir) ? prev : [...prev, dir]);
  }, [setWatchDirs]);

  const removeWatchDir = useCallback((dir) => {
    setWatchDirs((prev) => prev.filter((d) => d !== dir));
  }, [setWatchDirs]);

  const clearIngested = useCallback(() => {
    setIngestedItems([]);
  }, [setIngestedItems]);

  return {
    serverOnline,
    uploadFiles, uploading, uploadProgress,
    scanDirectory, scanning, scannedFiles,
    ingestFile, ingestAll,
    watchDirs, addWatchDir, removeWatchDir, watchPatterns, setWatchPatterns,
    watchEvents, watching, startWatching, stopWatching,
    ingestedItems, clearIngested,
  };
}
