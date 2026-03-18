import { useState } from "react";
import { TEMPLATES } from "../data/templates";

const APPROACH_COLORS = {
  static: "#00ff88",
  browser: "#ff6b35",
  api: "#a78bfa",
};

export function TemplateLibrary({ onSelect, onClose }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.approach === filter);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0e0e18",
          border: "1px solid #1a1a2e",
          borderRadius: "12px",
          maxWidth: "640px",
          width: "100%",
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Scraper Template Library"
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1a2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, fontFamily: "inherit", color: "#e0e0e8" }}>
            Template Library
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: "16px", fontFamily: "inherit" }}
            aria-label="Close"
          >
            x
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #1a1a2e", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All" },
            { id: "static", label: "Static" },
            { id: "browser", label: "Browser" },
            { id: "api", label: "API" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              style={{
                padding: "4px 12px",
                background: filter === f.id ? "#00ff8822" : "#0a0a0f",
                border: `1px solid ${filter === f.id ? "#00ff8844" : "#2a2a3e"}`,
                borderRadius: "6px",
                color: filter === f.id ? "#00ff88" : "#888",
                cursor: "pointer",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Templates */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
          {filtered.map((t) => (
            <div
              key={t.id}
              style={{
                padding: "14px 16px",
                background: "#0a0a0f",
                border: "1px solid #1a1a2e",
                borderRadius: "10px",
                marginBottom: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={() => onSelect(t.code)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(t.code);
                }
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#e0e0e8", fontFamily: "inherit" }}>
                  {t.name}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span style={{
                    fontSize: "9px",
                    color: APPROACH_COLORS[t.approach] || "#888",
                    background: (APPROACH_COLORS[t.approach] || "#888") + "15",
                    padding: "2px 8px",
                    borderRadius: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}>
                    {t.approach}
                  </span>
                  <span style={{
                    fontSize: "9px",
                    color: "#999",
                    background: "#1a1a2e",
                    padding: "2px 8px",
                    borderRadius: "8px",
                  }}>
                    {t.difficulty}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: "11px", color: "#888", lineHeight: 1.5, margin: 0 }}>
                {t.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
