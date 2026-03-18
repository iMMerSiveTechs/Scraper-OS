import { useState, useEffect, useCallback } from "react";

// ─── Data ───────────────────────────────────────────────────────────

const APPROACHES = [
  {
    id: "static",
    title: "Static HTML",
    subtitle: "Cheerio / DOM Parsing",
    difficulty: "Beginner",
    speed: "Fast",
    coverage: "~40%",
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
    code: `import puppeteer from 'puppeteer';

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
    speed: "Fastest",
    coverage: "Varies",
    icon: "🔍",
    color: "#a78bfa",
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
    tools: ["Browser DevTools", "curl", "Postman"],
    output: "Target URLs + selectors or API endpoints",
  },
  {
    step: 2,
    title: "Extract",
    icon: "⛏️",
    desc: "Pull raw data using Cheerio, Puppeteer, or direct API calls. Handle pagination and rate limits.",
    tools: ["cheerio", "puppeteer", "playwright", "node-fetch"],
    output: "Raw JSON / HTML data",
  },
  {
    step: 3,
    title: "Normalize",
    icon: "🔧",
    desc: "Clean and transform into a consistent schema. Deduplicate. Parse dates, prices, categories.",
    tools: ["zod", "lodash", "date-fns"],
    output: "Validated, typed data objects",
  },
  {
    step: 4,
    title: "Enrich",
    icon: "🧠",
    desc: "Run through LLM for auto-categorization, summaries, tag extraction, sentiment analysis.",
    tools: ["Anthropic API", "OpenAI API"],
    output: "Enriched data with AI-generated fields",
  },
  {
    step: 5,
    title: "Store",
    icon: "💾",
    desc: "Push to SQLite/Postgres. Version the data. Track changes over time for monitoring.",
    tools: ["better-sqlite3", "pg", "drizzle-orm"],
    output: "Persistent, queryable database",
  },
  {
    step: 6,
    title: "Serve",
    icon: "📡",
    desc: "Expose via API or render in your app. Feed into search, recommendations, or display components.",
    tools: ["Express", "Next.js API routes", "tRPC"],
    output: "REST/GraphQL API or rendered UI",
  },
];

const USE_CASES = [
  {
    app: "Profile App",
    icon: "👤",
    color: "#00ff88",
    idea: "Showcase curated tools/services you use or recommend. Scrape tool metadata + logos to auto-populate your portfolio.",
    approach: "static",
    targets: ["GitHub repos", "Tool landing pages", "npm packages"],
  },
  {
    app: "Estimate OS",
    icon: "📊",
    color: "#ff6b35",
    idea: "Scrape competitor pricing from contractor sites. Monitor material costs from supplier pages. Auto-update price ranges.",
    approach: "api",
    targets: ["Contractor directories", "Supplier catalogs", "Pricing pages"],
  },
  {
    app: "VibeForge",
    icon: "🔨",
    color: "#a78bfa",
    idea: "Scrape component libraries, design systems, and template galleries. Feed into the generator as reference patterns.",
    approach: "browser",
    targets: ["Component galleries", "Design systems", "Template sites"],
  },
  {
    app: "Research",
    icon: "🔬",
    color: "#00d4ff",
    idea: "Track new AI tools, frameworks, and APIs. Build a personal knowledge base that's always current.",
    approach: "api",
    targets: ["Product Hunt", "GitHub trending", "HN front page"],
  },
  {
    app: "Aromatic Codex",
    icon: "🌿",
    color: "#88cc44",
    idea: "Scrape terpene databases, essential oil research papers, supplier catalogs. Auto-update your knowledge engine.",
    approach: "static",
    targets: ["PubChem", "Supplier sites", "Research databases"],
  },
  {
    app: "ChurnWise",
    icon: "💸",
    color: "#ffaa00",
    idea: "Scrape subscription service pricing pages. Monitor price changes. Feed cancellation policy data.",
    approach: "browser",
    targets: ["SaaS pricing pages", "App store listings", "Review sites"],
  },
];

const DEFAULT_SANDBOX_CODE = `#!/usr/bin/env node
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

scrape(url, selector).catch(console.error);`;

const SELECTOR_PATTERNS = [
  { selector: ".card", desc: "Elements with class 'card'" },
  { selector: "#main .item", desc: ".item inside #main" },
  { selector: 'a[href^="/tools"]', desc: "Links starting with /tools" },
  { selector: "h2 + p", desc: "Paragraph immediately after h2" },
  { selector: "[data-id]", desc: "Elements with data-id attribute" },
  { selector: "table tr td:nth-child(2)", desc: "2nd column of a table" },
  { selector: "ul > li:first-child", desc: "First list item in each list" },
  { selector: 'img[src$=".png"]', desc: "PNG images" },
];

// ─── Helpers ────────────────────────────────────────────────────────

function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

// ─── Subcomponents ──────────────────────────────────────────────────

function CopyButton({ text, label = "Copy", style: extraStyle = {} }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: "5px 12px",
        background: copied ? "#00ff8822" : "#1a1a2e",
        border: `1px solid ${copied ? "#00ff8844" : "#2a2a3e"}`,
        borderRadius: "6px",
        color: copied ? "#00ff88" : "#888",
        cursor: "pointer",
        fontSize: "11px",
        fontFamily: "inherit",
        transition: "all 0.2s",
        ...extraStyle,
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function DownloadButton({ text, filename, style: extraStyle = {} }) {
  const handleDownload = useCallback(() => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [text, filename]);

  return (
    <button
      onClick={handleDownload}
      style={{
        padding: "5px 12px",
        background: "#1a1a2e",
        border: "1px solid #2a2a3e",
        borderRadius: "6px",
        color: "#888",
        cursor: "pointer",
        fontSize: "11px",
        fontFamily: "inherit",
        transition: "all 0.2s",
        ...extraStyle,
      }}
    >
      Download
    </button>
  );
}

function CodeBlock({
  code,
  filename,
  label,
  color = "#00ff88",
  maxHeight = "400px",
  showDownload = false,
}) {
  return (
    <div
      style={{
        background: "#0e0e18",
        border: "1px solid #1a1a2e",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: "1px solid #1a1a2e",
          background: "#0c0c14",
        }}
      >
        <span style={{ fontSize: "11px", color, letterSpacing: "2px" }}>
          {label}
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <CopyButton text={code} />
          {showDownload && filename && (
            <DownloadButton text={code} filename={filename} />
          )}
        </div>
      </div>
      <pre
        style={{
          background: "#080810",
          padding: "16px",
          fontSize: "12px",
          lineHeight: 1.6,
          color: "#c8c8d0",
          overflow: "auto",
          maxHeight,
          margin: 0,
        }}
      >
        {code}
      </pre>
    </div>
  );
}

function StatusBadge({ status, onClick }) {
  const colors = {
    "Not Started": { bg: "#1a1a2e", border: "#2a2a3e", text: "#666" },
    "In Progress": { bg: "#ff6b3522", border: "#ff6b3544", text: "#ff6b35" },
    Done: { bg: "#00ff8822", border: "#00ff8844", text: "#00ff88" },
  };
  const c = colors[status] || colors["Not Started"];

  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: "12px",
        color: c.text,
        cursor: "pointer",
        fontSize: "10px",
        fontFamily: "inherit",
        letterSpacing: "1px",
        textTransform: "uppercase",
        transition: "all 0.2s",
      }}
    >
      {status}
    </button>
  );
}

function ProgressBar({ items }) {
  const done = items.filter((s) => s === "Done").length;
  const inProgress = items.filter((s) => s === "In Progress").length;
  const total = items.length;
  const pct = total > 0 ? Math.round(((done + inProgress * 0.5) / total) * 100) : 0;

  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
          fontSize: "11px",
        }}
      >
        <span style={{ color: "#666" }}>
          {done}/{total} complete
          {inProgress > 0 && ` · ${inProgress} in progress`}
        </span>
        <span style={{ color: "#00ff88" }}>{pct}%</span>
      </div>
      <div
        style={{
          height: "4px",
          background: "#1a1a2e",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, #00ff88, #00cc66)",
            borderRadius: "2px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ScrapingPlaybook() {
  const [activeTab, setActiveTab] = useState("approaches");
  const [selectedApproach, setSelectedApproach] = useState(0);
  const [showRealWorld, setShowRealWorld] = useState(false);
  const [expandedStep, setExpandedStep] = useState(null);
  const [compareMode, setCompareMode] = useState(false);

  // Persistent state
  const [sandboxCode, setSandboxCode] = useLocalStorage(
    "scraper-os-sandbox",
    DEFAULT_SANDBOX_CODE
  );
  const [projectStatuses, setProjectStatuses] = useLocalStorage(
    "scraper-os-statuses",
    {}
  );
  const [projectNotes, setProjectNotes] = useLocalStorage(
    "scraper-os-notes",
    {}
  );
  const [expandedProject, setExpandedProject] = useState(null);

  // Pipeline config
  const [pipelineConfig, setPipelineConfig] = useLocalStorage(
    "scraper-os-pipeline",
    { steps: {}, schedule: "daily" }
  );

  const approach = APPROACHES[selectedApproach];

  const cycleStatus = (app) => {
    const order = ["Not Started", "In Progress", "Done"];
    const current = projectStatuses[app] || "Not Started";
    const next = order[(order.indexOf(current) + 1) % order.length];
    setProjectStatuses({ ...projectStatuses, [app]: next });
  };

  const updateNote = (app, note) => {
    setProjectNotes({ ...projectNotes, [app]: note });
  };

  const togglePipelineTool = (step, tool) => {
    const current = pipelineConfig.steps[step] || [];
    const updated = current.includes(tool)
      ? current.filter((t) => t !== tool)
      : [...current, tool];
    setPipelineConfig({
      ...pipelineConfig,
      steps: { ...pipelineConfig.steps, [step]: updated },
    });
  };

  const generatePipelineJSON = () => {
    const config = {
      name: "my-scraper-pipeline",
      schedule: pipelineConfig.schedule,
      steps: PIPELINE_STEPS.map((s) => ({
        name: s.title.toLowerCase(),
        tools: pipelineConfig.steps[s.step] || [],
        output: s.output,
      })),
    };
    return JSON.stringify(config, null, 2);
  };

  const TABS = [
    { id: "approaches", label: "Approaches" },
    { id: "pipeline", label: "Pipeline" },
    { id: "usecases", label: "Projects" },
    { id: "sandbox", label: "Sandbox" },
  ];

  return (
    <div
      style={{
        background: "#0a0a0f",
        color: "#e0e0e8",
        minHeight: "100vh",
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      }}
    >
      {/* ── Header ── */}
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
          Scraper OS
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
          Learn approaches · Build pipelines · Track projects · Export code
        </p>
      </div>

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "0",
          borderBottom: "1px solid #1a1a2e",
          padding: "0 24px",
          background: "#0c0c14",
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => (
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
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
        {/* ════════════════ APPROACHES TAB ════════════════ */}
        {activeTab === "approaches" && (
          <div>
            {/* Compare toggle */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <span style={{ fontSize: "12px", color: "#666" }}>
                {compareMode
                  ? "Side-by-side comparison"
                  : "Select an approach to explore"}
              </span>
              <button
                onClick={() => setCompareMode(!compareMode)}
                style={{
                  padding: "6px 14px",
                  background: compareMode ? "#00ff8822" : "#1a1a2e",
                  border: `1px solid ${compareMode ? "#00ff8844" : "#2a2a3e"}`,
                  borderRadius: "6px",
                  color: compareMode ? "#00ff88" : "#888",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
              >
                {compareMode ? "Detail View" : "Compare All"}
              </button>
            </div>

            {compareMode ? (
              /* ── Comparison Table ── */
              <div
                style={{
                  background: "#0e0e18",
                  border: "1px solid #1a1a2e",
                  borderRadius: "12px",
                  overflow: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "12px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid #1a1a2e",
                        background: "#0c0c14",
                      }}
                    >
                      {["", "Speed", "Coverage", "Difficulty", "Best For"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "12px 16px",
                              textAlign: "left",
                              color: "#555",
                              fontWeight: 500,
                              fontSize: "11px",
                              letterSpacing: "1px",
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {APPROACHES.map((a) => (
                      <tr
                        key={a.id}
                        style={{ borderBottom: "1px solid #1a1a2e" }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <span style={{ fontSize: "18px" }}>{a.icon}</span>
                            <div>
                              <div
                                style={{ color: a.color, fontWeight: 600 }}
                              >
                                {a.title}
                              </div>
                              <div style={{ color: "#555", fontSize: "10px" }}>
                                {a.subtitle}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#aaa" }}>
                          {a.speed}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#aaa" }}>
                          {a.coverage}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#aaa" }}>
                          {a.difficulty}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#888" }}>
                          {a.bestFor.slice(0, 2).join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                {/* ── Approach Selector Cards ── */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "24px",
                    flexWrap: "wrap",
                  }}
                >
                  {APPROACHES.map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelectedApproach(i);
                        setShowRealWorld(false);
                      }}
                      style={{
                        flex: "1 1 140px",
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

                {/* ── Approach Detail ── */}
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
                      flexWrap: "wrap",
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
                        BEST FOR
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
                          + {item}
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
                        FAILS ON
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
                          - {item}
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
                      <div style={{ display: "flex", gap: "6px" }}>
                        <CopyButton
                          text={
                            showRealWorld ? approach.realWorld : approach.code
                          }
                        />
                        <DownloadButton
                          text={
                            showRealWorld ? approach.realWorld : approach.code
                          }
                          filename={`${approach.id}-example.mjs`}
                        />
                        <button
                          onClick={() => setShowRealWorld(!showRealWorld)}
                          style={{
                            padding: "5px 12px",
                            background: "#1a1a2e",
                            border: "1px solid #2a2a3e",
                            borderRadius: "6px",
                            color: "#888",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontFamily: "inherit",
                          }}
                        >
                          {showRealWorld ? "Basic" : "Real-World"}
                        </button>
                      </div>
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
              </>
            )}
          </div>
        )}

        {/* ════════════════ PIPELINE TAB ════════════════ */}
        {activeTab === "pipeline" && (
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "#666",
                marginBottom: "20px",
                lineHeight: 1.6,
              }}
            >
              Configure your pipeline. Select tools for each step, then export
              the config.
            </div>

            {/* Schedule selector */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "#666" }}>Schedule:</span>
              {["hourly", "daily", "weekly", "manual"].map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setPipelineConfig({ ...pipelineConfig, schedule: s })
                  }
                  style={{
                    padding: "4px 12px",
                    background:
                      pipelineConfig.schedule === s ? "#00ff8822" : "#1a1a2e",
                    border: `1px solid ${pipelineConfig.schedule === s ? "#00ff8844" : "#2a2a3e"}`,
                    borderRadius: "6px",
                    color:
                      pipelineConfig.schedule === s ? "#00ff88" : "#888",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontFamily: "inherit",
                    textTransform: "capitalize",
                    transition: "all 0.2s",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Steps */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {PIPELINE_STEPS.map((s) => {
                const isExpanded = expandedStep === s.step;
                const selectedTools = pipelineConfig.steps[s.step] || [];

                return (
                  <div
                    key={s.step}
                    style={{
                      background: isExpanded ? "#141428" : "#0e0e18",
                      border: `1px solid ${isExpanded ? "#00ff8844" : "#1a1a2e"}`,
                      borderRadius: "10px",
                      overflow: "hidden",
                      transition: "all 0.2s",
                    }}
                  >
                    <button
                      onClick={() =>
                        setExpandedStep(isExpanded ? null : s.step)
                      }
                      style={{
                        width: "100%",
                        padding: "16px 20px",
                        cursor: "pointer",
                        textAlign: "left",
                        background: "none",
                        border: "none",
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
                            {selectedTools.length > 0 && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  color: "#00ff88",
                                  background: "#00ff8815",
                                  padding: "2px 8px",
                                  borderRadius: "8px",
                                }}
                              >
                                {selectedTools.length} selected
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ color: "#333", fontSize: "14px" }}>
                          {isExpanded ? "−" : "+"}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        style={{
                          padding: "0 20px 16px",
                          borderTop: "1px solid #1a1a2e",
                        }}
                      >
                        <p
                          style={{
                            color: "#888",
                            fontSize: "12px",
                            lineHeight: 1.7,
                            margin: "12px 0",
                          }}
                        >
                          {s.desc}
                        </p>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#555",
                            letterSpacing: "1px",
                            marginBottom: "8px",
                          }}
                        >
                          SELECT TOOLS:
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                          }}
                        >
                          {s.tools.map((tool) => {
                            const isSelected = selectedTools.includes(tool);
                            return (
                              <button
                                key={tool}
                                onClick={() =>
                                  togglePipelineTool(s.step, tool)
                                }
                                style={{
                                  padding: "5px 12px",
                                  background: isSelected
                                    ? "#00ff8822"
                                    : "#0a0a0f",
                                  border: `1px solid ${isSelected ? "#00ff8844" : "#2a2a3e"}`,
                                  borderRadius: "6px",
                                  color: isSelected ? "#00ff88" : "#888",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                  fontFamily: "inherit",
                                  transition: "all 0.2s",
                                }}
                              >
                                {isSelected ? "+" : ""} {tool}
                              </button>
                            );
                          })}
                        </div>
                        <div
                          style={{
                            marginTop: "10px",
                            fontSize: "11px",
                            color: "#555",
                          }}
                        >
                          Output: {s.output}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Generated config */}
            <div style={{ marginTop: "20px" }}>
              <CodeBlock
                code={generatePipelineJSON()}
                label="GENERATED PIPELINE CONFIG"
                color="#a78bfa"
                filename="pipeline-config.json"
                showDownload
                maxHeight="300px"
              />
            </div>
          </div>
        )}

        {/* ════════════════ PROJECTS TAB ════════════════ */}
        {activeTab === "usecases" && (
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "#666",
                marginBottom: "16px",
                lineHeight: 1.6,
              }}
            >
              Track scraping progress across your projects. Click status to
              cycle it. Expand for notes.
            </div>

            <ProgressBar
              items={USE_CASES.map(
                (uc) => projectStatuses[uc.app] || "Not Started"
              )}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {USE_CASES.map((uc) => {
                const status = projectStatuses[uc.app] || "Not Started";
                const isExpanded = expandedProject === uc.app;
                const note = projectNotes[uc.app] || "";
                const approachData = APPROACHES.find(
                  (a) => a.id === uc.approach
                );

                return (
                  <div
                    key={uc.app}
                    style={{
                      background: "#0e0e18",
                      border: `1px solid ${isExpanded ? uc.color + "44" : "#1a1a2e"}`,
                      borderRadius: "12px",
                      overflow: "hidden",
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "16px 20px",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setExpandedProject(isExpanded ? null : uc.app)
                      }
                    >
                      <span style={{ fontSize: "22px", flexShrink: 0 }}>
                        {uc.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
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
                          {approachData && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: approachData.color,
                                background: approachData.color + "15",
                                padding: "2px 8px",
                                borderRadius: "8px",
                              }}
                            >
                              {approachData.title}
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#888",
                            lineHeight: 1.5,
                            margin: "4px 0 0",
                          }}
                        >
                          {uc.idea}
                        </p>
                      </div>
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ flexShrink: 0 }}
                      >
                        <StatusBadge
                          status={status}
                          onClick={() => cycleStatus(uc.app)}
                        />
                      </div>
                      <span
                        style={{
                          color: "#333",
                          fontSize: "14px",
                          flexShrink: 0,
                        }}
                      >
                        {isExpanded ? "−" : "+"}
                      </span>
                    </div>

                    {isExpanded && (
                      <div
                        style={{
                          padding: "0 20px 16px",
                          borderTop: "1px solid #1a1a2e",
                        }}
                      >
                        {/* Targets */}
                        <div style={{ marginTop: "12px" }}>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#555",
                              letterSpacing: "1px",
                              marginBottom: "6px",
                            }}
                          >
                            SCRAPING TARGETS
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            {uc.targets.map((t) => (
                              <span
                                key={t}
                                style={{
                                  padding: "4px 10px",
                                  background: "#0a0a0f",
                                  border: "1px solid #2a2a3e",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  color: "#888",
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Notes */}
                        <div style={{ marginTop: "12px" }}>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#555",
                              letterSpacing: "1px",
                              marginBottom: "6px",
                            }}
                          >
                            NOTES
                          </div>
                          <textarea
                            value={note}
                            onChange={(e) => updateNote(uc.app, e.target.value)}
                            placeholder="Add notes about this project's scraping needs..."
                            style={{
                              width: "100%",
                              minHeight: "80px",
                              padding: "10px 12px",
                              background: "#080810",
                              border: "1px solid #2a2a3e",
                              borderRadius: "8px",
                              color: "#c8c8d0",
                              fontSize: "12px",
                              fontFamily: "inherit",
                              lineHeight: 1.6,
                              resize: "vertical",
                              outline: "none",
                            }}
                            onFocus={(e) =>
                              (e.target.style.borderColor = "#00ff8844")
                            }
                            onBlur={(e) =>
                              (e.target.style.borderColor = "#2a2a3e")
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════ SANDBOX TAB ════════════════ */}
        {activeTab === "sandbox" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", color: "#666" }}>
                  Edit the scraper template below. Changes auto-save.
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <CopyButton text={sandboxCode} label="Copy" />
                <DownloadButton text={sandboxCode} filename="scraper.mjs" />
                <button
                  onClick={() => setSandboxCode(DEFAULT_SANDBOX_CODE)}
                  style={{
                    padding: "5px 12px",
                    background: "#1a1a2e",
                    border: "1px solid #2a2a3e",
                    borderRadius: "6px",
                    color: "#888",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontFamily: "inherit",
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Editor */}
            <div
              style={{
                background: "#0e0e18",
                border: "1px solid #1a1a2e",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderBottom: "1px solid #1a1a2e",
                  background: "#0c0c14",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#ff5f56",
                  }}
                />
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#ffbd2e",
                  }}
                />
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#27c93f",
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    marginLeft: "8px",
                  }}
                >
                  scraper.mjs
                </span>
              </div>
              <textarea
                value={sandboxCode}
                onChange={(e) => setSandboxCode(e.target.value)}
                spellCheck={false}
                style={{
                  width: "100%",
                  minHeight: "450px",
                  padding: "16px",
                  background: "#080810",
                  border: "none",
                  color: "#c8c8d0",
                  fontSize: "12px",
                  fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
                  lineHeight: 1.6,
                  resize: "vertical",
                  outline: "none",
                  tabSize: 2,
                }}
              />
            </div>

            {/* Selector Reference */}
            <div
              style={{
                background: "#0e0e18",
                border: "1px solid #1a1a2e",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #1a1a2e",
                  background: "#0c0c14",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#ff6b35",
                    letterSpacing: "2px",
                  }}
                >
                  CSS SELECTOR CHEATSHEET
                </span>
              </div>
              <div style={{ padding: "12px 16px" }}>
                {SELECTOR_PATTERNS.map((p) => (
                  <div
                    key={p.selector}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "6px 0",
                      borderBottom: "1px solid #12121e",
                      fontSize: "12px",
                    }}
                  >
                    <code
                      style={{
                        color: "#00ff88",
                        background: "#00ff8810",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        minWidth: "220px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        navigator.clipboard.writeText(p.selector)
                      }
                      title="Click to copy"
                    >
                      {p.selector}
                    </code>
                    <span style={{ color: "#888" }}>{p.desc}</span>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px 12px",
                    background: "#0a0a0f",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: "#666",
                    lineHeight: 1.7,
                  }}
                >
                  <strong style={{ color: "#888" }}>Tips:</strong> Click any
                  selector to copy. Test selectors in browser console with{" "}
                  <code style={{ color: "#a78bfa" }}>
                    document.querySelectorAll('selector')
                  </code>
                  . If content loads after page load, check Network tab for API
                  calls first.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
