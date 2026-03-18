import { useState } from "react";
import { APPROACHES } from "../../data/approaches";
import { CopyButton, DownloadButton } from "../ui";

export function ApproachesTab() {
  const [selectedApproach, setSelectedApproach] = useState(0);
  const [showRealWorld, setShowRealWorld] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const approach = APPROACHES[selectedApproach];

  return (
    <div>
      {/* Compare toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <span style={{ fontSize: "12px", color: "#999" }}>
          {compareMode
            ? "Side-by-side comparison"
            : "Select an approach to explore"}
        </span>
        <button
          onClick={() => setCompareMode(!compareMode)}
          aria-pressed={compareMode}
          style={{
            padding: "6px 14px",
            background: compareMode ? "#00ff8822" : "#1a1a2e",
            border: `1px solid ${compareMode ? "#00ff8844" : "#2a2a3e"}`,
            borderRadius: "6px",
            color: compareMode ? "#00ff88" : "#888",
            cursor: "pointer",
            fontSize: "11px",
            fontFamily: "inherit",
            transition: "all 0.2s",
          }}
        >
          {compareMode ? "Detail View" : "Compare All"}
        </button>
      </div>

      {compareMode ? (
        /* Comparison Table */
        <div
          style={{
            background: "#0e0e18",
            border: "1px solid #1a1a2e",
            borderRadius: "12px",
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #1a1a2e",
                  background: "#0c0c14",
                }}
              >
                {["", "Speed", "Coverage", "Difficulty", "Best For"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        color: "#999",
                        fontWeight: 500,
                        fontSize: "11px",
                        letterSpacing: "1px",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {APPROACHES.map((a) => (
                <tr
                  key={a.id}
                  style={{ borderBottom: "1px solid #1a1a2e" }}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span style={{ fontSize: "18px" }} role="img" aria-hidden="true">{a.icon}</span>
                      <div>
                        <div style={{ color: a.color, fontWeight: 600 }}>
                          {a.title}
                        </div>
                        <div style={{ color: "#999", fontSize: "10px" }}>
                          {a.subtitle}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#aaa" }}>
                    {a.speed}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#aaa" }}>
                    {a.coverage}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#aaa" }}>
                    {a.difficulty}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#aaa" }}>
                    {a.bestFor.slice(0, 2).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Approach Selector Cards */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}
          >
            {APPROACHES.map((a, i) => (
              <button
                key={a.id}
                onClick={() => {
                  setSelectedApproach(i);
                  setShowRealWorld(false);
                }}
                aria-pressed={selectedApproach === i}
                style={{
                  flex: "1 1 140px",
                  padding: "16px",
                  background:
                    selectedApproach === i ? "#141428" : "#0e0e18",
                  border: `1px solid ${selectedApproach === i ? a.color + "44" : "#1a1a2e"}`,
                  borderRadius: "12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }} role="img" aria-hidden="true">
                  {a.icon}
                </div>
                <div
                  style={{
                    color: selectedApproach === i ? a.color : "#888",
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily: "inherit",
                  }}
                >
                  {a.title}
                </div>
                <div
                  style={{
                    color: "#999",
                    fontSize: "11px",
                    fontFamily: "inherit",
                  }}
                >
                  {a.subtitle}
                </div>
              </button>
            ))}
          </div>

          {/* Approach Detail */}
          <div
            style={{
              background: "#0e0e18",
              border: "1px solid #1a1a2e",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            {/* Meta bar */}
            <div
              style={{
                display: "flex",
                gap: "24px",
                padding: "16px 20px",
                borderBottom: "1px solid #1a1a2e",
                fontSize: "12px",
                flexWrap: "wrap",
              }}
            >
              {[
                { label: "Difficulty", value: approach.difficulty },
                { label: "Speed", value: approach.speed },
                { label: "Coverage", value: approach.coverage },
              ].map((m) => (
                <div key={m.label}>
                  <span style={{ color: "#999" }}>{m.label}: </span>
                  <span style={{ color: approach.color }}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid #1a1a2e",
              }}
            >
              <p
                style={{
                  color: "#aaa",
                  fontSize: "13px",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {approach.description}
              </p>
            </div>

            {/* Best for / Fails on */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                borderBottom: "1px solid #1a1a2e",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderRight: "1px solid #1a1a2e",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#00ff88",
                    letterSpacing: "2px",
                    marginBottom: "10px",
                  }}
                >
                  BEST FOR
                </div>
                {approach.bestFor.map((item) => (
                  <div
                    key={item}
                    style={{
                      fontSize: "12px",
                      color: "#999",
                      padding: "4px 0",
                    }}
                  >
                    + {item}
                  </div>
                ))}
              </div>
              <div style={{ padding: "16px 20px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#ff4444",
                    letterSpacing: "2px",
                    marginBottom: "10px",
                  }}
                >
                  FAILS ON
                </div>
                {approach.failsOn.map((item) => (
                  <div
                    key={item}
                    style={{
                      fontSize: "12px",
                      color: "#999",
                      padding: "4px 0",
                    }}
                  >
                    - {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Code */}
            <div style={{ padding: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: approach.color,
                    letterSpacing: "2px",
                  }}
                >
                  {showRealWorld ? "REAL-WORLD PATTERN" : "BASIC EXAMPLE"}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <CopyButton
                    text={showRealWorld ? approach.realWorld : approach.code}
                  />
                  <DownloadButton
                    text={showRealWorld ? approach.realWorld : approach.code}
                    filename={`${approach.id}-example.mjs`}
                  />
                  <button
                    onClick={() => setShowRealWorld(!showRealWorld)}
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
                    {showRealWorld ? "Basic" : "Real-World"}
                  </button>
                </div>
              </div>
              <pre
                style={{
                  background: "#080810",
                  border: "1px solid #1a1a2e",
                  borderRadius: "8px",
                  padding: "16px",
                  fontSize: "12px",
                  lineHeight: 1.6,
                  color: "#c8c8d0",
                  overflow: "auto",
                  maxHeight: "400px",
                  margin: 0,
                }}
              >
                {showRealWorld ? approach.realWorld : approach.code}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
