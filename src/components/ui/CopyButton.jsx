import { useState, useCallback } from "react";

export function CopyButton({ text, label = "Copy", style: extraStyle = {} }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for HTTP or restricted contexts
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Silent fail
      }
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied to clipboard" : `Copy ${label}`}
      aria-live="polite"
      style={{
        padding: "5px 12px",
        background: copied ? "#00ff8822" : "#1a1a2e",
        border: `1px solid ${copied ? "#00ff8844" : "#2a2a3e"}`,
        borderRadius: "6px",
        color: copied ? "#00ff88" : "#888",
        cursor: "pointer",
        fontSize: "11px",
        fontFamily: "inherit",
        transition: "all 0.2s",
        ...extraStyle,
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
