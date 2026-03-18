import { useState } from "react";

const APPROACHES = [
  {
    id: "static",
    title: "Static HTML",
    subtitle: "Cheerio / DOM Parsing",
    difficulty: "Beginner",
    speed: "⚡ Fast",
    coverage: "~40% of sites",
    icon: "📄",
    color: "#00ff88",
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
    code: `const cheerio = require('cheerio');

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
    speed: "🐢 Slower",
    coverage: "~95% of sites",
    icon: "🤖",
    color: "#ff6b35",
    description:
      "Launch a headless browser, navigate pages, wait for JS to render, interact with elements, then extract the fully-rendered DOM. The nuclear option — works on almost everything.",
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
    code: `const puppeteer = require('puppeteer');

// 1. Launch headless browser
const browser = await puppeteer.launch();
const page = await browser.newPage();

// 2. Navigate and wait for content
await page.goto('https://producthunt.com/topics/ai', {
  waitUntil: 'networkidle2'
});

// 3. Auto-scroll to load more items
await autoScroll(page);

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
    subtitle: "Network Tab → Direct Calls",
    difficulty: "Advanced",
    speed: "⚡⚡ Fastest",
    coverage: "Varies",
    icon: "🔍",
    color: "#a78bfa",
    description:
      "Open DevTools → Network tab, interact with the site, find the XHR/Fetch requests that load data. Call those endpoints directly. Cleanest data, fastest execution, no HTML parsing needed.",
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
    code: `// Product Hunt uses GraphQL — found via Network tab
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
    // May need auth token from cookies
  },
  body: JSON.stringify({ query }),
});

const { data } = await res.json();
const tools = data.posts.edges.map(e => e.node);`,
    realWorld: `// How to find hidden APIs — the detective workflow:
//
// 1. Open site in Chrome
// 2. DevTools → Network tab → XHR filter
// 3. Interact with the page (search, scroll, click)
// 4. Watch for fetch/XHR requests loading data
// 5. Click each one — check Response tab
// 6. Found JSON? That's your API endpoint
// 7. Right-click → Copy as cURL
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

const PIPELINE_STEPS = [
  {
    step: 1,
    title: "Discover",
    icon: "🔎",
    desc: "Find target sites. Inspect HTML structure or reverse-engineer APIs via DevTools Network tab.",
  },
  {
    step: 2,
    title: "Extract",
    icon: "⛏️",
    desc: "Pull raw data using Cheerio, Puppeteer, or direct API calls. Handle pagination and rate limits.",
  },
  {
    step: 3,
    title: "Normalize",
    icon: "🔧",
    desc: "Clean and transform into a consistent schema. Deduplicate. Parse dates, prices, categories.",
  },
  {
    step: 4,
    title: "Enrich",
    icon: "🧠",
    desc: "Run through LLM for auto-categorization, summaries, tag extraction, sentiment analysis.",
  },
  {
    step: 5,
    title: "Store",
    icon: "💾",
    desc: "Push to SQLite/Postgres. Version the data. Track changes over time for monitoring.",
  },
  {
    step: 6,
    title: "Serve",
    icon: "📡",
    desc: "Expose via API or render in your app. Feed into search, recommendations, or display components.",
  },
];

const USE_CASES = [
  {
    app: "Profile App",
    icon: "👤",
    idea: "Showcase curated tools/services you use or recommend. Scrape tool metadata + logos to auto-populate your portfolio.",
  },
  {
    app: "Estimate OS",
    icon: "📊",
    idea: "Scrape competitor pricing from contractor sites. Monitor material costs from supplier pages. Auto-update price ranges.",
  },
  {
    app: "VibeForge",
    icon: "🔨",
    idea: "Scrape component libraries, design systems, and template galleries. Feed into the generator as reference patterns.",
  },
  {
    app: "Research",
    icon: "🔬",
    idea: "Track new AI tools, frameworks, and APIs. Build a personal knowledge base that's always current.",
  },
  {
    app: "Aromatic Codex",
    icon: "🌿",
    idea: "Scrape terpene databases, essential oil research papers, supplier catalogs. Auto-update your knowledge engine.",
  },
  {
    app: "ChurnWise",
    icon: "💸",
    idea: "Scrape subscription service pricing pages. Monitor price changes. Feed cancellation policy data.",
  },
];

export default function ScrapingPlaybook() {
  const [activeTab, setActiveTab] = useState("approaches");
  const [selectedApproach, setSelectedApproach] = useState(0);
  const [showRealWorld, setShowRealWorld] = useState(false);
  const [expandedStep, setExpandedStep] = useState(null);

  const approach = APPROACHES[selectedApproach];

  return (
    <div
      style={{
        background: "#0a0a0f",
        color: "#e0e0e8",
        minHeight: "100vh",
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "32px 24px 20px",
          borderBottom: "1px solid #1a1a2e",
          background: "linear-gradient(180deg, #0f0f1a 0%, #0a0a0f 100%)",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "4px",
            color: "#00ff88",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          iMMerSiveTechs // Learning Kit
        </div>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            margin: 0,
            fontFamily: "'Space Grotesk', sans-serif",
            background: "linear-gradient(135deg, #fff 0%, #888 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Web Scraping Playbook
        </h1>
        <p style={{ color: "#666", fontSize: "13px", marginTop: "6px" }}>
          3 approaches · pipeline architecture · your app use cases
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0",
          borderBottom: "1px solid #1a1a2e",
          padding: "0 24px",
          background: "#0c0c14",
        }}
      >
        {[
          { id: "approaches", label: "3 Approaches" },
          { id: "pipeline", label: "Pipeline" },
          { id: "usecases", label: "Your Apps" },
          { id: "quickstart", label: "Quick Start" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 20px",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid #00ff88"
                  : "2px solid transparent",
              color: activeTab === tab.id ? "#00ff88" : "#555",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "inherit",
              letterSpacing: "1px",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px" }}>
        {/* APPROACHES TAB */}
        {activeTab === "approaches" && (
          <div>
            {/* Approach selector */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
              {APPROACHES.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedApproach(i);
                    setShowRealWorld(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "16px",
                    background:
                      selectedApproach === i ? "#141428" : "#0e0e18",
                    border: `1px solid ${selectedApproach === i ? a.color + "44" : "#1a1a2e"}`,
                    borderRadius: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>
                    {a.icon}
                  </div>
                  <div
                    style={{
                      color: selectedApproach === i ? a.color : "#888",
                      fontSize: "14px",
                      fontWeight: 600,
                      fontFamily: "inherit",
                    }}
                  >
                    {a.title}
                  </div>
                  <div
                    style={{
                      color: "#555",
                      fontSize: "11px",
                      fontFamily: "inherit",
                    }}
                  >
                    {a.subtitle}
                  </div>
                </button>
              ))}
            </div>

            {/* Approach detail */}
            <div
              style={{
                background: "#0e0e18",
                border: "1px solid #1a1a2e",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {/* Meta bar */}
              <div
                style={{
                  display: "flex",
                  gap: "24px",
                  padding: "16px 20px",
                  borderBottom: "1px solid #1a1a2e",
                  fontSize: "12px",
                }}
              >
                {[
                  { label: "Difficulty", value: approach.difficulty },
                  { label: "Speed", value: approach.speed },
                  { label: "Coverage", value: approach.coverage },
                ].map((m) => (
                  <div key={m.label}>
                    <span style={{ color: "#555" }}>{m.label}: </span>
                    <span style={{ color: approach.color }}>{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div
                style={{
                  padding: "20px",
                  borderBottom: "1px solid #1a1a2e",
                }}
              >
                <p
                  style={{
                    color: "#aaa",
                    fontSize: "13px",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {approach.description}
                </p>
              </div>

              {/* Best for / Fails on */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  borderBottom: "1px solid #1a1a2e",
                }}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    borderRight: "1px solid #1a1a2e",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#00ff88",
                      letterSpacing: "2px",
                      marginBottom: "10px",
                    }}
                  >
                    ✓ BEST FOR
                  </div>
                  {approach.bestFor.map((item) => (
                    <div
                      key={item}
                      style={{
                        fontSize: "12px",
                        color: "#999",
                        padding: "4px 0",
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div style={{ padding: "16px 20px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#ff4444",
                      letterSpacing: "2px",
                      marginBottom: "10px",
                    }}
                  >
                    ✗ FAILS ON
                  </div>
                  {approach.failsOn.map((item) => (
                    <div
                      key={item}
                      style={{
                        fontSize: "12px",
                        color: "#999",
                        padding: "4px 0",
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Code */}
              <div style={{ padding: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: approach.color,
                      letterSpacing: "2px",
                    }}
                  >
                    {showRealWorld ? "REAL-WORLD PATTERN" : "BASIC EXAMPLE"}
                  </div>
                  <button
                    onClick={() => setShowRealWorld(!showRealWorld)}
                    style={{
                      padding: "6px 14px",
                      background: "#1a1a2e",
                      border: "1px solid #2a2a3e",
                      borderRadius: "6px",
                      color: "#888",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontFamily: "inherit",
                    }}
                  >
                    {showRealWorld ? "← Basic" : "Real-World →"}
                  </button>
                </div>
                <pre
                  style={{
                    background: "#080810",
                    border: "1px solid #1a1a2e",
                    borderRadius: "8px",
                    padding: "16px",
                    fontSize: "12px",
                    lineHeight: 1.6,
                    color: "#c8c8d0",
                    overflow: "auto",
                    maxHeight: "400px",
                    margin: 0,
                  }}
                >
                  {showRealWorld ? approach.realWorld : approach.code}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* PIPELINE TAB */}
        {activeTab === "pipeline" && (
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "#666",
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              Every scraping project follows this pipeline. The scraper itself is
              just step 2 — the real value is in the full flow.
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {PIPELINE_STEPS.map((s) => (
                <button
                  key={s.step}
                  onClick={() =>
                    setExpandedStep(expandedStep === s.step ? null : s.step)
                  }
                  style={{
                    background:
                      expandedStep === s.step ? "#141428" : "#0e0e18",
                    border: `1px solid ${expandedStep === s.step ? "#00ff8844" : "#1a1a2e"}`,
                    borderRadius: "10px",
                    padding: "16px 20px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "#1a1a2e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      {s.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#00ff88",
                            fontFamily: "inherit",
                          }}
                        >
                          {String(s.step).padStart(2, "0")}
                        </span>
                        <span
                          style={{
                            fontSize: "14px",
                            color: "#e0e0e8",
                            fontWeight: 600,
                            fontFamily: "inherit",
                          }}
                        >
                          {s.title}
                        </span>
                      </div>
                      {expandedStep === s.step && (
                        <p
                          style={{
                            color: "#888",
                            fontSize: "12px",
                            lineHeight: 1.7,
                            marginTop: "8px",
                            marginBottom: 0,
                          }}
                        >
                          {s.desc}
                        </p>
                      )}
                    </div>
                    <span style={{ color: "#333", fontSize: "14px" }}>
                      {expandedStep === s.step ? "−" : "+"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Tech stack recommendation */}
            <div
              style={{
                marginTop: "24px",
                background: "#0e0e18",
                border: "1px solid #1a1a2e",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#a78bfa",
                  letterSpacing: "2px",
                  marginBottom: "16px",
                }}
              >
                RECOMMENDED STACK FOR YOUR SETUP
              </div>
              <pre
                style={{
                  background: "#080810",
                  border: "1px solid #1a1a2e",
                  borderRadius: "8px",
                  padding: "16px",
                  fontSize: "12px",
                  lineHeight: 1.8,
                  color: "#c8c8d0",
                  overflow: "auto",
                  margin: 0,
                }}
              >{`// Your scraping toolkit (Node.js)
// ─────────────────────────────────

// Static scraping
npm install cheerio        // jQuery-like DOM parser
npm install node-fetch     // HTTP client (or use built-in fetch)

// Browser automation (when needed)
npm install puppeteer      // Chrome automation
// OR
npm install playwright     // Multi-browser (Chrome/FF/Safari)

// Data pipeline
npm install better-sqlite3 // Local DB (matches your local-first pattern)
npm install zod            // Schema validation for scraped data

// Scheduling
npm install node-cron      // Run scrapers on schedule

// AI enrichment (you already have this)
// Use Anthropic API to categorize/summarize scraped data

// Optional: Apify SDK (for cloud deployment later)
npm install apify          // Deploy scrapers to Apify platform`}</pre>
            </div>
          </div>
        )}

        {/* USE CASES TAB */}
        {activeTab === "usecases" && (
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "#666",
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              How scraping plugs into your existing projects.
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {USE_CASES.map((uc) => (
                <div
                  key={uc.app}
                  style={{
                    background: "#0e0e18",
                    border: "1px solid #1a1a2e",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "12px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{uc.icon}</span>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#e0e0e8",
                        fontFamily: "inherit",
                      }}
                    >
                      {uc.app}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {uc.idea}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUICK START TAB */}
        {activeTab === "quickstart" && (
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "#666",
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              Copy-paste this into Claude Code to start scraping immediately.
              Modify the URL and selectors for any site.
            </div>

            <div
              style={{
                background: "#0e0e18",
                border: "1px solid #1a1a2e",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#00ff88",
                  letterSpacing: "2px",
                  marginBottom: "12px",
                }}
              >
                UNIVERSAL SCRAPER TEMPLATE — scraper.mjs
              </div>
              <pre
                style={{
                  background: "#080810",
                  border: "1px solid #1a1a2e",
                  borderRadius: "8px",
                  padding: "16px",
                  fontSize: "11px",
                  lineHeight: 1.6,
                  color: "#c8c8d0",
                  overflow: "auto",
                  maxHeight: "500px",
                  margin: 0,
                }}
              >{`#!/usr/bin/env node
// Universal Site Scraper — works with any static HTML site
// Usage: node scraper.mjs <url> [selector]

import * as cheerio from 'cheerio';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

const url = process.argv[2] || 'https://news.ycombinator.com';
const selector = process.argv[3] || '.titleline > a';

async function scrape(targetUrl, cssSelector) {
  console.log(\`\\n⛏️  Scraping: \${targetUrl}\`);
  console.log(\`🔍 Selector: \${cssSelector}\\n\`);

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

  console.log(\`✅ Found \${results.length} items\\n\`);
  results.slice(0, 5).forEach((r, i) => {
    console.log(\`  \${i + 1}. \${r.text.slice(0, 60)}\`);
  });

  // Save results
  if (!existsSync('./scraped')) mkdirSync('./scraped');
  const filename = \`./scraped/\${new URL(targetUrl).hostname}_\${Date.now()}.json\`;
  writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(\`\\n💾 Saved to \${filename}\`);

  return results;
}

scrape(url, selector).catch(console.error);`}</pre>
            </div>

            <div
              style={{
                background: "#0e0e18",
                border: "1px solid #1a1a2e",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#ff6b35",
                  letterSpacing: "2px",
                  marginBottom: "12px",
                }}
              >
                DETECTIVE WORKFLOW — FIND THE RIGHT SELECTORS
              </div>
              <pre
                style={{
                  background: "#080810",
                  border: "1px solid #1a1a2e",
                  borderRadius: "8px",
                  padding: "16px",
                  fontSize: "11px",
                  lineHeight: 1.8,
                  color: "#c8c8d0",
                  overflow: "auto",
                  margin: 0,
                }}
              >{`Step 1: Open target site in browser
Step 2: Right-click on the data you want → Inspect
Step 3: Look at the element's tag, class, ID
Step 4: Build a CSS selector that targets it
Step 5: Test in browser console:
        document.querySelectorAll('YOUR_SELECTOR')
Step 6: If it returns the right elements, use that selector

Common selector patterns:
─────────────────────────
'.card'                     → elements with class "card"
'#main .item'               → .item inside #main
'a[href^="/tools"]'         → links starting with /tools
'h2 + p'                    → paragraph after h2
'[data-id]'                 → elements with data-id attribute
'table tr td:nth-child(2)'  → 2nd column of a table

Pro tips:
─────────
• If content loads after page load → it's JS-rendered
  → Use Puppeteer instead, or find the API
• If you see /api/ or /graphql in Network tab
  → Skip HTML scraping, call the API directly
• Always add User-Agent header
• Add delays between requests (1-2 sec)
• Respect robots.txt
• Cache responses during development`}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
