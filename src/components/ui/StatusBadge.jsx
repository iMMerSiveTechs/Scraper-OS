export function StatusBadge({ status, onClick }) {
  const colors = {
    "Not Started": { bg: "#1a1a2e", border: "#2a2a3e", text: "#999" },
    "In Progress": { bg: "#ff6b3522", border: "#ff6b3544", text: "#ff6b35" },
    Done: { bg: "#00ff8822", border: "#00ff8844", text: "#00ff88" },
  };
  const c = colors[status] || colors["Not Started"];

  return (
    <button
      onClick={onClick}
      aria-label={`Status: ${status}. Click to change.`}
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
