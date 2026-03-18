import { useState } from "react";
import { APPROACHES } from "../../data/approaches";
import { USE_CASES } from "../../data/useCases";
import { StatusBadge, ProgressBar } from "../ui";

export function ProjectsTab({
  projectStatuses,
  setProjectStatuses,
  projectNotes,
  setProjectNotes,
}) {
  const [expandedProject, setExpandedProject] = useState(null);

  const cycleStatus = (app) => {
    const order = ["Not Started", "In Progress", "Done"];
    const current = projectStatuses[app] || "Not Started";
    const next = order[(order.indexOf(current) + 1) % order.length];
    setProjectStatuses({ ...projectStatuses, [app]: next });
  };

  const updateNote = (app, note) => {
    setProjectNotes({ ...projectNotes, [app]: note });
  };

  return (
    <div>
      <div
        style={{
          fontSize: "13px",
          color: "#999",
          marginBottom: "16px",
          lineHeight: 1.6,
        }}
      >
        Track scraping progress across your projects. Click status to
        cycle it. Expand for notes.
      </div>

      <ProgressBar
        items={USE_CASES.map(
          (uc) => projectStatuses[uc.app] || "Not Started"
        )}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {USE_CASES.map((uc) => {
          const status = projectStatuses[uc.app] || "Not Started";
          const isExpanded = expandedProject === uc.app;
          const note = projectNotes[uc.app] || "";
          const approachData = APPROACHES.find(
            (a) => a.id === uc.approach
          );

          return (
            <div
              key={uc.app}
              style={{
                background: "#0e0e18",
                border: `1px solid ${isExpanded ? uc.color + "44" : "#1a1a2e"}`,
                borderRadius: "12px",
                overflow: "hidden",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px 20px",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setExpandedProject(isExpanded ? null : uc.app)
                }
                role="button"
                aria-expanded={isExpanded}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedProject(isExpanded ? null : uc.app);
                  }
                }}
              >
                <span style={{ fontSize: "22px", flexShrink: 0 }} role="img" aria-hidden="true">
                  {uc.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#e0e0e8",
                        fontFamily: "inherit",
                      }}
                    >
                      {uc.app}
                    </span>
                    {approachData && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: approachData.color,
                          background: approachData.color + "15",
                          padding: "2px 8px",
                          borderRadius: "8px",
                        }}
                      >
                        {approachData.title}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      lineHeight: 1.5,
                      margin: "4px 0 0",
                    }}
                  >
                    {uc.idea}
                  </p>
                </div>
                <div
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{ flexShrink: 0 }}
                >
                  <StatusBadge
                    status={status}
                    onClick={() => cycleStatus(uc.app)}
                  />
                </div>
                <span
                  style={{
                    color: "#999",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  {isExpanded ? "\u2212" : "+"}
                </span>
              </div>

              {isExpanded && (
                <div
                  style={{
                    padding: "0 20px 16px",
                    borderTop: "1px solid #1a1a2e",
                  }}
                >
                  {/* Targets */}
                  <div style={{ marginTop: "12px" }}>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#999",
                        letterSpacing: "1px",
                        marginBottom: "6px",
                      }}
                    >
                      SCRAPING TARGETS
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      {uc.targets.map((t) => (
                        <span
                          key={t}
                          style={{
                            padding: "4px 10px",
                            background: "#0a0a0f",
                            border: "1px solid #2a2a3e",
                            borderRadius: "6px",
                            fontSize: "11px",
                            color: "#888",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginTop: "12px" }}>
                    <label
                      htmlFor={`notes-${uc.app}`}
                      style={{
                        display: "block",
                        fontSize: "10px",
                        color: "#999",
                        letterSpacing: "1px",
                        marginBottom: "6px",
                      }}
                    >
                      NOTES
                    </label>
                    <textarea
                      id={`notes-${uc.app}`}
                      value={note}
                      onChange={(e) => updateNote(uc.app, e.target.value)}
                      placeholder="Add notes about this project's scraping needs..."
                      style={{
                        width: "100%",
                        minHeight: "80px",
                        padding: "10px 12px",
                        background: "#080810",
                        border: "1px solid #2a2a3e",
                        borderRadius: "8px",
                        color: "#c8c8d0",
                        fontSize: "12px",
                        fontFamily: "inherit",
                        lineHeight: 1.6,
                        resize: "vertical",
                        outline: "none",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "#00ff8844")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "#2a2a3e")
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
