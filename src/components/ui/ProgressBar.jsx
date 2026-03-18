export function ProgressBar({ items }) {
  const done = items.filter((s) => s === "Done").length;
  const inProgress = items.filter((s) => s === "In Progress").length;
  const total = items.length;
  const pct = total > 0 ? Math.round(((done + inProgress * 0.5) / total) * 100) : 0;

  return (
    <div style={{ marginBottom: "20px" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Project completion progress">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
          fontSize: "11px",
        }}
      >
        <span style={{ color: "#999" }}>
          {done}/{total} complete
          {inProgress > 0 && ` \u00B7 ${inProgress} in progress`}
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
