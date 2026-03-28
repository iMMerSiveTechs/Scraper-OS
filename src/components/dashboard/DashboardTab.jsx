import { useState, useMemo } from "react";
import { StatCard } from "./StatCard";
import { FeedItem } from "./FeedItem";
import { RunStatus } from "./RunStatus";

const SOURCE_LABELS = {
  hn: "HN",
  github: "GitHub",
  producthunt: "ProductHunt",
  reddit: "Reddit",
  x: "X",
  taaft: "TAAFT",
  file: "Files",
};

const ALERT_COLORS = {
  error: { color: "#ff4444", bg: "#ff444418", border: "#ff444433" },
  warning: { color: "#f0c040", bg: "#f0c04018", border: "#f0c04033" },
  info: { color: "#00ff88", bg: "#00ff8818", border: "#00ff8833" },
};

const SOURCE_COLORS = {
  hn: "#ff6b35",
  github: "#a78bfa",
  producthunt: "#00ff88",
  reddit: "#ff4500",
  x: "#1da1f2",
  taaft: "#6366f1",
  file: "#ffaa00",
  custom: "#00d4ff",
};

export function DashboardTab({
  runs = [],
  results = [],
  alerts = [],
  stats = { totalRuns: 0, successRate: 0, totalItems: 0, activeScrapers: 0 },
  onRefresh,
  onDismissAlert,
  onRunScraper,
  isDemo = false,
  customScrapers = [],
  hasAIKey = false,
  onNavigate,
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [runningScraper, setRunningScraper] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [onboarded, setOnboarded] = useState(() => {
    try { return localStorage.getItem("scraper-os-onboarded") === "1"; } catch { return false; }
  });

  // Build dynamic filter list based on sources present in results
  const dynamicFilters = useMemo(() => {
    const sources = new Set(results.map((r) => r.source));
    const base = [{ id: "all", label: "All" }];
    // Add known sources present in results
    for (const src of sources) {
      if (SOURCE_LABELS[src]) {
        base.push({ id: src, label: SOURCE_LABELS[src] });
      }
    }
    // Add custom scraper sources
    for (const s of customScrapers) {
      if ((sources.has(s.id) || sources.has(s.name)) && !base.some((b) => b.id === s.id)) {
        base.push({ id: s.id, label: s.name.slice(0, 12) });
      }
    }
    // Add any unknown sources
    for (const src of sources) {
      if (!base.some((b) => b.id === src)) {
        base.push({ id: src, label: src.slice(0, 12) });
      }
    }
    return base;
  }, [results, customScrapers]);

  const filteredResults = useMemo(() => {
    if (activeFilter === "all") return results;
    return results.filter((r) => r.source === activeFilter);
  }, [results, activeFilter]);

  const unreadAlerts = alerts.filter((a) => !a.read);

  // Build sparkline data from results
  const sparklineData = useMemo(() => {
    const hourMap = {};
    for (const r of results) {
      if (r.scrapedAt) {
        const hour = r.scrapedAt.slice(0, 13);
        hourMap[hour] = (hourMap[hour] || 0) + 1;
      }
    }
    return Object.entries(hourMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([, count]) => count);
  }, [results]);

  // Cross-source detection
  const crossSourceItems = useMemo(() => {
    const titleSources = {};
    for (const r of results) {
      const norm = (r.title || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      if (norm.length < 8) continue;
      if (!titleSources[norm]) titleSources[norm] = { sources: new Set(), title: r.title, url: r.url };
      titleSources[norm].sources.add(r.source);
    }
    return Object.values(titleSources)
      .filter((t) => t.sources.size >= 2)
      .map((t) => ({ ...t, sources: Array.from(t.sources) }))
      .slice(0, 5);
  }, [results]);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRunSingle = async (scraperId) => {
    if (!onRunScraper || runningScraper) return;
    setRunningScraper(scraperId);
    setRunResult(null);
    try {
      await onRunScraper(scraperId);
      setRunResult({ id: scraperId, ok: true });
    } catch (err) {
      setRunResult({ id: scraperId, ok: false, error: err.message });
    }
    setRunningScraper(null);
    setTimeout(() => setRunResult(null), 3000);
  };

  const dismissOnboarding = () => {
    setOnboarded(true);
    try { localStorage.setItem("scraper-os-onboarded", "1"); } catch { /* */ }
  };

  // Onboarding step checks
  const hasResults = results.length > 0 && results.some((r) => !r.id?.startsWith("hn-0") && !r.id?.startsWith("gh-0") && !r.id?.startsWith("ph-0") && !r.id?.startsWith("rd-0") && !r.id?.startsWith("x-0") && !r.id?.startsWith("taaft-0") && !r.id?.startsWith("file-0"));

  return (
    <div aria-label="Dashboard" role="region">
      {/* Getting Started */}
      {!onboarded && (
        <div style={{
          background: "#0e0e18", border: "1px solid #00ff8833", borderRadius: "12px",
          overflow: "hidden", marginBottom: "20px",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid #1a1a2e", background: "#0c0c14",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: "10px", color: "#00ff88", letterSpacing: "2px" }}>GETTING STARTED</span>
            <button onClick={dismissOnboarding} style={{
              background: "none", border: "none", color: "#555", cursor: "pointer",
              fontSize: "12px", fontFamily: "inherit",
            }}>dismiss</button>
          </div>
          <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              { done: hasResults, label: "Run your first scrape", desc: 'Click "run" on any scraper in Source Manager below', action: null },
              { done: hasAIKey, label: "Unlock AI Intelligence", desc: "Add an OpenAI or Anthropic API key", action: () => onNavigate?.("settings") },
              { done: customScrapers.length > 0, label: "Build a custom scraper", desc: "Create scrapers with CSS selectors, JSON paths, or RSS", action: () => onNavigate?.("builder") },
              { done: false, label: "Ingest local files", desc: "Drag files into Builder tab or scan a directory", action: () => onNavigate?.("builder") },
            ].map((step, i) => (
              <div key={i} style={{
                display: "flex", gap: "10px", padding: "10px 12px",
                background: "#0a0a0f", borderRadius: "8px", cursor: step.action ? "pointer" : "default",
              }} onClick={step.action}>
                <span style={{
                  width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: step.done ? "#00ff8822" : "#1a1a2e",
                  border: `1px solid ${step.done ? "#00ff8844" : "#2a2a3e"}`,
                  color: step.done ? "#00ff88" : "#555",
                  fontSize: "10px",
                }}>
                  {step.done ? "\u2713" : i + 1}
                </span>
                <div>
                  <div style={{ fontSize: "12px", color: step.done ? "#00ff88" : "#e0e0e8", fontWeight: 500 }}>{step.label}</div>
                  <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demo badge */}
      {isDemo && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            background: "#a78bfa18",
            border: "1px solid #a78bfa33",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "11px",
            color: "#a78bfa",
            letterSpacing: "0.5px",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "13px" }}>&#9670;</span>
          Demo Mode &mdash; showing sample data
        </div>
      )}

      {/* Section 1: Stats Bar */}
      <div
        aria-label="Scraper statistics"
        role="group"
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <StatCard
          label="Total Runs"
          value={stats.totalRuns}
          color="#00ff88"
          icon="&#9654;"
        />
        <StatCard
          label="Success Rate"
          value={`${stats.successRate}%`}
          color="#00ff88"
          icon="&#10003;"
        />
        <StatCard
          label="Items Scraped"
          value={stats.totalItems.toLocaleString()}
          color="#a78bfa"
          icon="&#9744;"
        />
        <StatCard
          label="Active Scrapers"
          value={stats.activeScrapers + customScrapers.filter((s) => s.enabled).length}
          color="#ff6b35"
          icon="&#9881;"
        />
      </div>

      {/* Section 1.5: Source Manager + Intelligence Card */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        {/* Source Manager */}
        <div style={{
          flex: "2 1 300px", background: "#0e0e18", border: "1px solid #1a1a2e",
          borderRadius: "12px", overflow: "hidden",
        }}>
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid #1a1a2e", background: "#0c0c14",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: "10px", color: "#888", letterSpacing: "2px" }}>SOURCE MANAGER</span>
            <button onClick={handleRefresh} disabled={refreshing} style={{
              padding: "3px 10px", background: "#1a1a2e", border: "1px solid #2a2a3e",
              borderRadius: "6px", color: refreshing ? "#666" : "#00ff88",
              cursor: refreshing ? "not-allowed" : "pointer", fontSize: "10px", fontFamily: "inherit",
            }}>
              {refreshing ? "..." : "Run All"}
            </button>
          </div>
          <div style={{ padding: "12px 16px" }}>
            {/* Built-in scrapers */}
            {[
              { id: "hn", name: "Hacker News", color: "#ff6b35" },
              { id: "github", name: "GitHub Trending", color: "#a78bfa" },
              { id: "producthunt", name: "Product Hunt", color: "#da552f" },
              { id: "reddit", name: "Reddit", color: "#ff4500" },
              { id: "x", name: "X / Twitter", color: "#1da1f2" },
              { id: "taaft", name: "TAAFT", color: "#6366f1" },
            ].map((src) => {
              const srcResults = results.filter((r) => r.source === src.id);
              const lastRun = runs.find((r) => r.scraperId === src.id);
              return (
                <div key={src.id} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "6px 0", borderBottom: "1px solid #12121e",
                }}>
                  <div style={{ width: "4px", height: "20px", borderRadius: "2px", background: src.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", color: "#e0e0e8" }}>{src.name}</div>
                    <div style={{ fontSize: "9px", color: "#666" }}>
                      {srcResults.length} items{lastRun ? ` · ${formatAlertTime(lastRun.startedAt)}` : ""}
                    </div>
                  </div>
                  {onRunScraper && (
                    <button
                      onClick={() => handleRunSingle(src.id)}
                      disabled={runningScraper === src.id}
                      style={{
                        padding: "2px 8px",
                        background: runResult?.id === src.id
                          ? (runResult.ok ? "#00ff8818" : "#ff444418")
                          : runningScraper === src.id ? "#1a1a2e" : "none",
                        border: `1px solid ${
                          runResult?.id === src.id
                            ? (runResult.ok ? "#00ff8844" : "#ff444444")
                            : src.color + "44"
                        }`,
                        borderRadius: "4px",
                        color: runResult?.id === src.id
                          ? (runResult.ok ? "#00ff88" : "#ff4444")
                          : runningScraper === src.id ? "#888" : src.color,
                        cursor: runningScraper === src.id ? "not-allowed" : "pointer",
                        fontSize: "9px", fontFamily: "inherit",
                        transition: "all 0.2s",
                        animation: runningScraper === src.id ? "pulse 1.5s ease-in-out infinite" : "none",
                      }}
                    >
                      {runningScraper === src.id ? "..." : runResult?.id === src.id ? (runResult.ok ? "\u2713 done" : "\u2717 err") : "run"}
                    </button>
                  )}
                </div>
              );
            })}
            {/* Custom scrapers */}
            {customScrapers.filter((s) => s.enabled).map((src) => (
              <div key={src.id} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "6px 0", borderBottom: "1px solid #12121e",
              }}>
                <div style={{ width: "4px", height: "20px", borderRadius: "2px", background: src.color || "#00d4ff", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", color: "#e0e0e8" }}>{src.name}</div>
                  <div style={{ fontSize: "9px", color: "#666" }}>
                    custom · {src.type}{src.lastRun ? ` · ${formatAlertTime(src.lastRun)}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: "9px", color: "#00d4ff", background: "#00d4ff15", padding: "1px 6px", borderRadius: "4px" }}>custom</span>
              </div>
            ))}
          </div>
        </div>

        {/* Intelligence Quick Card */}
        <div style={{
          flex: "1 1 200px", background: "#0e0e18", border: "1px solid #1a1a2e",
          borderRadius: "12px", overflow: "hidden",
        }}>
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid #1a1a2e", background: "#0c0c14",
            fontSize: "10px", color: "#00d4ff", letterSpacing: "2px",
          }}>
            INTELLIGENCE
          </div>
          <div style={{ padding: "14px 16px" }}>
            {hasAIKey ? (
              <div>
                <div style={{ fontSize: "12px", color: "#e0e0e8", marginBottom: '8px' }}>AI Analysis Ready</div>
                <div style={{ fontSize: "10px", color: "#888", lineHeight: 1.6, marginBottom: '12px' }}>
                  {results.length} items across {new Set(results.map((r) => r.source)).size} sources available for analysis.
                </div>
                {onNavigate && (
                  <button onClick={() => onNavigate("intelligence")} style={{
                    padding: "6px 14px", background: "#00d4ff18", border: "1px solid #00d4ff44",
                    borderRadius: "6px", color: "#00d4ff", cursor: "pointer",
                    fontSize: "11px", fontFamily: "inherit", width: "100%",
                  }}>
                    Open Intelligence
                  </button>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "20px", opacity: 0.3, marginBottom: "8px" }}>&#9889;</div>
                <div style={{ fontSize: "11px", color: "#666", lineHeight: 1.5, marginBottom: '10px' }}>
                  Add an API key in Settings to unlock AI-powered intelligence briefings.
                </div>
                {onNavigate && (
                  <button onClick={() => onNavigate("settings")} style={{
                    padding: "5px 12px", background: "#1a1a2e", border: "1px solid #2a2a3e",
                    borderRadius: "6px", color: "#888", cursor: "pointer",
                    fontSize: "10px", fontFamily: "inherit",
                  }}>
                    Settings
                  </button>
                )}
              </div>
            )}

            {/* Mini sparkline */}
            {sparklineData.length > 1 && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ fontSize: "9px", color: "#555", letterSpacing: "1px", marginBottom: "4px" }}>ACTIVITY</div>
                <MiniSparkline data={sparklineData} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cross-source signals */}
      {crossSourceItems.length > 0 && (
        <div style={{
          background: "#0e0e18", border: "1px solid #1a1a2e", borderRadius: "12px",
          overflow: "hidden", marginBottom: "24px",
        }}>
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid #1a1a2e", background: "#0c0c14",
            fontSize: "10px", color: "#ffaa00", letterSpacing: "2px",
          }}>
            CROSS-SOURCE SIGNALS
          </div>
          <div style={{ padding: "12px 16px" }}>
            {crossSourceItems.map((cs, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "6px 0", borderBottom: i < crossSourceItems.length - 1 ? "1px solid #12121e" : "none",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", color: "#e0e0e8" }}>{cs.title}</div>
                </div>
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  {cs.sources.map((s) => (
                    <span key={s} style={{
                      fontSize: "9px", color: SOURCE_COLORS[s] || "#00d4ff",
                      background: (SOURCE_COLORS[s] || "#00d4ff") + "18",
                      padding: "1px 6px", borderRadius: "4px",
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content: Feed + Sidebar */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* Section 2: Live Feed (left 60%) */}
        <div
          style={{ flex: "3 1 400px", minWidth: 0 }}
          aria-label="Live scraped data feed"
          role="region"
        >
          {/* Feed header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#e0e0e8",
                margin: 0,
                fontFamily: "inherit",
              }}
            >
              Live Feed
            </h2>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {/* Filter buttons */}
              {dynamicFilters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  aria-pressed={activeFilter === f.id}
                  style={{
                    padding: "4px 10px",
                    background:
                      activeFilter === f.id ? "#00ff8818" : "#1a1a2e",
                    border: `1px solid ${activeFilter === f.id ? "#00ff8844" : "#2a2a3e"}`,
                    borderRadius: "6px",
                    color: activeFilter === f.id ? "#00ff88" : "#888",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}
                >
                  {f.label}
                </button>
              ))}

              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label={refreshing ? "Refreshing..." : "Refresh feed"}
                style={{
                  padding: "4px 10px",
                  background: "#1a1a2e",
                  border: "1px solid #2a2a3e",
                  borderRadius: "6px",
                  color: refreshing ? "#666" : "#999",
                  cursor: refreshing ? "not-allowed" : "pointer",
                  fontSize: "11px",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                  marginLeft: "4px",
                }}
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Feed items */}
          {filteredResults.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                background: "#0e0e18",
                border: "1px solid #1a1a2e",
                borderRadius: "8px",
                color: "#666",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "12px", opacity: 0.4 }}>
                &#128269;
              </div>
              No data yet. Configure a scraper to get started.
            </div>
          ) : (
            <div role="list" aria-label="Scraped items">
              {filteredResults.map((item) => (
                <FeedItem
                  key={item.id}
                  source={item.source}
                  title={item.title}
                  url={item.url}
                  timestamp={item.scrapedAt}
                  tags={item.tags}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Activity Sidebar (right 40%) */}
        <div
          style={{ flex: "2 1 280px", minWidth: 0 }}
          aria-label="Activity sidebar"
          role="complementary"
        >
          {/* Recent Runs */}
          <div style={{ marginBottom: "20px" }}>
            <h2
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#e0e0e8",
                margin: "0 0 10px 0",
                fontFamily: "inherit",
              }}
            >
              Recent Runs
            </h2>
            {runs.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  background: "#0e0e18",
                  border: "1px solid #1a1a2e",
                  borderRadius: "6px",
                  color: "#666",
                  fontSize: "12px",
                }}
              >
                No runs yet
              </div>
            ) : (
              <div role="list" aria-label="Recent scraper runs">
                {runs.map((run) => (
                  <RunStatus
                    key={run.id}
                    scraperName={run.scraperName}
                    status={run.status}
                    startedAt={run.startedAt}
                    itemCount={run.itemCount}
                    duration={run.duration}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Alerts */}
          <div>
            <h2
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#e0e0e8",
                margin: "0 0 10px 0",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Alerts
              {unreadAlerts.length > 0 && (
                <span
                  style={{
                    fontSize: "10px",
                    background: "#ff444433",
                    color: "#ff6b6b",
                    padding: "1px 7px",
                    borderRadius: "10px",
                    fontWeight: 600,
                  }}
                >
                  {unreadAlerts.length}
                </span>
              )}
            </h2>
            {alerts.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  background: "#0e0e18",
                  border: "1px solid #1a1a2e",
                  borderRadius: "6px",
                  color: "#666",
                  fontSize: "12px",
                }}
              >
                No alerts
              </div>
            ) : (
              <div role="list" aria-label="Alerts">
                {alerts.map((alert) => {
                  const ac = ALERT_COLORS[alert.type] || ALERT_COLORS.info;
                  return (
                    <div
                      key={alert.id}
                      role="listitem"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: "10px 12px",
                        background: ac.bg,
                        border: `1px solid ${ac.border}`,
                        borderRadius: "6px",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          color: ac.color,
                          fontSize: "12px",
                          flexShrink: 0,
                          marginTop: "1px",
                        }}
                      >
                        {alert.type === "error"
                          ? "\u2716"
                          : alert.type === "warning"
                            ? "\u26A0"
                            : "\u2139"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#e0e0e8",
                            lineHeight: 1.4,
                            wordBreak: "break-word",
                          }}
                        >
                          {alert.message}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#666",
                            marginTop: "4px",
                          }}
                        >
                          {formatAlertTime(alert.timestamp)}
                        </div>
                      </div>
                      {onDismissAlert && !alert.read && (
                        <button
                          onClick={() => onDismissAlert(alert.id)}
                          aria-label={`Dismiss alert: ${alert.message}`}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#666",
                            cursor: "pointer",
                            fontSize: "14px",
                            padding: "0 2px",
                            flexShrink: 0,
                            lineHeight: 1,
                            fontFamily: "inherit",
                          }}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pulse animation for running status */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function MiniSparkline({ data, color = "#00ff88" }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const h = 24;
  const w = 120;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: `${h}px` }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${h} ${points} ${w},${h}`} fill={color + "10"} stroke="none" />
    </svg>
  );
}

function formatAlertTime(date) {
  if (!date) return "";
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}
