import { CopyButton } from "./CopyButton";
import { DownloadButton } from "./DownloadButton";

export function CodeBlock({
  code,
  filename,
  label,
  color = "#00ff88",
  maxHeight = "400px",
  showDownload = false,
}) {
  return (
    <div
      style={{
        background: "#0e0e18",
        border: "1px solid #1a1a2e",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: "1px solid #1a1a2e",
          background: "#0c0c14",
        }}
      >
        <span style={{ fontSize: "11px", color, letterSpacing: "2px" }}>
          {label}
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <CopyButton text={code} />
          {showDownload && filename && (
            <DownloadButton text={code} filename={filename} />
          )}
        </div>
      </div>
      <pre
        style={{
          background: "#080810",
          padding: "16px",
          fontSize: "12px",
          lineHeight: 1.6,
          color: "#c8c8d0",
          overflow: "auto",
          maxHeight,
          margin: 0,
        }}
      >
        {code}
      </pre>
    </div>
  );
}
