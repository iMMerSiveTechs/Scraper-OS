const STORAGE_PREFIX = "scraper-os-";
const EXPORT_VERSION = 1;

export function exportAllData() {
  const data = { version: EXPORT_VERSION, exportedAt: new Date().toISOString() };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(STORAGE_PREFIX)) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key));
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
  }

  return data;
}

export function downloadExport() {
  const data = exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `scraper-os-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function validateImport(json) {
  if (!json || typeof json !== "object") return { valid: false, error: "Invalid JSON" };
  if (!json.version) return { valid: false, error: "Missing version field" };

  const keys = Object.keys(json).filter((k) => k.startsWith(STORAGE_PREFIX));
  return {
    valid: true,
    keys,
    stats: {
      projects: json["scraper-os-statuses"] ? Object.keys(json["scraper-os-statuses"]).length : 0,
      hasSandbox: !!json["scraper-os-sandbox"],
      hasPipeline: !!json["scraper-os-pipeline"],
      hasNotes: !!json["scraper-os-notes"],
      hasSettings: !!json["scraper-os-settings"],
      customScrapers: json["scraper-os-custom-scrapers"]?.length || 0,
      hasTriggers: !!json["scraper-os-triggers"],
      ingestedItems: json["scraper-os-ingested"]?.length || 0,
    },
  };
}

export function importData(json) {
  const validation = validateImport(json);
  if (!validation.valid) throw new Error(validation.error);

  for (const key of validation.keys) {
    localStorage.setItem(key, JSON.stringify(json[key]));
  }
}

export function resetAllData() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(STORAGE_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

export function getDataStats() {
  let totalSize = 0;
  let keyCount = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(STORAGE_PREFIX)) {
      totalSize += (localStorage.getItem(key) || "").length;
      keyCount++;
    }
  }

  return { keyCount, totalSizeKB: Math.round(totalSize / 1024 * 10) / 10 };
}
