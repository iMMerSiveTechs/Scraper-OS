export const DEFAULT_SANDBOX_CODE = `#!/usr/bin/env node
// Universal Site Scraper \u2014 works with any static HTML site
// Usage: node scraper.mjs <url> [selector]

import * as cheerio from 'cheerio';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const url = process.argv[2] || 'https://news.ycombinator.com';
const selector = process.argv[3] || '.titleline > a';

async function scrape(targetUrl, cssSelector) {
  console.log(\`\\n\u26CF\uFE0F  Scraping: \${targetUrl}\`);
  console.log(\`\u{1F50D} Selector: \${cssSelector}\\n\`);

  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)',
    },
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

  console.log(\`\u2705 Found \${results.length} items\\n\`);
  results.slice(0, 5).forEach((r, i) => {
    console.log(\`  \${i + 1}. \${r.text.slice(0, 60)}\`);
  });

  // Save results
  if (!existsSync('./scraped')) mkdirSync('./scraped');
  const filename = \`./scraped/\${new URL(targetUrl).hostname}_\${Date.now()}.json\`;
  writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(\`\\n\u{1F4BE} Saved to \${filename}\`);

  return results;
}

scrape(url, selector).catch(console.error);`;
