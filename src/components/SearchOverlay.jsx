import { useState, useMemo, useRef, useEffect } from "react";
import { APPROACHES } from "../data/approaches";
import { PIPELINE_STEPS } from "../data/pipeline";
import { USE_CASES } from "../data/useCases";
import { SELECTOR_PATTERNS } from "../data/selectorPatterns";
import { TEMPLATES } from "../data/templates";
import { SCRAPERS } from "../scrapers/index";

function buildSearchIndex() {
  const items = [];

  // Scrapers
  Object.entries(SCRAPERS).forEach(([id, entry]) => {
    items.push({ type: "Scraper", name: entry.name, desc: `Built-in ${entry.schedule} scraper`, tab: "dashboard", id });
  });

  // Tabs
  [
    { name: "Dashboard", desc: "Live feed, stats, source manager, alerts", tab: "dashboard" },
    { name: "Builder", desc: "Create custom scrapers and ingest files", tab: "builder" },
    { name: "Intelligence", desc: "AI-powered briefings, project synthesis, signal map", tab: "intelligence" },
    { name: "Approaches", desc: "Scraping methods: static, browser, API", tab: "approaches" },
    { name: "Pipeline", desc: "Build multi-step scraping pipelines", tab: "pipeline" },
    { name: "Projects", desc: "Track scraping projects with subtasks", tab: "usecases" },
    { name: "Sandbox", desc: "Code editor with templates", tab: "sandbox" },
    { name: "Settings", desc: "API keys, triggers, notifications, scraper config", tab: "settings" },
  ].forEach((t) => {
    items.push({ type: "Tab", name: t.name, desc: t.desc, tab: t.tab, id: t.tab });
  });

  // Settings shortcuts
  [
    { name: "API Keys", desc: "OpenAI and Anthropic API key management", tab: "settings" },
    { name: "Reddit Config", desc: "Subreddits, sort order, time range", tab: "settings" },
    { name: "X / Twitter Config", desc: "Usernames, search terms, RSS bridges", tab: "settings" },
    { name: "TAAFT Config", desc: "AI tool search and categories", tab: "settings" },
    { name: "Action Triggers", desc: "Keyword alerts, score thresholds, webhooks", tab: "settings" },
    { name: "Notifications", desc: "Browser notifications and webhook URLs", tab: "settings" },
  ].forEach((s) => {
    items.push({ type: "Setting", name: s.name, desc: s.desc, tab: s.tab, id: `setting-${s.name}` });
  });

  APPROACHES.forEach((a) => {
    items.push({ type: "Approach", name: a.title, desc: a.description, tab: "approaches", id: a.id });
  });

  PIPELINE_STEPS.forEach((s) => {
    items.push({ type: "Pipeline", name: `Step ${s.step}: ${s.title}`, desc: s.desc, tab: "pipeline", id: `step-${s.step}` });
  });

  USE_CASES.forEach((uc) => {
    items.push({ type: "Project", name: uc.app, desc: uc.idea, tab: "usecases", id: uc.app });
  });

  SELECTOR_PATTERNS.forEach((p) => {
    items.push({ type: "Selector", name: p.selector, desc: p.desc, tab: "sandbox", id: p.selector });
  });

  TEMPLATES.forEach((t) => {
    items.push({ type: "Template", name: t.name, desc: t.description, tab: "sandbox", id: t.id });
  });

  return items;
}

const SEARCH_INDEX = buildSearchIndex();

function scoreMatch(item, query) {
  const q = query.toLowerCase();
  const name = item.name.toLowerCase();
  const desc = item.desc.toLowerCase();

  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (desc.includes(q)) return 40;
  return 0;
}

const TYPE_COLORS = {
  Scraper: "#00ff88",
  Tab: "#00d4ff",
  Setting: "#ffaa00",
  Approach: "#00ff88",
  Pipeline: "#a78bfa",
  Project: "#ff6b35",
  Selector: "#00d4ff",
  Template: "#ffaa00",
};

export function SearchOverlay({ onClose, onNavigate }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return SEARCH_INDEX
      .map((item) => ({ ...item, score: scoreMatch(item, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [query]);

  const handleSelect = (item) => {
    onNavigate(item.tab);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1000,
        paddingTop: "15vh",
        padding: "15vh 24px 24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0e0e18",
          border: "1px solid #1a1a2e",
          borderRadius: "12px",
          maxWidth: "560px",
          width: "100%",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search"
      >
        {/* Search input */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a2e" }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scrapers, tabs, settings, templates..."
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && results.length > 0) handleSelect(results[0]);
            }}
            style={{
              width: "100%",
              padding: "8px 0",
              background: "none",
              border: "none",
              color: "#e0e0e8",
              fontSize: "14px",
              fontFamily: "'JetBrains Mono', monospace",
              outline: "none",
            }}
          />
        </div>

        {/* Results */}
        <div style={{ maxHeight: "400px", overflow: "auto" }}>
          {query.trim() && results.length === 0 && (
            <div style={{ padding: "16px", fontSize: "12px", color: "#666", textAlign: "center" }}>
              No results found.
            </div>
          )}
          {results.map((item, i) => (
            <div
              key={`${item.type}-${item.id}`}
              onClick={() => handleSelect(item)}
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                borderBottom: "1px solid #12121e",
                transition: "background 0.1s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#141428")}
              onMouseOut={(e) => (e.currentTarget.style.background = "none")}
              role="option"
              aria-selected={i === 0}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                <span style={{
                  fontSize: "9px",
                  color: TYPE_COLORS[item.type] || "#888",
                  background: (TYPE_COLORS[item.type] || "#888") + "15",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}>
                  {item.type}
                </span>
                <span style={{ fontSize: "13px", color: "#e0e0e8", fontFamily: "inherit" }}>
                  {item.name}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Hints */}
        {!query.trim() && (
          <div style={{ padding: "12px 16px", fontSize: "11px", color: "#555" }}>
            Type to search across all content. Press Enter to select, Escape to close.
          </div>
        )}
      </div>
    </div>
  );
}
