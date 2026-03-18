export const APPROACHES = [
  {
    id: "static",
    title: "Static HTML",
    subtitle: "Cheerio / DOM Parsing",
    difficulty: "Beginner",
    speed: "Fast",
    coverage: "~40%",
    icon: "\u{1F4C4}",
    color: "#00ff88",
    setup: "npm install cheerio",
    whenToUse: "Start here. If the data is in the HTML source, this is fastest.",
    description:
      "Fetch raw HTML, parse the DOM tree, extract data with CSS selectors. No browser needed. Works on server-rendered sites where content exists in the initial HTML response.",
    bestFor: [
      "Blogs & news sites",
      "Static directories",
      "Wikipedia, docs",
      "Sites with SSR (Next.js, etc.)",
    ],
    failsOn: [
      "SPAs (React/Vue apps)",
      "Infinite scroll",
      "Login-protected content",
      "Heavy JS-rendered pages",
    ],
    code: `import * as cheerio from 'cheerio';

// 1. Fetch the raw HTML
const res = await fetch('https://example.com/tools');
const html = await res.text();

// 2. Load into Cheerio (jQuery-like API)
const $ = cheerio.load(html);

// 3. Extract with CSS selectors
const tools = [];
$('.tool-card').each((i, el) => {
  tools.push({
    name: $(el).find('.tool-name').text().trim(),
    url: $(el).find('a').attr('href'),
    description: $(el).find('.desc').text().trim(),
    price: $(el).find('.price').text().trim(),
    category: $(el).find('.tag').text().trim(),
  });
});

console.log(\`Scraped \${tools.length} tools\`);`,
    realWorld: `// Scraping a blog index for post metadata
const $ = cheerio.load(html);
const posts = [];

$('article.post').each((i, el) => {
  posts.push({
    title: $(el).find('h2 a').text(),
    link: $(el).find('h2 a').attr('href'),
    date: $(el).find('time').attr('datetime'),
    excerpt: $(el).find('.excerpt').text().trim(),
    tags: $(el).find('.tag')
      .map((_, t) => $(t).text()).get(),
  });
});`,
  },
  {
    id: "browser",
    title: "Browser Automation",
    subtitle: "Puppeteer / Playwright",
    difficulty: "Intermediate",
    speed: "Slower",
    coverage: "~95%",
    icon: "\u{1F916}",
    color: "#ff6b35",
    setup: "npm install puppeteer",
    whenToUse: "Use when content is JS-rendered or requires interaction.",
    description:
      "Launch a headless browser, navigate pages, wait for JS to render, interact with elements, then extract the fully-rendered DOM. The nuclear option \u2014 works on almost everything.",
    bestFor: [
      "SPAs (React, Vue, Angular)",
      "Infinite scroll pages",
      "Sites requiring interaction",
      "Screenshot capture",
    ],
    failsOn: [
      "Heavy bot detection (Cloudflare)",
      "CAPTCHAs",
      "Rate-limited APIs",
      "When an API exists (overkill)",
    ],
    code: `import puppeteer from 'puppeteer';

// 1. Launch headless browser
const browser = await puppeteer.launch();
const page = await browser.newPage();

// 2. Navigate and wait for content
await page.goto('https://producthunt.com/topics/ai', {
  waitUntil: 'networkidle2'
});

// 3. Scroll to load dynamic content
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2000);

// 4. Extract from the live DOM
const tools = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-test="post-item"]')]
    .map(el => ({
      name: el.querySelector('h3')?.textContent,
      tagline: el.querySelector('[class*="tagline"]')?.textContent,
      votes: el.querySelector('[class*="vote"]')?.textContent,
      url: el.querySelector('a')?.href,
    }));
});

await browser.close();`,
    realWorld: `// Auto-scroll helper for infinite scroll pages
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
}`,
  },
  {
    id: "api",
    title: "API Reverse-Engineering",
    subtitle: "Network Tab \u2192 Direct Calls",
    difficulty: "Advanced",
    speed: "Fastest",
    coverage: "Varies",
    icon: "\u{1F50D}",
    color: "#a78bfa",
    setup: "No deps needed (uses built-in fetch)",
    whenToUse: "Check Network tab first. If you find JSON APIs, skip HTML entirely.",
    description:
      "Open DevTools Network tab, interact with the site, find the XHR/Fetch requests that load data. Call those endpoints directly. Cleanest data, fastest execution, no HTML parsing needed.",
    bestFor: [
      "Sites with REST/GraphQL APIs",
      "Product Hunt, GitHub, Reddit",
      "Any SPA (they ALL have APIs)",
      "When you need speed + clean data",
    ],
    failsOn: [
      "Heavily authenticated APIs",
      "Rotating tokens / signed requests",
      "When API requires cookies from browser",
      "Obfuscated API endpoints",
    ],
    code: `// Product Hunt uses GraphQL \u2014 found via Network tab
const query = \`{
  posts(order: VOTES, topic: "artificial-intelligence") {
    edges {
      node {
        name
        tagline
        votesCount
        website
        topics { edges { node { name } } }
      }
    }
  }
}\`;

const res = await fetch('https://www.producthunt.com/frontend/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

const { data } = await res.json();
const tools = data.posts.edges.map(e => e.node);`,
    realWorld: `// How to find hidden APIs \u2014 the detective workflow:
//
// 1. Open site in Chrome
// 2. DevTools \u2192 Network tab \u2192 XHR filter
// 3. Interact with the page (search, scroll, click)
// 4. Watch for fetch/XHR requests loading data
// 5. Click each one \u2014 check Response tab
// 6. Found JSON? That's your API endpoint
// 7. Right-click \u2192 Copy as cURL
// 8. Convert cURL to fetch() call
//
// Pro tip: Look for requests to:
//   /api/*, /graphql, /v1/*, /v2/*
//   *.json endpoints
//   Requests with query params like ?page=2
//
// Most SPAs have their entire data layer
// exposed through network requests.
// You almost NEVER need to scrape HTML
// from a modern React/Vue/Angular site.`,
  },
];
