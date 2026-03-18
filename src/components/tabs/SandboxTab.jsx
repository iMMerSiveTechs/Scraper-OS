import { useState, lazy, Suspense } from "react";
import { DEFAULT_SANDBOX_CODE } from "../../data/defaultSandboxCode";
import { SELECTOR_PATTERNS } from "../../data/selectorPatterns";
import { CopyButton, DownloadButton } from "../ui";
import { SelectorTester } from "../SelectorTester";
import { TemplateLibrary } from "../TemplateLibrary";

const CodeEditor = lazy(() =>
  import("../CodeEditor").then((m) => ({ default: m.CodeEditor }))
);

export function SandboxTab({ sandboxCode, setSandboxCode }) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTester, setShowTester] = useState(false);

  const handleTemplateSelect = (code) => {
    if (sandboxCode !== DEFAULT_SANDBOX_CODE && !confirm("Replace current code with template?")) return;
    setSandboxCode(code);
    setShowTemplates(false);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ fontSize: "13px", color: "#999" }}>
          Edit the scraper template below. Changes auto-save.
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => setShowTemplates(true)}
            style={{
              padding: "5px 12px",
              background: "#a78bfa22",
              border: "1px solid #a78bfa44",
              borderRadius: "6px",
              color: "#a78bfa",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "inherit",
            }}
          >
            Templates
          </button>
          <CopyButton text={sandboxCode} label="Copy" />
          <DownloadButton text={sandboxCode} filename="scraper.mjs" />
          <button
            onClick={() => setSandboxCode(DEFAULT_SANDBOX_CODE)}
            style={{
              padding: "5px 12px",
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: "6px",
              color: "#888",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "inherit",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        style={{
          background: "#0e0e18",
          border: "1px solid #1a1a2e",
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            borderBottom: "1px solid #1a1a2e",
            background: "#0c0c14",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#ff5f56",
            }}
          />
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#ffbd2e",
            }}
          />
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#27c93f",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              color: "#999",
              marginLeft: "8px",
            }}
          >
            scraper.mjs
          </span>
        </div>
        <Suspense
          fallback={
            <textarea
              value={sandboxCode}
              onChange={(e) => setSandboxCode(e.target.value)}
              spellCheck={false}
              aria-label="Scraper code editor (loading...)"
              style={{
                width: "100%",
                minHeight: "450px",
                padding: "16px",
                background: "#080810",
                border: "none",
                color: "#c8c8d0",
                fontSize: "12px",
                fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
                tabSize: 2,
              }}
            />
          }
        >
          <CodeEditor
            value={sandboxCode}
            onChange={setSandboxCode}
            minHeight="450px"
          />
        </Suspense>
      </div>

      {/* Selector Reference */}
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
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "#ff6b35",
              letterSpacing: "2px",
            }}
          >
            CSS SELECTOR CHEATSHEET
          </span>
        </div>
        <div style={{ padding: "12px 16px" }}>
          {SELECTOR_PATTERNS.map((p) => (
            <div
              key={p.selector}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "6px 0",
                borderBottom: "1px solid #12121e",
                fontSize: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => navigator.clipboard.writeText(p.selector)}
                title="Click to copy"
                style={{
                  color: "#00ff88",
                  background: "#00ff8810",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  minWidth: "220px",
                  fontSize: "11px",
                  cursor: "pointer",
                  border: "none",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                {p.selector}
              </button>
              <span style={{ color: "#888" }}>{p.desc}</span>
            </div>
          ))}
          <div
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              background: "#0a0a0f",
              borderRadius: "6px",
              fontSize: "11px",
              color: "#999",
              lineHeight: 1.7,
            }}
          >
            <strong style={{ color: "#aaa" }}>Tips:</strong> Click any
            selector to copy. Test selectors in browser console with{" "}
            <code style={{ color: "#a78bfa" }}>
              document.querySelectorAll(&apos;selector&apos;)
            </code>
            . If content loads after page load, check Network tab for API
            calls first.
          </div>
        </div>
      </div>

      {/* Selector Tester Toggle */}
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => setShowTester(!showTester)}
          aria-expanded={showTester}
          style={{
            padding: "8px 16px",
            background: showTester ? "#00d4ff22" : "#1a1a2e",
            border: `1px solid ${showTester ? "#00d4ff44" : "#2a2a3e"}`,
            borderRadius: "6px",
            color: showTester ? "#00d4ff" : "#888",
            cursor: "pointer",
            fontSize: "11px",
            fontFamily: "inherit",
            marginBottom: "12px",
            transition: "all 0.2s",
          }}
        >
          {showTester ? "Hide Selector Tester" : "Open Selector Tester"}
        </button>
        {showTester && <SelectorTester />}
      </div>

      {/* Template Library Modal */}
      {showTemplates && (
        <TemplateLibrary
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
