import { useState, useMemo } from "react";
import { StatCard } from "./StatCard";
import { FeedItem } from "./FeedItem";
import { RunStatus } from "./RunStatus";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "hn", label: "HN" },
  { id: "github", label: "GitHub" },
  { id: "producthunt", label: "ProductHunt" },
];

const ALERT_COLORS = {
  error: { color: "#ff4444", bg: "#ff444418", border: "#ff444433" },
  warning: { color: "#f0c040", bg: "#f0c04018", border: "#f0c04033" },
  info: { color: "#00ff88", bg: "#00ff8818", border: "#00ff8833" },
};

export function DashboardTab({
  runs = [],
  results = [],
  alerts = [],
  stats = { totalRuns: 0, successRate: 0, totalItems: 0, activeScrapers: 0 },
  onRefresh,
  onDismissAlert,
  isDemo = false,
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const filteredResults = useMemo(() => {
    if (activeFilter === "all") return results;
    return results.filter((r) => r.source === activeFilter);
  }, [results, activeFilter]);

  const unreadAlerts = alerts.filter((a) => !a.read);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div aria-label="Dashboard" role="region">
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
          value={stats.activeScrapers}
          color="#ff6b35"
          icon="&#9881;"
        />
      </div>

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
              {FILTERS.map((f) => (
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

function formatAlertTime(date) {
  if (!date) return "";
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}
