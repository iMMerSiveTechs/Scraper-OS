/**
 * Server-side scraping proxy.
 * Fetches URLs without CORS restrictions, with user-agent rotation and timeouts.
 */

import { Router } from 'express';
import * as cheerio from 'cheerio';

export const scrapeRouter = Router();

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'ScraperOS/1.0 (Local Development)',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * POST /api/scrape
 * Body: { url, type?: 'html'|'json'|'rss', headers?: {}, timeout?: number }
 * Returns: { data: string, contentType: string, status: number }
 */
scrapeRouter.post('/', async (req, res, next) => {
  let timer;
  try {
    const { url, type, headers: customHeaders, timeout = 15000 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': randomUA(),
        'Accept': type === 'json' ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...customHeaders,
      },
    });

    clearTimeout(timer);

    const data = await response.text();
    const contentType = response.headers.get('content-type') || '';

    res.json({
      data,
      contentType,
      status: response.status,
      url: response.url, // Final URL after redirects
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return res.status(408).json({ error: 'Request timed out' });
    }
    next(err);
  }
});

/**
 * POST /api/scrape/parse
 * Server-side HTML parsing with cheerio.
 * Body: { url, selectors: { itemSelector, fields: [{ name, selector, extract }] } }
 * Returns: { items: [...], error: null }
 */
scrapeRouter.post('/parse', async (req, res, next) => {
  try {
    const { url, selectors, html: providedHtml } = req.body;

    let html = providedHtml;
    if (!html && url) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': randomUA() },
      });
      clearTimeout(timer);
      html = await response.text();
    }

    if (!html) {
      return res.status(400).json({ error: 'URL or HTML required' });
    }

    if (!selectors?.itemSelector) {
      return res.json({ items: [], html: html.slice(0, 50000) }); // Return raw HTML for debugging
    }

    const $ = cheerio.load(html);
    const items = [];

    $(selectors.itemSelector).each((_, el) => {
      const item = {};
      for (const field of selectors.fields || []) {
        const target = field.selector ? $(el).find(field.selector).first() : $(el);
        switch (field.extract || 'text') {
          case 'text':
            item[field.name] = target.text().trim();
            break;
          case 'href':
            item[field.name] = target.attr('href') || '';
            break;
          case 'src':
            item[field.name] = target.attr('src') || '';
            break;
          case 'html':
            item[field.name] = target.html()?.trim() || '';
            break;
          case 'attr':
            item[field.name] = target.attr(field.attribute || '') || '';
            break;
          default:
            item[field.name] = target.text().trim();
        }
      }
      items.push(item);
    });

    res.json({ items, error: null });
  } catch (err) {
    next(err);
  }
});
