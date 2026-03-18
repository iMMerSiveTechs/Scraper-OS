import { useState } from "react";
import { APPROACHES } from "../../data/approaches";
import { USE_CASES } from "../../data/useCases";
import { StatusBadge, ProgressBar } from "../ui";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function ProjectsTab({
  projectStatuses,
  setProjectStatuses,
  projectNotes,
  setProjectNotes,
  projectSubtasks,
  setProjectSubtasks,
  projectUrls,
  setProjectUrls,
  customProjects,
  setCustomProjects,
}) {
  const [expandedProject, setExpandedProject] = useState(null);
  const [newSubtaskText, setNewSubtaskText] = useState({});
  const [newUrlText, setNewUrlText] = useState({});
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const allProjects = [
    ...USE_CASES,
    ...(customProjects || []),
  ];

  const cycleStatus = (app) => {
    const order = ["Not Started", "In Progress", "Done"];
    const current = projectStatuses[app] || "Not Started";
    const next = order[(order.indexOf(current) + 1) % order.length];
    setProjectStatuses({ ...projectStatuses, [app]: next });
  };

  const updateNote = (app, note) => {
    setProjectNotes({ ...projectNotes, [app]: note });
  };

  // Subtask management
  const getSubtasks = (app) => (projectSubtasks || {})[app] || [];

  const addSubtask = (app) => {
    const text = (newSubtaskText[app] || "").trim();
    if (!text) return;
    const current = getSubtasks(app);
    setProjectSubtasks({
      ...(projectSubtasks || {}),
      [app]: [...current, { id: generateId(), text, done: false }],
    });
    setNewSubtaskText({ ...newSubtaskText, [app]: "" });
  };

  const toggleSubtask = (app, id) => {
    const current = getSubtasks(app);
    setProjectSubtasks({
      ...(projectSubtasks || {}),
      [app]: current.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    });
  };

  const removeSubtask = (app, id) => {
    const current = getSubtasks(app);
    setProjectSubtasks({
      ...(projectSubtasks || {}),
      [app]: current.filter((s) => s.id !== id),
    });
  };

  // URL management
  const getUrls = (app) => (projectUrls || {})[app] || [];

  const addUrl = (app) => {
    const url = (newUrlText[app] || "").trim();
    if (!url) return;
    const current = getUrls(app);
    setProjectUrls({
      ...(projectUrls || {}),
      [app]: [...current, { id: generateId(), url }],
    });
    setNewUrlText({ ...newUrlText, [app]: "" });
  };

  const removeUrl = (app, id) => {
    const current = getUrls(app);
    setProjectUrls({
      ...(projectUrls || {}),
      [app]: current.filter((u) => u.id !== id),
    });
  };

  // Custom project management
  const addCustomProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    setCustomProjects([
      ...(customProjects || []),
      {
        app: name,
        icon: "\u{1F4CC}",
        color: "#00d4ff",
        idea: "Custom scraping project",
        approach: "static",
        targets: [],
        custom: true,
      },
    ]);
    setNewProjectName("");
    setShowAddProject(false);
  };

  const removeCustomProject = (app) => {
    if (!confirm(`Delete project "${app}"?`)) return;
    setCustomProjects((customProjects || []).filter((p) => p.app !== app));
    // Clean up associated data
    const { [app]: _s, ...restStatuses } = projectStatuses;
    const { [app]: _n, ...restNotes } = projectNotes;
    setProjectStatuses(restStatuses);
    setProjectNotes(restNotes);
  };

  // Calculate progress including subtasks
  const getProjectProgress = (app) => {
    const status = projectStatuses[app] || "Not Started";
    const subtasks = getSubtasks(app);
    if (subtasks.length > 0) {
      const done = subtasks.filter((s) => s.done).length;
      return done === subtasks.length ? "Done" : done > 0 ? "In Progress" : status;
    }
    return status;
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ fontSize: "13px", color: "#999", lineHeight: 1.6 }}>
          Track scraping progress. Click status to cycle. Expand for subtasks, URLs, and notes.
        </div>
        <button
          onClick={() => setShowAddProject(!showAddProject)}
          style={{
            padding: "5px 12px",
            background: showAddProject ? "#00ff8822" : "#1a1a2e",
            border: `1px solid ${showAddProject ? "#00ff8844" : "#2a2a3e"}`,
            borderRadius: "6px",
            color: showAddProject ? "#00ff88" : "#888",
            cursor: "pointer",
            fontSize: "11px",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          + Add Project
        </button>
      </div>

      {/* Add project form */}
      {showAddProject && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name..."
            onKeyDown={(e) => e.key === "Enter" && addCustomProject()}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#080810",
              border: "1px solid #2a2a3e",
              borderRadius: "6px",
              color: "#e0e0e8",
              fontSize: "12px",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={addCustomProject}
            disabled={!newProjectName.trim()}
            style={{
              padding: "8px 16px",
              background: newProjectName.trim() ? "#00ff8822" : "#1a1a2e",
              border: `1px solid ${newProjectName.trim() ? "#00ff8844" : "#2a2a3e"}`,
              borderRadius: "6px",
              color: newProjectName.trim() ? "#00ff88" : "#666",
              cursor: newProjectName.trim() ? "pointer" : "not-allowed",
              fontSize: "11px",
              fontFamily: "inherit",
            }}
          >
            Add
          </button>
        </div>
      )}

      <ProgressBar
        items={allProjects.map((uc) => getProjectProgress(uc.app))}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {allProjects.map((uc) => {
          const status = projectStatuses[uc.app] || "Not Started";
          const isExpanded = expandedProject === uc.app;
          const note = projectNotes[uc.app] || "";
          const approachData = APPROACHES.find((a) => a.id === uc.approach);
          const subtasks = getSubtasks(uc.app);
          const urls = getUrls(uc.app);
          const subtasksDone = subtasks.filter((s) => s.done).length;

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
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px 20px",
                  cursor: "pointer",
                }}
                onClick={() => setExpandedProject(isExpanded ? null : uc.app)}
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
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#e0e0e8", fontFamily: "inherit" }}>
                      {uc.app}
                    </span>
                    {approachData && (
                      <span style={{ fontSize: "10px", color: approachData.color, background: approachData.color + "15", padding: "2px 8px", borderRadius: "8px" }}>
                        {approachData.title}
                      </span>
                    )}
                    {subtasks.length > 0 && (
                      <span style={{ fontSize: "10px", color: "#999", background: "#1a1a2e", padding: "2px 8px", borderRadius: "8px" }}>
                        {subtasksDone}/{subtasks.length} tasks
                      </span>
                    )}
                    {uc.custom && (
                      <span style={{ fontSize: "10px", color: "#555", background: "#1a1a2e", padding: "2px 6px", borderRadius: "8px" }}>
                        custom
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: "#888", lineHeight: 1.5, margin: "4px 0 0" }}>
                    {uc.idea}
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
                  <StatusBadge status={status} onClick={() => cycleStatus(uc.app)} />
                </div>
                <span style={{ color: "#999", fontSize: "14px", flexShrink: 0 }}>
                  {isExpanded ? "\u2212" : "+"}
                </span>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: "0 20px 16px", borderTop: "1px solid #1a1a2e" }}>
                  {/* Subtasks */}
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ fontSize: "10px", color: "#999", letterSpacing: "1px", marginBottom: "6px" }}>
                      SUBTASKS
                    </div>
                    {subtasks.map((st) => (
                      <div key={st.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
                        <input
                          type="checkbox"
                          checked={st.done}
                          onChange={() => toggleSubtask(uc.app, st.id)}
                          style={{ accentColor: "#00ff88", cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "12px", color: st.done ? "#555" : "#c8c8d0", textDecoration: st.done ? "line-through" : "none", flex: 1 }}>
                          {st.text}
                        </span>
                        <button
                          onClick={() => removeSubtask(uc.app, st.id)}
                          style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "14px", fontFamily: "inherit", padding: "0 4px" }}
                          aria-label={`Remove subtask: ${st.text}`}
                        >
                          x
                        </button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                      <input
                        type="text"
                        value={newSubtaskText[uc.app] || ""}
                        onChange={(e) => setNewSubtaskText({ ...newSubtaskText, [uc.app]: e.target.value })}
                        placeholder="Add subtask..."
                        onKeyDown={(e) => e.key === "Enter" && addSubtask(uc.app)}
                        style={{ flex: 1, padding: "6px 10px", background: "#080810", border: "1px solid #2a2a3e", borderRadius: "6px", color: "#c8c8d0", fontSize: "11px", fontFamily: "inherit", outline: "none" }}
                      />
                      <button
                        onClick={() => addSubtask(uc.app)}
                        style={{ padding: "6px 10px", background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: "6px", color: "#888", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Target URLs */}
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ fontSize: "10px", color: "#999", letterSpacing: "1px", marginBottom: "6px" }}>
                      TARGET URLS
                    </div>
                    {/* Default targets */}
                    {(uc.targets || []).map((t) => (
                      <span key={t} style={{ display: "inline-block", padding: "4px 10px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: "6px", fontSize: "11px", color: "#888", marginRight: "6px", marginBottom: "4px" }}>
                        {t}
                      </span>
                    ))}
                    {/* Custom URLs */}
                    {urls.map((u) => (
                      <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "3px 0" }}>
                        <span style={{ fontSize: "11px", color: "#00d4ff", background: "#00d4ff10", padding: "3px 8px", borderRadius: "4px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u.url}
                        </span>
                        <button
                          onClick={() => removeUrl(uc.app, u.id)}
                          style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "14px", fontFamily: "inherit", padding: "0 4px" }}
                          aria-label={`Remove URL: ${u.url}`}
                        >
                          x
                        </button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                      <input
                        type="text"
                        value={newUrlText[uc.app] || ""}
                        onChange={(e) => setNewUrlText({ ...newUrlText, [uc.app]: e.target.value })}
                        placeholder="https://..."
                        onKeyDown={(e) => e.key === "Enter" && addUrl(uc.app)}
                        style={{ flex: 1, padding: "6px 10px", background: "#080810", border: "1px solid #2a2a3e", borderRadius: "6px", color: "#c8c8d0", fontSize: "11px", fontFamily: "inherit", outline: "none" }}
                      />
                      <button
                        onClick={() => addUrl(uc.app)}
                        style={{ padding: "6px 10px", background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: "6px", color: "#888", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginTop: "12px" }}>
                    <label htmlFor={`notes-${uc.app}`} style={{ display: "block", fontSize: "10px", color: "#999", letterSpacing: "1px", marginBottom: "6px" }}>
                      NOTES
                    </label>
                    <textarea
                      id={`notes-${uc.app}`}
                      value={note}
                      onChange={(e) => updateNote(uc.app, e.target.value)}
                      placeholder="Add notes about this project's scraping needs..."
                      style={{ width: "100%", minHeight: "80px", padding: "10px 12px", background: "#080810", border: "1px solid #2a2a3e", borderRadius: "8px", color: "#c8c8d0", fontSize: "12px", fontFamily: "inherit", lineHeight: 1.6, resize: "vertical", outline: "none" }}
                      onFocus={(e) => (e.target.style.borderColor = "#00ff8844")}
                      onBlur={(e) => (e.target.style.borderColor = "#2a2a3e")}
                    />
                  </div>

                  {/* Delete custom project */}
                  {uc.custom && (
                    <div style={{ marginTop: "12px", textAlign: "right" }}>
                      <button
                        onClick={() => removeCustomProject(uc.app)}
                        style={{ padding: "5px 12px", background: "#ff444422", border: "1px solid #ff444444", borderRadius: "6px", color: "#ff4444", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}
                      >
                        Delete Project
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
