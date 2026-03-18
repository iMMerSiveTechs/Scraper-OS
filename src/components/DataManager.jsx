import { useState, useRef } from "react";
import { downloadExport, validateImport, importData, resetAllData, getDataStats } from "../utils/dataManager";

export function DataManager({ onClose }) {
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState(null);
  const [resetConfirm, setResetConfirm] = useState("");
  const [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  const stats = getDataStats();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        const validation = validateImport(json);
        if (validation.valid) {
          setImportPreview({ json, ...validation });
          setImportError(null);
        } else {
          setImportError(validation.error);
          setImportPreview(null);
        }
      } catch {
        setImportError("Could not parse file as JSON.");
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!importPreview) return;
    importData(importPreview.json);
    setMessage("Imported successfully. Reload to see changes.");
    setImportPreview(null);
  };

  const handleReset = () => {
    if (resetConfirm !== "DELETE") return;
    resetAllData();
    setMessage("All data cleared. Reload to start fresh.");
    setResetConfirm("");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0e0e18",
          border: "1px solid #1a1a2e",
          borderRadius: "12px",
          maxWidth: "500px",
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          padding: "24px",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Data Manager"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, fontFamily: "inherit" }}>Data Manager</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: "18px", fontFamily: "inherit" }}
            aria-label="Close"
          >
            x
          </button>
        </div>

        {message && (
          <div style={{ padding: "10px 14px", background: "#00ff8822", border: "1px solid #00ff8844", borderRadius: "8px", fontSize: "12px", color: "#00ff88", marginBottom: "16px" }}>
            {message}
            <button
              onClick={() => window.location.reload()}
              style={{ marginLeft: "10px", padding: "2px 8px", background: "#00ff8833", border: "1px solid #00ff8855", borderRadius: "4px", color: "#00ff88", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}
            >
              Reload Now
            </button>
          </div>
        )}

        {/* Stats */}
        <div style={{ fontSize: "11px", color: "#999", marginBottom: "20px" }}>
          {stats.keyCount} items stored · {stats.totalSizeKB} KB used
        </div>

        {/* Export */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", color: "#00ff88", letterSpacing: "2px", marginBottom: "8px" }}>EXPORT</div>
          <button
            onClick={downloadExport}
            style={{ padding: "8px 16px", background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: "6px", color: "#e0e0e8", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", width: "100%" }}
          >
            Download Backup (.json)
          </button>
        </div>

        {/* Import */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", color: "#a78bfa", letterSpacing: "2px", marginBottom: "8px" }}>IMPORT</div>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={{ padding: "8px 16px", background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: "6px", color: "#e0e0e8", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", width: "100%" }}
          >
            Select Backup File
          </button>
          {importError && (
            <div style={{ marginTop: "8px", fontSize: "11px", color: "#ff4444" }}>{importError}</div>
          )}
          {importPreview && (
            <div style={{ marginTop: "8px", padding: "10px", background: "#0a0a0f", borderRadius: "6px", fontSize: "11px" }}>
              <div style={{ color: "#aaa", marginBottom: "6px" }}>Preview:</div>
              <div style={{ color: "#999" }}>
                {importPreview.stats.hasSandbox && <div>Sandbox code</div>}
                {importPreview.stats.projects > 0 && <div>{importPreview.stats.projects} project statuses</div>}
                {importPreview.stats.hasNotes && <div>Project notes</div>}
                {importPreview.stats.hasPipeline && <div>Pipeline config</div>}
              </div>
              <button
                onClick={handleImport}
                style={{ marginTop: "8px", padding: "6px 14px", background: "#a78bfa22", border: "1px solid #a78bfa44", borderRadius: "6px", color: "#a78bfa", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}
              >
                Import (overwrites current data)
              </button>
            </div>
          )}
        </div>

        {/* Reset */}
        <div>
          <div style={{ fontSize: "11px", color: "#ff4444", letterSpacing: "2px", marginBottom: "8px" }}>RESET</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              style={{ flex: 1, padding: "8px 12px", background: "#0a0a0f", border: "1px solid #2a2a3e", borderRadius: "6px", color: "#e0e0e8", fontSize: "12px", fontFamily: "inherit", outline: "none" }}
            />
            <button
              onClick={handleReset}
              disabled={resetConfirm !== "DELETE"}
              style={{ padding: "8px 16px", background: resetConfirm === "DELETE" ? "#ff444422" : "#1a1a2e", border: `1px solid ${resetConfirm === "DELETE" ? "#ff444444" : "#2a2a3e"}`, borderRadius: "6px", color: resetConfirm === "DELETE" ? "#ff4444" : "#666", cursor: resetConfirm === "DELETE" ? "pointer" : "not-allowed", fontSize: "12px", fontFamily: "inherit" }}
            >
              Reset All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
