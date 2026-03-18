export function StatCard({ label, value, color = "#00ff88", icon }) {
  return (
    <div
      role="group"
      aria-label={`${label}: ${value}`}
      style={{
        background: "#0e0e18",
        border: "1px solid #1a1a2e",
        borderLeft: `3px solid ${color}`,
        borderRadius: "8px",
        padding: "16px 18px",
        flex: "1 1 0",
        minWidth: "140px",
        transition: "border-color 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        {icon && (
          <span style={{ fontSize: "16px", opacity: 0.8 }} aria-hidden="true">
            {icon}
          </span>
        )}
        <span
          style={{
            fontSize: "11px",
            color: "#999",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: "26px",
          fontWeight: 700,
          color: color,
          fontFamily: "'Space Grotesk', 'JetBrains Mono', monospace",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
