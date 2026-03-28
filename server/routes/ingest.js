/**
 * File ingestion — upload + multi-format parsing.
 */

import { Router } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { parseFile } from '../utils/parser.js';

export const ingestRouter = Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * POST /api/ingest — Upload and parse files
 * Multipart form data with field name 'files'
 * Returns: { items: [...], fileCount, totalItems }
 */
ingestRouter.post('/', upload.array('files', 20), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const allItems = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const isPDF = ext === '.pdf';

      // For PDFs, pass the buffer directly
      const content = isPDF ? file.buffer : file.buffer.toString('utf-8');
      const items = await parseFile(content, file.originalname, file.originalname);
      allItems.push(...items);
    }

    res.json({
      items: allItems,
      fileCount: req.files.length,
      totalItems: allItems.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ingest/path — Ingest a file from local path
 * Body: { path }
 * Returns: { items: [...] }
 */
ingestRouter.post('/path', async (req, res, next) => {
  try {
    const filePath = path.resolve(req.body.path);
    const ext = path.extname(filePath).toLowerCase();
    const isPDF = ext === '.pdf';

    const content = isPDF
      ? await fs.readFile(filePath)
      : await fs.readFile(filePath, 'utf-8');

    const items = await parseFile(content, path.basename(filePath), filePath);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ingest/batch — Ingest multiple files from paths
 * Body: { paths: ['/path/to/file1', '/path/to/file2'] }
 * Returns: { items: [...], fileCount, errors: [] }
 */
ingestRouter.post('/batch', async (req, res, next) => {
  try {
    const paths = req.body.paths || [];
    const allItems = [];
    const errors = [];

    for (const p of paths) {
      try {
        const filePath = path.resolve(p);
        const ext = path.extname(filePath).toLowerCase();
        const isPDF = ext === '.pdf';

        const content = isPDF
          ? await fs.readFile(filePath)
          : await fs.readFile(filePath, 'utf-8');

        const items = await parseFile(content, path.basename(filePath), filePath);
        allItems.push(...items);
      } catch (err) {
        errors.push({ path: p, error: err.message });
      }
    }

    res.json({
      items: allItems,
      fileCount: paths.length - errors.length,
      totalItems: allItems.length,
      errors,
    });
  } catch (err) {
    next(err);
  }
});
