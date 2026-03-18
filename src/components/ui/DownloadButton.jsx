import { useCallback } from "react";

export function DownloadButton({ text, filename, style: extraStyle = {} }) {
  const handleDownload = useCallback(() => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [text, filename]);

  return (
    <button
      onClick={handleDownload}
      aria-label={`Download as ${filename}`}
      style={{
        padding: "5px 12px",
        background: "#1a1a2e",
        border: "1px solid #2a2a3e",
        borderRadius: "6px",
        color: "#888",
        cursor: "pointer",
        fontSize: "11px",
        fontFamily: "inherit",
        transition: "all 0.2s",
        ...extraStyle,
      }}
    >
      Download
    </button>
  );
}
