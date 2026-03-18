const STATUS_CONFIG = {
  success: { color: "#00ff88", label: "Success" },
  running: { color: "#f0c040", label: "Running" },
  failed: { color: "#ff4444", label: "Failed" },
};

function formatTimeAgo(date) {
  if (!date) return "";
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(ms) {
  if (!ms) return "--";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function RunStatus({ scraperName, status, startedAt, itemCount, duration }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.success;

  return (
    <div
      role="listitem"
      aria-label={`${scraperName}: ${cfg.label}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        background: "#0e0e18",
        border: "1px solid #1a1a2e",
        borderRadius: "6px",
        marginBottom: "6px",
      }}
    >
      {/* Status dot */}
      <span
        aria-hidden="true"
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: cfg.color,
          flexShrink: 0,
          boxShadow: status === "running" ? `0 0 6px ${cfg.color}88` : "none",
          animation: status === "running" ? "pulse 1.5s ease-in-out infinite" : "none",
        }}
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "12px",
            color: "#e0e0e8",
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {scraperName}
        </div>
        <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
          {formatTimeAgo(startedAt)}
          {duration != null && ` \u00b7 ${formatDuration(duration)}`}
        </div>
      </div>

      {/* Item count */}
      <span
        style={{
          fontSize: "11px",
          color: cfg.color,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {status === "running" ? (
          <span style={{ color: "#f0c040" }}>...</span>
        ) : status === "failed" ? (
          <span style={{ color: "#ff4444" }}>err</span>
        ) : (
          `${itemCount} items`
        )}
      </span>
    </div>
  );
}
