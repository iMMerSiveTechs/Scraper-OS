/**
 * File watcher utility using chokidar.
 * Manages multiple watcher instances and pushes events via callbacks.
 */

import chokidar from 'chokidar';
import path from 'path';

const watchers = new Map();
let nextId = 1;

/**
 * Create a file watcher on the given directories.
 * Returns a watcher ID for cleanup.
 */
export function createWatcher(dirs, patterns, callback) {
  const id = `watcher-${nextId++}`;

  // Build glob patterns
  const globs = dirs.flatMap((dir) =>
    patterns.map((p) => path.join(dir, '**', p))
  );

  const watcher = chokidar.watch(globs, {
    ignored: /(^|[\/\\])\.|node_modules/,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  watcher.on('add', (filePath, stats) => {
    callback({
      event: 'add',
      path: filePath,
      name: path.basename(filePath),
      type: path.extname(filePath).slice(1),
      size: stats?.size,
      timestamp: new Date().toISOString(),
    });
  });

  watcher.on('change', (filePath, stats) => {
    callback({
      event: 'change',
      path: filePath,
      name: path.basename(filePath),
      type: path.extname(filePath).slice(1),
      size: stats?.size,
      timestamp: new Date().toISOString(),
    });
  });

  watcher.on('unlink', (filePath) => {
    callback({
      event: 'unlink',
      path: filePath,
      name: path.basename(filePath),
      timestamp: new Date().toISOString(),
    });
  });

  watcher.on('error', (err) => {
    callback({ event: 'error', message: err.message, timestamp: new Date().toISOString() });
  });

  watchers.set(id, { watcher, dirs, patterns, createdAt: new Date().toISOString() });
  return id;
}

/**
 * Remove a watcher by ID.
 */
export function removeWatcher(id) {
  const entry = watchers.get(id);
  if (entry) {
    entry.watcher.close();
    watchers.delete(id);
  }
}

/**
 * Get info about active watchers.
 */
export function getActiveWatchers() {
  return Array.from(watchers.entries()).map(([id, entry]) => ({
    id,
    dirs: entry.dirs,
    patterns: entry.patterns,
    createdAt: entry.createdAt,
  }));
}
