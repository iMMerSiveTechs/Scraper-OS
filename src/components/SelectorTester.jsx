import { useState, useMemo } from "react";

const SAMPLE_HTML = `<div class="products">
  <div class="card" data-id="1">
    <h3 class="title">Product A</h3>
    <span class="price">$29.99</span>
    <a href="/products/a">View</a>
  </div>
  <div class="card" data-id="2">
    <h3 class="title">Product B</h3>
    <span class="price">$49.99</span>
    <a href="/products/b">View</a>
  </div>
  <div class="card featured" data-id="3">
    <h3 class="title">Product C</h3>
    <span class="price">$99.99</span>
    <a href="/products/c">View</a>
  </div>
  <ul class="tags">
    <li>Electronics</li>
    <li>Sale</li>
    <li>New</li>
  </ul>
</div>`;

export function SelectorTester() {
  const [html, setHtml] = useState(SAMPLE_HTML);
  const [selector, setSelector] = useState(".card .title");

  const matches = useMemo(() => {
    if (!selector.trim() || !html.trim()) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const els = doc.querySelectorAll(selector);
      return Array.from(els).map((el) => ({
        text: el.textContent?.trim() || "",
        tag: el.tagName.toLowerCase(),
        outerHTML: el.outerHTML.slice(0, 200),
      }));
    } catch {
      return [];
    }
  }, [html, selector]);

  const isValidSelector = useMemo(() => {
    if (!selector.trim()) return true;
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }, [selector]);

  return (
    <div
      style={{
        background: "#0e0e18",
        border: "1px solid #1a1a2e",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1a1a2e",
          background: "#0c0c14",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            color: "#00d4ff",
            letterSpacing: "2px",
          }}
        >
          SELECTOR TESTER
        </span>
        <span style={{ fontSize: "11px", color: isValidSelector ? "#00ff88" : "#ff4444" }}>
          {!selector.trim() ? "" : isValidSelector ? `${matches.length} match${matches.length !== 1 ? "es" : ""}` : "Invalid selector"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "250px" }}>
        {/* HTML Input */}
        <div style={{ borderRight: "1px solid #1a1a2e", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #12121e", fontSize: "10px", color: "#999", letterSpacing: "1px" }}>
            HTML
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            spellCheck={false}
            aria-label="HTML input for selector testing"
            style={{
              flex: 1,
              padding: "10px 12px",
              background: "#080810",
              border: "none",
              color: "#c8c8d0",
              fontSize: "11px",
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.5,
              resize: "none",
              outline: "none",
              minHeight: "200px",
            }}
          />
        </div>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #12121e" }}>
            <input
              type="text"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
              placeholder="Enter CSS selector..."
              aria-label="CSS selector to test"
              style={{
                width: "100%",
                padding: "4px 0",
                background: "none",
                border: "none",
                color: isValidSelector ? "#00ff88" : "#ff4444",
                fontSize: "12px",
                fontFamily: "'JetBrains Mono', monospace",
                outline: "none",
              }}
            />
          </div>
          <div style={{ flex: 1, padding: "10px 12px", overflow: "auto", maxHeight: "300px" }}>
            {matches.length === 0 && selector.trim() && isValidSelector && (
              <div style={{ fontSize: "11px", color: "#666", padding: "8px 0" }}>
                No matches found.
              </div>
            )}
            {matches.map((m, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 8px",
                  marginBottom: "4px",
                  background: "#0a0a0f",
                  borderRadius: "4px",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
                onClick={() => navigator.clipboard.writeText(m.text)}
                title="Click to copy text"
              >
                <div style={{ color: "#00ff88", marginBottom: "2px" }}>
                  &lt;{m.tag}&gt; {m.text}
                </div>
                <div style={{ color: "#555", fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.outerHTML}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
