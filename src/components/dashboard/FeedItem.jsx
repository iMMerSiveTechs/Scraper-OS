import { useState } from "react";

const SOURCE_CONFIG = {
  hn: { label: "HN", color: "#ff6b35", bg: "#ff6b3518" },
  github: { label: "GitHub", color: "#a78bfa", bg: "#a78bfa18" },
  producthunt: { label: "PH", color: "#00ff88", bg: "#00ff8818" },
  reddit: { label: "Reddit", color: "#ff4500", bg: "#ff450018" },
  x: { label: "X", color: "#1da1f2", bg: "#1da1f218" },
  taaft: { label: "TAAFT", color: "#6366f1", bg: "#6366f118" },
  file: { label: "File", color: "#ffaa00", bg: "#ffaa0018" },
  custom: { label: "Custom", color: "#00d4ff", bg: "#00d4ff18" },
};

function formatTimeAgo(date) {
  if (!date) return "";
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export function FeedItem({ source, title, url, timestamp, tags }) {
  const [copied, setCopied] = useState(false);
  const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.hn;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <div
      style={{
        padding: "12px 14px",
        background: "#0e0e18",
        border: "1px solid #1a1a2e",
        borderRadius: "8px",
        marginBottom: "8px",
        transition: "border-color 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        {/* Source badge */}
        <span
          aria-label={`Source: ${cfg.label}`}
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: cfg.color,
            background: cfg.bg,
            border: `1px solid ${cfg.color}33`,
            padding: "2px 8px",
            borderRadius: "4px",
            letterSpacing: "0.5px",
            whiteSpace: "nowrap",
            flexShrink: 0,
            marginTop: "2px",
          }}
        >
          {cfg.label}
        </span>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#e0e0e8",
              textDecoration: "none",
              fontSize: "13px",
              lineHeight: 1.5,
              display: "block",
              wordBreak: "break-word",
            }}
            onMouseEnter={(e) => (e.target.style.color = "#00ff88")}
            onMouseLeave={(e) => (e.target.style.color = "#e0e0e8")}
          >
            {title}
          </a>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "6px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "11px", color: "#666" }}>
              {formatTimeAgo(timestamp)}
            </span>

            {tags &&
              tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "10px",
                    color: "#777",
                    background: "#1a1a2e",
                    padding: "1px 6px",
                    borderRadius: "3px",
                    border: "1px solid #2a2a3e",
                  }}
                >
                  {tag}
                </span>
              ))}
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          aria-label={copied ? "URL copied" : "Copy URL to clipboard"}
          title={copied ? "Copied!" : "Copy URL"}
          style={{
            background: copied ? "#00ff8818" : "#1a1a2e",
            border: `1px solid ${copied ? "#00ff8844" : "#2a2a3e"}`,
            borderRadius: "4px",
            color: copied ? "#00ff88" : "#666",
            cursor: "pointer",
            fontSize: "11px",
            padding: "3px 7px",
            fontFamily: "inherit",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
        >
          {copied ? "\u2713" : "\u2398"}
        </button>
      </div>
    </div>
  );
}
