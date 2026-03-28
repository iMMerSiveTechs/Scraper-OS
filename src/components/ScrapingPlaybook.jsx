import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useScraperContext } from "../contexts/ScraperContext";
import { useCustomScrapers } from "../hooks/useCustomScrapers";
import { useSettings } from "../hooks/useSettings";
import { useTriggers } from "../hooks/useTriggers";
import { useFileIngestion } from "../hooks/useFileIngestion";
import { useServerStatus } from "../hooks/useServerStatus";
import { DEFAULT_SANDBOX_CODE } from "../data/defaultSandboxCode";
import { TabErrorBoundary } from "./ErrorBoundary";
import { DataManager } from "./DataManager";
import { SearchOverlay } from "./SearchOverlay";
import { ApproachesTab } from "./tabs/ApproachesTab";
import { PipelineTab } from "./tabs/PipelineTab";
import { ProjectsTab } from "./tabs/ProjectsTab";
import { SandboxTab } from "./tabs/SandboxTab";
import { BuilderTab } from "./tabs/BuilderTab";
import { IntelligenceTab } from "./tabs/IntelligenceTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { USE_CASES } from "../data/useCases";

const DashboardTab = lazy(() =>
  import("./dashboard/DashboardTab").then((m) => ({ default: m.DashboardTab }))
);

const TABS = [
  { id: "dashboard", label: "Dashboard", shortcut: "1" },
  { id: "builder", label: "Builder", shortcut: "2", color: "#00d4ff" },
  { id: "intelligence", label: "Intelligence", shortcut: "3", color: "#a78bfa" },
  { id: "approaches", label: "Approaches", shortcut: "4" },
  { id: "pipeline", label: "Pipeline", shortcut: "5" },
  { id: "usecases", label: "Projects", shortcut: "6" },
  { id: "sandbox", label: "Sandbox", shortcut: "7" },
  { id: "settings", label: "Settings", shortcut: "8" },
];

export default function ScrapingPlaybook() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showDataManager, setShowDataManager] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const scraper = useScraperContext();
  const customScrapers = useCustomScrapers();
  const { settings, updateSetting, updateSettings, resetSettings, hasAIKey } = useSettings();
  const triggers = useTriggers();
  const fileIngestion = useFileIngestion();
  const serverStatus = useServerStatus();

  // Merge file-ingested items into results for intelligence
  const allResults = useMemo(() => {
    return [...scraper.results, ...fileIngestion.ingestedItems];
  }, [scraper.results, fileIngestion.ingestedItems]);

  // Evaluate triggers when new results arrive
  const prevResultsLenRef = useRef(scraper.results.length);
  useEffect(() => {
    if (scraper.results.length > prevResultsLenRef.current && triggers.triggers.length > 0) {
      triggers.evaluate(scraper.results);
    }
    prevResultsLenRef.current = scraper.results.length;
  }, [scraper.results.length, triggers]);

  // Persistent state
  const [sandboxCode, setSandboxCode] = useLocalStorage(
    "scraper-os-sandbox",
    DEFAULT_SANDBOX_CODE
  );
  const [projectStatuses, setProjectStatuses] = useLocalStorage(
    "scraper-os-statuses",
    {}
  );
  const [projectNotes, setProjectNotes] = useLocalStorage(
    "scraper-os-notes",
    {}
  );
  const [pipelineConfig, setPipelineConfig] = useLocalStorage(
    "scraper-os-pipeline",
    { steps: {}, schedule: "daily" }
  );
  const [projectSubtasks, setProjectSubtasks] = useLocalStorage(
    "scraper-os-subtasks",
    {}
  );
  const [projectUrls, setProjectUrls] = useLocalStorage(
    "scraper-os-urls",
    {}
  );
  const [customProjects, setCustomProjects] = useLocalStorage(
    "scraper-os-custom-projects",
    []
  );

  // Build project list for Intelligence tab
  const allProjects = useMemo(() => [...USE_CASES, ...(customProjects || [])], [customProjects]);

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    { key: "k", meta: true, handler: () => setShowSearch(true) },
    { key: "e", meta: true, handler: () => setShowDataManager(true) },
    { key: "?", handler: () => setShowShortcuts((s) => !s) },
    { key: "1", alt: true, handler: () => setActiveTab("dashboard") },
    { key: "2", alt: true, handler: () => setActiveTab("builder") },
    { key: "3", alt: true, handler: () => setActiveTab("intelligence") },
    { key: "4", alt: true, handler: () => setActiveTab("approaches") },
    { key: "5", alt: true, handler: () => setActiveTab("pipeline") },
    { key: "6", alt: true, handler: () => setActiveTab("usecases") },
    { key: "7", alt: true, handler: () => setActiveTab("sandbox") },
    { key: "8", alt: true, handler: () => setActiveTab("settings") },
    { key: "Escape", handler: () => { setShowSearch(false); setShowDataManager(false); setShowShortcuts(false); } },
  ], []);

  useKeyboardShortcuts(shortcuts);

  const handleTabKeyDown = (e) => {
    const tabIds = TABS.map((t) => t.id);
    const currentIndex = tabIds.indexOf(activeTab);
    let newIndex;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        newIndex = (currentIndex + 1) % tabIds.length;
        setActiveTab(tabIds[newIndex]);
        break;
      case "ArrowLeft":
        e.preventDefault();
        newIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
        setActiveTab(tabIds[newIndex]);
        break;
      case "Home":
        e.preventDefault();
        setActiveTab(tabIds[0]);
        break;
      case "End":
        e.preventDefault();
        setActiveTab(tabIds[tabIds.length - 1]);
        break;
    }
  };

  return (
    <div
      style={{
        background: "#0a0a0f",
        color: "#e0e0e8",
        minHeight: "100vh",
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "32px 24px 20px",
          borderBottom: "1px solid #1a1a2e",
          background: "linear-gradient(180deg, #0f0f1a 0%, #0a0a0f 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "4px",
                color: "#00ff88",
                textTransform: "uppercase",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Scraper OS
              {scraper.isDemo && (
                <span style={{ fontSize: "9px", color: "#ffaa00", background: "#ffaa0022", padding: "1px 6px", borderRadius: "4px", letterSpacing: "1px" }}>
                  DEMO
                </span>
              )}
              {hasAIKey && (
                <span style={{ fontSize: "9px", color: "#00d4ff", background: "#00d4ff22", padding: "1px 6px", borderRadius: "4px", letterSpacing: "1px" }}>
                  AI
                </span>
              )}
              <span
                title={serverStatus.online ? "Server online — all scrapers available" : "Server offline — run: npm run dev"}
                style={{
                  width: "7px", height: "7px", borderRadius: "50%",
                  background: serverStatus.online ? "#00ff88" : "#ff4444",
                  display: "inline-block", marginLeft: "2px",
                  boxShadow: serverStatus.online ? "0 0 6px #00ff8866" : "none",
                }}
              />
            </div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 700,
                margin: 0,
                fontFamily: "'Space Grotesk', sans-serif",
                background: "linear-gradient(135deg, #fff 0%, #888 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Scraping Intelligence Platform
            </h1>
          </div>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0, marginTop: "8px" }}>
            <button
              onClick={() => setShowSearch(true)}
              aria-label="Search (Ctrl+K)"
              title="Search (Ctrl+K)"
              style={{
                padding: "6px 10px",
                background: "#1a1a2e",
                border: "1px solid #2a2a3e",
                borderRadius: "6px",
                color: "#999",
                cursor: "pointer",
                fontSize: "11px",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              Search
            </button>
            <button
              onClick={() => setShowDataManager(true)}
              aria-label="Data Manager (Ctrl+E)"
              title="Export / Import / Backup (Ctrl+E)"
              style={{
                padding: "6px 10px",
                background: "#1a1a2e",
                border: "1px solid #2a2a3e",
                borderRadius: "6px",
                color: "#999",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              &#9881;
            </button>
          </div>
        </div>
        <p style={{ color: "#999", fontSize: "13px", marginTop: "6px" }}>
          {scraper.results.length === 0 && scraper.isDemo
            ? 'Click "run" on any scraper below to get started'
            : !hasAIKey
              ? 'Add an API key in Settings to unlock AI-powered intelligence'
              : 'Build scrapers · AI intelligence · Track projects · Action triggers'}
          {!serverStatus.online && (
            <span style={{ color: "#ff6b6b", marginLeft: "8px", fontSize: "11px" }}>
              · Server offline
            </span>
          )}
        </p>
      </div>

      {/* Modals */}
      {showDataManager && (
        <DataManager onClose={() => setShowDataManager(false)} />
      )}
      {showSearch && (
        <SearchOverlay
          onClose={() => setShowSearch(false)}
          onNavigate={setActiveTab}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      {showShortcuts && (
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
          onClick={() => setShowShortcuts(false)}
        >
          <div
            style={{
              background: "#0e0e18",
              border: "1px solid #1a1a2e",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", fontFamily: "inherit" }}>
              Keyboard Shortcuts
            </h3>
            {[
              ["Ctrl+K", "Search"],
              ["Ctrl+E", "Data Manager"],
              ["Alt+1-8", "Switch tabs"],
              ["?", "Toggle this help"],
              ["Esc", "Close modals"],
              ["Arrow keys", "Navigate tabs (when focused)"],
            ].map(([key, desc]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "12px", borderBottom: "1px solid #12121e" }}>
                <span style={{ color: "#888" }}>{desc}</span>
                <code style={{ color: "#00ff88", background: "#00ff8810", padding: "1px 6px", borderRadius: "3px", fontSize: "11px" }}>{key}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Scraper OS sections"
        onKeyDown={handleTabKeyDown}
        style={{
          display: "flex",
          gap: "0",
          borderBottom: "1px solid #1a1a2e",
          padding: "0 24px",
          background: "#0c0c14",
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const tabColor = tab.color || "#00ff88";
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 16px",
                background: "none",
                border: "none",
                borderBottom: isActive
                  ? `2px solid ${tabColor}`
                  : "2px solid transparent",
                color: isActive ? tabColor : "#999",
                cursor: "pointer",
                fontSize: "11px",
                fontFamily: "inherit",
                letterSpacing: "1px",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                position: "relative",
              }}
            >
              {tab.label}
              {tab.id === "dashboard" && scraper.alerts.filter((a) => !a.read).length > 0 && (
                <span style={{
                  position: "absolute",
                  top: "8px",
                  right: "4px",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#ff4444",
                }} />
              )}
              {tab.id === "builder" && customScrapers.scrapers.length > 0 && (
                <span style={{
                  marginLeft: "6px",
                  fontSize: "9px",
                  color: "#555",
                  background: "#1a1a2e",
                  padding: "1px 5px",
                  borderRadius: "6px",
                }}>
                  {customScrapers.scrapers.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        {TABS.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
          >
            {activeTab === tab.id && (
              <TabErrorBoundary>
                {tab.id === "dashboard" && (
                  <Suspense fallback={<div style={{ color: "#555", fontSize: "13px", padding: "40px 0", textAlign: "center" }}>Loading dashboard...</div>}>
                    <DashboardTab
                      runs={scraper.runs}
                      results={scraper.results}
                      alerts={scraper.alerts}
                      stats={scraper.stats}
                      isDemo={scraper.isDemo}
                      loading={scraper.loading}
                      onRefresh={scraper.runAllScrapers}
                      onRunScraper={scraper.runScraper}
                      onDismissAlert={scraper.dismissAlert}
                      customScrapers={customScrapers.scrapers}
                      hasAIKey={hasAIKey}
                      onNavigate={setActiveTab}
                    />
                  </Suspense>
                )}
                {tab.id === "builder" && (
                  <BuilderTab customScrapers={customScrapers} fileIngestion={fileIngestion} />
                )}
                {tab.id === "intelligence" && (
                  <IntelligenceTab
                    results={allResults}
                    settings={settings}
                    projects={allProjects}
                    projectNotes={projectNotes}
                    onNavigate={setActiveTab}
                  />
                )}
                {tab.id === "approaches" && <ApproachesTab />}
                {tab.id === "pipeline" && (
                  <PipelineTab
                    pipelineConfig={pipelineConfig}
                    setPipelineConfig={setPipelineConfig}
                  />
                )}
                {tab.id === "usecases" && (
                  <ProjectsTab
                    projectStatuses={projectStatuses}
                    setProjectStatuses={setProjectStatuses}
                    projectNotes={projectNotes}
                    setProjectNotes={setProjectNotes}
                    projectSubtasks={projectSubtasks}
                    setProjectSubtasks={setProjectSubtasks}
                    projectUrls={projectUrls}
                    setProjectUrls={setProjectUrls}
                    customProjects={customProjects}
                    setCustomProjects={setCustomProjects}
                  />
                )}
                {tab.id === "sandbox" && (
                  <SandboxTab
                    sandboxCode={sandboxCode}
                    setSandboxCode={setSandboxCode}
                  />
                )}
                {tab.id === "settings" && (
                  <SettingsTab
                    settings={settings}
                    updateSetting={updateSetting}
                    updateSettings={updateSettings}
                    resetSettings={resetSettings}
                    triggers={triggers}
                  />
                )}
              </TabErrorBoundary>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
