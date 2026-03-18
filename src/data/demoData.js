// Demo/mock data for Dashboard when Firebase isn't configured

const now = new Date();
const ago = (minutes) => new Date(now.getTime() - minutes * 60 * 1000);

export const demoResults = [
  {
    id: "hn-001",
    source: "hn",
    title: "Show HN: I built an open-source web scraper that handles JS-heavy sites",
    url: "https://news.ycombinator.com/item?id=39012345",
    scrapedAt: ago(12),
    tags: ["showhn", "scraping", "open-source"],
  },
  {
    id: "gh-001",
    source: "github",
    title: "Trending: rust-analyzer v2024.3 - A Rust compiler frontend for IDEs",
    url: "https://github.com/rust-lang/rust-analyzer",
    scrapedAt: ago(18),
    tags: ["rust", "ide", "compiler"],
  },
  {
    id: "ph-001",
    source: "producthunt",
    title: "AI-Powered Code Review Tool - Ship cleaner code 10x faster",
    url: "https://www.producthunt.com/posts/ai-code-review",
    scrapedAt: ago(25),
    tags: ["ai", "developer-tools", "code-review"],
  },
  {
    id: "hn-002",
    source: "hn",
    title: "Ask HN: What are you using for web scraping in 2024?",
    url: "https://news.ycombinator.com/item?id=39012400",
    scrapedAt: ago(35),
    tags: ["askhn", "scraping"],
  },
  {
    id: "gh-002",
    source: "github",
    title: "Trending: llama.cpp - Port of Facebook's LLaMA model in C/C++",
    url: "https://github.com/ggerganov/llama.cpp",
    scrapedAt: ago(42),
    tags: ["ai", "llm", "cpp"],
  },
  {
    id: "ph-002",
    source: "producthunt",
    title: "DataPipe - Connect any API to your database in minutes",
    url: "https://www.producthunt.com/posts/datapipe",
    scrapedAt: ago(55),
    tags: ["data", "api", "integration"],
  },
  {
    id: "hn-003",
    source: "hn",
    title: "SQLite is not a toy database (2023)",
    url: "https://news.ycombinator.com/item?id=39013001",
    scrapedAt: ago(68),
    tags: ["database", "sqlite"],
  },
  {
    id: "gh-003",
    source: "github",
    title: "Trending: deno v1.41 - A modern runtime for JavaScript and TypeScript",
    url: "https://github.com/denoland/deno",
    scrapedAt: ago(80),
    tags: ["javascript", "typescript", "runtime"],
  },
  {
    id: "hn-004",
    source: "hn",
    title: "The architecture behind a one-person SaaS making $100k/month",
    url: "https://news.ycombinator.com/item?id=39013500",
    scrapedAt: ago(95),
    tags: ["saas", "architecture", "indie"],
  },
  {
    id: "ph-003",
    source: "producthunt",
    title: "ScreenStudio 2.0 - Beautiful screen recordings in minutes",
    url: "https://www.producthunt.com/posts/screenstudio-2",
    scrapedAt: ago(110),
    tags: ["video", "productivity", "macos"],
  },
  {
    id: "gh-004",
    source: "github",
    title: "Trending: zed-editor - High-performance multiplayer code editor",
    url: "https://github.com/zed-industries/zed",
    scrapedAt: ago(125),
    tags: ["editor", "rust", "collaboration"],
  },
  {
    id: "hn-005",
    source: "hn",
    title: "Why we switched from Puppeteer to Playwright for browser automation",
    url: "https://news.ycombinator.com/item?id=39014200",
    scrapedAt: ago(140),
    tags: ["playwright", "puppeteer", "automation"],
  },
  {
    id: "gh-005",
    source: "github",
    title: "Trending: ollama - Get up and running with Llama 2 and other LLMs locally",
    url: "https://github.com/ollama/ollama",
    scrapedAt: ago(160),
    tags: ["ai", "llm", "local"],
  },
  {
    id: "ph-004",
    source: "producthunt",
    title: "Raycast Pro - Your shortcut to everything on Mac",
    url: "https://www.producthunt.com/posts/raycast-pro",
    scrapedAt: ago(180),
    tags: ["productivity", "macos", "launcher"],
  },
  {
    id: "hn-006",
    source: "hn",
    title: "Reverse engineering TikTok's recommendation algorithm",
    url: "https://news.ycombinator.com/item?id=39015000",
    scrapedAt: ago(200),
    tags: ["reverse-engineering", "algorithms"],
  },
  {
    id: "gh-006",
    source: "github",
    title: "Trending: bun v1.0.30 - Incredibly fast JavaScript runtime",
    url: "https://github.com/oven-sh/bun",
    scrapedAt: ago(220),
    tags: ["javascript", "runtime", "performance"],
  },
  {
    id: "ph-005",
    source: "producthunt",
    title: "Cursor AI - The AI-first code editor for fast development",
    url: "https://www.producthunt.com/posts/cursor-ai",
    scrapedAt: ago(250),
    tags: ["ai", "editor", "developer-tools"],
  },
  {
    id: "hn-007",
    source: "hn",
    title: "Writing a web crawler from scratch in Go",
    url: "https://news.ycombinator.com/item?id=39016000",
    scrapedAt: ago(300),
    tags: ["go", "crawler", "tutorial"],
  },
];

export const demoRuns = [
  {
    id: "run-001",
    scraperName: "HN Front Page",
    status: "running",
    startedAt: ago(2),
    itemCount: 12,
    duration: null,
  },
  {
    id: "run-002",
    scraperName: "GitHub Trending",
    status: "success",
    startedAt: ago(30),
    itemCount: 25,
    duration: 14200,
  },
  {
    id: "run-003",
    scraperName: "Product Hunt Daily",
    status: "success",
    startedAt: ago(65),
    itemCount: 18,
    duration: 8500,
  },
  {
    id: "run-004",
    scraperName: "HN Front Page",
    status: "success",
    startedAt: ago(120),
    itemCount: 30,
    duration: 11300,
  },
  {
    id: "run-005",
    scraperName: "GitHub Trending",
    status: "failed",
    startedAt: ago(180),
    itemCount: 0,
    duration: 3200,
  },
  {
    id: "run-006",
    scraperName: "Product Hunt Daily",
    status: "success",
    startedAt: ago(300),
    itemCount: 15,
    duration: 7800,
  },
];

export const demoAlerts = [
  {
    id: "alert-001",
    type: "error",
    message: "GitHub Trending scraper failed: rate limit exceeded (403)",
    timestamp: ago(180),
    read: false,
  },
  {
    id: "alert-002",
    type: "warning",
    message: "HN scraper returned fewer items than expected (12 vs 30)",
    timestamp: ago(45),
    read: false,
  },
  {
    id: "alert-003",
    type: "info",
    message: "Product Hunt Daily scraper completed successfully with 18 items",
    timestamp: ago(65),
    read: false,
  },
];

export const demoStats = {
  totalRuns: 142,
  successRate: 94.3,
  totalItems: 3847,
  activeScrapers: 3,
};

// Aliases expected by ScraperContext
export const DEMO_RESULTS = demoResults;
export const DEMO_RUNS = demoRuns;
export const DEMO_ALERTS = demoAlerts;
export const DEMO_STATS = demoStats;
