export const TEMPLATES = [
  {
    id: "basic-cheerio",
    name: "Basic Cheerio Scraper",
    description: "Simple static HTML scraper with CSS selectors. Best starting point.",
    difficulty: "Beginner",
    approach: "static",
    code: `#!/usr/bin/env node
// Basic Cheerio Scraper
// Usage: node scraper.mjs <url> [selector]

import * as cheerio from 'cheerio';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const url = process.argv[2] || 'https://news.ycombinator.com';
const selector = process.argv[3] || '.titleline > a';

async function scrape(targetUrl, cssSelector) {
  console.log(\`\\n⛏️  Scraping: \${targetUrl}\`);
  console.log(\`🔍 Selector: \${cssSelector}\\n\`);

  const res = await fetch(targetUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
  });
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const results = [];

  $(cssSelector).each((i, el) => {
    const $el = $(el);
    results.push({
      text: $el.text().trim(),
      href: $el.attr('href') || null,
    });
  });

  console.log(\`✅ Found \${results.length} items\\n\`);
  results.slice(0, 5).forEach((r, i) => console.log(\`  \${i + 1}. \${r.text.slice(0, 60)}\`));

  if (!existsSync('./scraped')) mkdirSync('./scraped');
  const filename = \`./scraped/\${new URL(targetUrl).hostname}_\${Date.now()}.json\`;
  writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(\`\\n💾 Saved to \${filename}\`);
  return results;
}

scrape(url, selector).catch(console.error);`,
  },
  {
    id: "puppeteer-scroll",
    name: "Puppeteer Auto-Scroll",
    description: "Headless browser scraper with infinite scroll handling.",
    difficulty: "Intermediate",
    approach: "browser",
    code: `#!/usr/bin/env node
// Puppeteer scraper with auto-scroll for dynamic pages
// npm install puppeteer

import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const URL = process.argv[2] || 'https://example.com';
const SELECTOR = process.argv[3] || 'article';

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

async function scrape() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (compatible; research-bot/1.0)');

  console.log(\`🤖 Navigating to \${URL}...\`);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('📜 Auto-scrolling...');
  await autoScroll(page);

  const results = await page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].map(el => ({
      text: el.textContent?.trim().slice(0, 200),
      href: el.querySelector('a')?.href || null,
    }));
  }, SELECTOR);

  await browser.close();

  console.log(\`✅ Found \${results.length} items\`);
  if (!existsSync('./scraped')) mkdirSync('./scraped');
  const filename = \`./scraped/puppeteer_\${Date.now()}.json\`;
  writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(\`💾 Saved to \${filename}\`);
}

scrape().catch(console.error);`,
  },
  {
    id: "api-graphql",
    name: "API / GraphQL Scraper",
    description: "Direct API calls found via DevTools Network tab. Fastest approach.",
    difficulty: "Advanced",
    approach: "api",
    code: `#!/usr/bin/env node
// API Reverse-Engineering Scraper
// Find endpoints via DevTools → Network → XHR filter

const API_URL = process.argv[2] || 'https://api.example.com/data';

async function scrapeAPI(url) {
  console.log(\`🔍 Calling API: \${url}\\n\`);

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)',
      // Add auth headers if needed:
      // 'Authorization': 'Bearer YOUR_TOKEN',
    },
  });

  if (!res.ok) throw new Error(\`API returned \${res.status}\`);
  const data = await res.json();

  // Adapt this to your API's response shape:
  const items = Array.isArray(data) ? data : data.results || data.data || [data];

  console.log(\`✅ Got \${items.length} items\`);
  items.slice(0, 3).forEach((item, i) => {
    console.log(\`  \${i + 1}. \${JSON.stringify(item).slice(0, 80)}...\`);
  });

  // Save
  const { writeFileSync, mkdirSync, existsSync } = await import('fs');
  if (!existsSync('./scraped')) mkdirSync('./scraped');
  const filename = \`./scraped/api_\${Date.now()}.json\`;
  writeFileSync(filename, JSON.stringify(items, null, 2));
  console.log(\`\\n💾 Saved to \${filename}\`);
}

scrapeAPI(API_URL).catch(console.error);`,
  },
  {
    id: "pagination",
    name: "Pagination Handler",
    description: "Loops through multiple pages, collecting all results.",
    difficulty: "Intermediate",
    approach: "static",
    code: `#!/usr/bin/env node
// Paginated scraper — loops through pages until no more results
// npm install cheerio

import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const BASE_URL = 'https://example.com/listings';
const SELECTOR = '.listing-card';
const MAX_PAGES = 10;
const DELAY_MS = 1500; // Be respectful

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function scrapePage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
  });
  if (!res.ok) throw new Error(\`HTTP \${res.status} on \${url}\`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const items = [];

  $(SELECTOR).each((i, el) => {
    items.push({
      text: $(el).text().trim().slice(0, 200),
      href: $(el).find('a').attr('href') || null,
    });
  });

  return items;
}

async function scrapeAll() {
  const allResults = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = \`\${BASE_URL}?page=\${page}\`;
    console.log(\`📄 Page \${page}: \${url}\`);

    const items = await scrapePage(url);
    if (items.length === 0) {
      console.log('  No more results — stopping.');
      break;
    }

    allResults.push(...items);
    console.log(\`  Found \${items.length} items (total: \${allResults.length})\`);

    if (page < MAX_PAGES) await sleep(DELAY_MS);
  }

  if (!existsSync('./scraped')) mkdirSync('./scraped');
  const filename = \`./scraped/paginated_\${Date.now()}.json\`;
  writeFileSync(filename, JSON.stringify(allResults, null, 2));
  console.log(\`\\n✅ Total: \${allResults.length} items → \${filename}\`);
}

scrapeAll().catch(console.error);`,
  },
  {
    id: "json-ld",
    name: "JSON-LD Extractor",
    description: "Extract structured data (schema.org) embedded in pages.",
    difficulty: "Beginner",
    approach: "static",
    code: `#!/usr/bin/env node
// JSON-LD Structured Data Extractor
// Finds schema.org data embedded in <script type="application/ld+json">

import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const URL = process.argv[2] || 'https://example.com';

async function extractJsonLd(url) {
  console.log(\`🔍 Extracting JSON-LD from: \${url}\\n\`);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
  });
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const schemas = [];

  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      schemas.push(data);
      console.log(\`  ✅ Found: \${data['@type'] || 'Unknown type'}\`);
    } catch (e) {
      console.log(\`  ⚠️ Malformed JSON-LD in script #\${i}\`);
    }
  });

  if (schemas.length === 0) {
    console.log('  No JSON-LD found on this page.');
    return [];
  }

  if (!existsSync('./scraped')) mkdirSync('./scraped');
  const filename = \`./scraped/jsonld_\${Date.now()}.json\`;
  writeFileSync(filename, JSON.stringify(schemas, null, 2));
  console.log(\`\\n💾 \${schemas.length} schema(s) saved to \${filename}\`);
  return schemas;
}

extractJsonLd(URL).catch(console.error);`,
  },
  {
    id: "csv-export",
    name: "CSV Export Scraper",
    description: "Scrapes data and exports directly to CSV format.",
    difficulty: "Beginner",
    approach: "static",
    code: `#!/usr/bin/env node
// Scraper that exports to CSV
// npm install cheerio

import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const URL = process.argv[2] || 'https://example.com/products';
const SELECTOR = '.product';

function toCSV(items) {
  if (items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const rows = items.map(item =>
    headers.map(h => \`"\${String(item[h] || '').replace(/"/g, '""')}"\`).join(',')
  );
  return [headers.join(','), ...rows].join('\\n');
}

async function scrape() {
  console.log(\`⛏️  Scraping: \${URL}\\n\`);
  const res = await fetch(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
  });
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);

  const $ = cheerio.load(await res.text());
  const items = [];

  $(SELECTOR).each((i, el) => {
    items.push({
      name: $(el).find('.name, h2, h3').first().text().trim(),
      price: $(el).find('.price').text().trim(),
      link: $(el).find('a').attr('href') || '',
      description: $(el).find('.desc, p').first().text().trim().slice(0, 200),
    });
  });

  console.log(\`✅ Found \${items.length} items\`);

  if (!existsSync('./scraped')) mkdirSync('./scraped');
  // JSON
  writeFileSync(\`./scraped/data_\${Date.now()}.json\`, JSON.stringify(items, null, 2));
  // CSV
  const csvFile = \`./scraped/data_\${Date.now()}.csv\`;
  writeFileSync(csvFile, toCSV(items));
  console.log(\`💾 Saved JSON + CSV to ./scraped/\`);
}

scrape().catch(console.error);`,
  },
  {
    id: "rate-limited",
    name: "Rate-Limited Scraper",
    description: "Scraper with retry logic, delays, and error handling.",
    difficulty: "Intermediate",
    approach: "static",
    code: `#!/usr/bin/env node
// Rate-limited scraper with exponential backoff retry
// npm install cheerio

import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const URLS = [
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/page3',
];
const SELECTOR = 'article';
const DELAY_MS = 2000;
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
      });
      if (res.status === 429) {
        const wait = Math.pow(2, attempt) * 1000;
        console.log(\`  ⏳ Rate limited. Waiting \${wait/1000}s...\`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = Math.pow(2, attempt) * 1000;
      console.log(\`  ⚠️ Attempt \${attempt} failed. Retrying in \${wait/1000}s...\`);
      await sleep(wait);
    }
  }
}

async function scrapeAll() {
  const allResults = [];

  for (const url of URLS) {
    console.log(\`⛏️  \${url}\`);
    try {
      const html = await fetchWithRetry(url);
      const $ = cheerio.load(html);
      const items = [];
      $(SELECTOR).each((i, el) => {
        items.push({ text: $(el).text().trim().slice(0, 200), url });
      });
      allResults.push(...items);
      console.log(\`  ✅ \${items.length} items\`);
    } catch (err) {
      console.log(\`  ❌ Failed: \${err.message}\`);
    }
    await sleep(DELAY_MS);
  }

  if (!existsSync('./scraped')) mkdirSync('./scraped');
  writeFileSync(\`./scraped/resilient_\${Date.now()}.json\`, JSON.stringify(allResults, null, 2));
  console.log(\`\\n✅ Total: \${allResults.length} items saved\`);
}

scrapeAll().catch(console.error);`,
  },
  {
    id: "monitor-diff",
    name: "Change Monitor",
    description: "Detects changes on a page by comparing snapshots over time.",
    difficulty: "Advanced",
    approach: "static",
    code: `#!/usr/bin/env node
// Page change monitor — diffs current vs previous snapshot
// Run on a schedule (cron) to track changes over time
// npm install cheerio

import * as cheerio from 'cheerio';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

const URL = process.argv[2] || 'https://example.com/pricing';
const SELECTOR = process.argv[3] || '.price';
const SNAPSHOT_FILE = './scraped/last_snapshot.json';

async function getCurrentData(url, selector) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
  });
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);

  const $ = cheerio.load(await res.text());
  const items = [];
  $(selector).each((i, el) => {
    items.push($(el).text().trim());
  });
  return items;
}

async function monitor() {
  console.log(\`👁️  Monitoring: \${URL}\`);
  console.log(\`   Selector: \${SELECTOR}\\n\`);

  if (!existsSync('./scraped')) mkdirSync('./scraped');
  const current = await getCurrentData(URL, SELECTOR);

  if (existsSync(SNAPSHOT_FILE)) {
    const previous = JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf-8'));
    const added = current.filter(x => !previous.includes(x));
    const removed = previous.filter(x => !current.includes(x));

    if (added.length === 0 && removed.length === 0) {
      console.log('✅ No changes detected.');
    } else {
      console.log('🔔 CHANGES DETECTED:');
      added.forEach(x => console.log(\`  + \${x}\`));
      removed.forEach(x => console.log(\`  - \${x}\`));

      // Log the diff
      const diffFile = \`./scraped/diff_\${Date.now()}.json\`;
      writeFileSync(diffFile, JSON.stringify({ added, removed, timestamp: new Date().toISOString() }, null, 2));
      console.log(\`\\n💾 Diff saved to \${diffFile}\`);
    }
  } else {
    console.log(\`📸 First snapshot (\${current.length} items). Run again to detect changes.\`);
  }

  writeFileSync(SNAPSHOT_FILE, JSON.stringify(current, null, 2));
}

monitor().catch(console.error);`,
  },
];
