/**
 * Scraper OS — Express Backend Server
 *
 * Lightweight server that runs alongside Vite dev server.
 * Provides: server-side scraping (bypass CORS), file system access, file watching.
 * Port 3001 — Vite proxies /api/* here.
 */

import express from 'express';
import cors from 'cors';
import { scrapeRouter } from './routes/scrape.js';
import { filesRouter } from './routes/files.js';
import { ingestRouter } from './routes/ingest.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/scrape', scrapeRouter);
app.use('/api/files', filesRouter);
app.use('/api/ingest', ingestRouter);

// Error handler
app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n  Scraper OS Server running on http://localhost:${PORT}`);
  console.log(`  Routes: /api/scrape, /api/files, /api/ingest, /api/health\n`);
});
