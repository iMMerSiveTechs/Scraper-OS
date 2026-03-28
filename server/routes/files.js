/**
 * File system operations — list, read, scan directories.
 * Plus SSE endpoint for file watching.
 */

import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { createWatcher, removeWatcher, getActiveWatchers } from '../utils/watcher.js';

export const filesRouter = Router();

// Path validation — prevent directory traversal
function validatePath(p) {
  const resolved = path.resolve(p);
  // Block access to system directories
  const blocked = ['/etc', '/usr', '/bin', '/sbin', '/var', '/proc', '/sys', '/dev'];
  if (blocked.some((b) => resolved.startsWith(b))) {
    throw new Error(`Access denied: ${resolved}`);
  }
  return resolved;
}

/**
 * GET /api/files?dir=/path
 * List files in a directory.
 */
filesRouter.get('/', async (req, res, next) => {
  try {
    const dir = validatePath(req.query.dir || process.cwd());
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const files = await Promise.all(
      entries
        .filter((e) => !e.name.startsWith('.'))
        .map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          try {
            const stats = await fs.stat(fullPath);
            return {
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory(),
              size: stats.size,
              modified: stats.mtime.toISOString(),
              type: entry.isDirectory() ? 'directory' : path.extname(entry.name).slice(1) || 'file',
            };
          } catch {
            return null;
          }
        })
    );

    res.json({ dir, files: files.filter(Boolean) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/files/read
 * Read a file's contents.
 * Body: { path, encoding: 'utf-8', maxSize: 1048576 }
 */
filesRouter.post('/read', async (req, res, next) => {
  try {
    const filePath = validatePath(req.body.path);
    const maxSize = req.body.maxSize || 1024 * 1024; // 1MB default

    const stats = await fs.stat(filePath);
    if (stats.size > maxSize) {
      return res.status(413).json({
        error: `File too large (${(stats.size / 1024 / 1024).toFixed(1)}MB). Max: ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
      });
    }

    const content = await fs.readFile(filePath, req.body.encoding || 'utf-8');

    res.json({
      content,
      meta: {
        path: filePath,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        type: path.extname(filePath).slice(1) || 'file',
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/files/scan
 * Recursively scan a directory.
 * Body: { dir, patterns: ['*.json', '*.md'], maxDepth: 5, maxFiles: 1000 }
 */
filesRouter.post('/scan', async (req, res, next) => {
  try {
    const dir = validatePath(req.body.dir || process.cwd());
    const patterns = req.body.patterns || ['*'];
    const maxDepth = req.body.maxDepth || 5;
    const maxFiles = req.body.maxFiles || 1000;

    const files = [];
    let totalSize = 0;

    async function scan(currentDir, depth) {
      if (depth > maxDepth || files.length >= maxFiles) return;

      let entries;
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch {
        return; // Skip unreadable directories
      }

      for (const entry of entries) {
        if (files.length >= maxFiles) break;
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath, depth + 1);
        } else if (matchesPatterns(entry.name, patterns)) {
          try {
            const stats = await fs.stat(fullPath);
            files.push({
              name: entry.name,
              path: fullPath,
              relativePath: path.relative(dir, fullPath),
              size: stats.size,
              modified: stats.mtime.toISOString(),
              type: path.extname(entry.name).slice(1) || 'file',
            });
            totalSize += stats.size;
          } catch {
            // Skip inaccessible files
          }
        }
      }
    }

    await scan(dir, 0);

    res.json({
      dir,
      files,
      totalFiles: files.length,
      totalSize,
      truncated: files.length >= maxFiles,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/watch — SSE endpoint for file watching
 * Query: dirs=/path1,/path2&patterns=*.json,*.md
 */
filesRouter.get('/watch', (req, res) => {
  const dirs = (req.query.dirs || '').split(',').filter(Boolean);
  const patterns = (req.query.patterns || '*').split(',');

  if (dirs.length === 0) {
    return res.status(400).json({ error: 'No directories specified' });
  }

  // Validate all directories before opening SSE
  let validatedDirs;
  try {
    validatedDirs = dirs.map(validatePath);
  } catch (err) {
    return res.status(403).json({ error: err.message });
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(`data: ${JSON.stringify({ event: 'connected', dirs: validatedDirs })}\n\n`);

  let watcherId;
  try {
    watcherId = createWatcher(validatedDirs, patterns, (event) => {
      try { res.write(`data: ${JSON.stringify(event)}\n\n`); } catch { /* client disconnected */ }
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ event: 'error', message: err.message })}\n\n`);
    res.end();
    return;
  }

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeWatcher(watcherId);
  });
});

/**
 * GET /api/files/watchers — List active watchers
 */
filesRouter.get('/watchers', (req, res) => {
  res.json({ watchers: getActiveWatchers() });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesPatterns(filename, patterns) {
  if (patterns.includes('*')) return true;
  return patterns.some((pattern) => {
    if (pattern.startsWith('*.')) {
      return filename.endsWith(pattern.slice(1));
    }
    return filename === pattern;
  });
}
