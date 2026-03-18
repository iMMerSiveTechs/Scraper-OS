export const PIPELINE_CODE_TEMPLATES = {
  extract: {
    cheerio: `import * as cheerio from 'cheerio';

export async function extract(url, selector) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; scraper/1.0)' },
  });
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  const $ = cheerio.load(await res.text());
  const items = [];
  $(selector).each((i, el) => {
    items.push({
      text: $(el).text().trim(),
      href: $(el).find('a').attr('href') || null,
      html: $(el).html(),
    });
  });
  return items;
}`,
    puppeteer: `import puppeteer from 'puppeteer';

export async function extract(url, selector) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  // Auto-scroll for dynamic content
  await page.evaluate(async () => {
    await new Promise(r => {
      let h = 0; const d = 400;
      const t = setInterval(() => {
        window.scrollBy(0, d); h += d;
        if (h >= document.body.scrollHeight) { clearInterval(t); r(); }
      }, 200);
    });
  });
  const items = await page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].map(el => ({
      text: el.textContent?.trim(),
      href: el.querySelector('a')?.href || null,
    }));
  }, selector);
  await browser.close();
  return items;
}`,
    playwright: `import { chromium } from 'playwright';

export async function extract(url, selector) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const items = await page.$$eval(selector, els =>
    els.map(el => ({
      text: el.textContent?.trim(),
      href: el.querySelector('a')?.href || null,
    }))
  );
  await browser.close();
  return items;
}`,
    "node-fetch": `export async function extract(apiUrl) {
  const res = await fetch(apiUrl, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; scraper/1.0)',
    },
  });
  if (!res.ok) throw new Error(\`API returned \${res.status}\`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || data.data || [data];
}`,
  },
  normalize: {
    zod: `import { z } from 'zod';

const ItemSchema = z.object({
  text: z.string().trim().min(1),
  href: z.string().url().nullable(),
  scrapedAt: z.string().datetime().default(() => new Date().toISOString()),
});

export function normalize(rawItems) {
  return rawItems
    .map(item => {
      const result = ItemSchema.safeParse(item);
      return result.success ? result.data : null;
    })
    .filter(Boolean);
}`,
    lodash: `import _ from 'lodash';

export function normalize(rawItems) {
  return _.chain(rawItems)
    .map(item => ({
      text: _.trim(item.text),
      href: item.href || null,
      scrapedAt: new Date().toISOString(),
    }))
    .filter(item => item.text.length > 0)
    .uniqBy('text')
    .value();
}`,
    "date-fns": `import { parseISO, format, isValid } from 'date-fns';

export function normalize(rawItems) {
  return rawItems.map(item => ({
    ...item,
    text: item.text?.trim() || '',
    date: item.date && isValid(parseISO(item.date))
      ? format(parseISO(item.date), 'yyyy-MM-dd')
      : null,
    scrapedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  })).filter(item => item.text.length > 0);
}`,
  },
  store: {
    "better-sqlite3": `import Database from 'better-sqlite3';

export function store(items, dbPath = './scraped/data.db') {
  const db = new Database(dbPath);
  db.exec(\`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    href TEXT,
    scraped_at TEXT DEFAULT CURRENT_TIMESTAMP
  )\`);
  const insert = db.prepare('INSERT INTO items (text, href) VALUES (?, ?)');
  const tx = db.transaction((data) => {
    for (const item of data) insert.run(item.text, item.href);
  });
  tx(items);
  console.log(\`💾 Stored \${items.length} items in \${dbPath}\`);
  db.close();
}`,
    pg: `import pg from 'pg';

export async function store(items) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(\`CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    href TEXT,
    scraped_at TIMESTAMPTZ DEFAULT NOW()
  )\`);
  for (const item of items) {
    await pool.query('INSERT INTO items (text, href) VALUES ($1, $2)', [item.text, item.href]);
  }
  console.log(\`💾 Stored \${items.length} items in Postgres\`);
  await pool.end();
}`,
    "drizzle-orm": `// Requires drizzle-orm + better-sqlite3 setup
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  href: text('href'),
  scrapedAt: text('scraped_at').default(new Date().toISOString()),
});

// In your pipeline: await db.insert(items).values(normalizedData);`,
  },
  serve: {
    Express: `import express from 'express';
import Database from 'better-sqlite3';

const app = express();
const db = new Database('./scraped/data.db');

app.get('/api/items', (req, res) => {
  const { limit = 50, offset = 0, q } = req.query;
  let query = 'SELECT * FROM items';
  const params = [];
  if (q) { query += ' WHERE text LIKE ?'; params.push(\`%\${q}%\`); }
  query += ' ORDER BY scraped_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const items = db.prepare(query).all(...params);
  res.json({ items, total: db.prepare('SELECT COUNT(*) as c FROM items').get().c });
});

app.listen(3000, () => console.log('📡 API running on http://localhost:3000'));`,
  },
};

export function generatePipelineCode(config, pipelineName, targetUrl) {
  const sections = [];
  const imports = [];

  sections.push(`#!/usr/bin/env node
// ${pipelineName || 'My Scraper Pipeline'}
// Generated by Scraper OS
// Target: ${targetUrl || '<your-url>'}
// Schedule: ${config.schedule}
`);

  const extractTools = config.steps[2] || [];
  const normalizeTools = config.steps[3] || [];
  const storeTools = config.steps[5] || [];

  // Pick primary tools
  const extractTool = extractTools[0];
  const normalizeTool = normalizeTools[0];
  const storeTool = storeTools[0];

  if (extractTool && PIPELINE_CODE_TEMPLATES.extract[extractTool]) {
    sections.push(`// ── EXTRACT ──\n${PIPELINE_CODE_TEMPLATES.extract[extractTool]}\n`);
  }

  if (normalizeTool && PIPELINE_CODE_TEMPLATES.normalize[normalizeTool]) {
    sections.push(`// ── NORMALIZE ──\n${PIPELINE_CODE_TEMPLATES.normalize[normalizeTool]}\n`);
  }

  if (storeTool && PIPELINE_CODE_TEMPLATES.store[storeTool]) {
    sections.push(`// ── STORE ──\n${PIPELINE_CODE_TEMPLATES.store[storeTool]}\n`);
  }

  // Main runner
  sections.push(`// ── RUN PIPELINE ──
async function runPipeline() {
  console.log('🚀 Starting pipeline: ${pipelineName || 'scraper'}');
  const targetUrl = '${targetUrl || 'https://example.com'}';
  ${extractTool ? `\n  // Step 1: Extract\n  const raw = await extract(targetUrl${extractTool === 'node-fetch' ? '' : ", '.item'"});` : '  // Configure your extraction...'}
  ${normalizeTool ? `\n  // Step 2: Normalize\n  const clean = normalize(raw);` : ''}
  ${storeTool ? `\n  // Step 3: Store\n  ${storeTool === 'pg' ? 'await ' : ''}store(${normalizeTool ? 'clean' : 'raw'});` : ''}
  console.log('✅ Pipeline complete');
}

runPipeline().catch(console.error);`);

  return sections.join('\n');
}
