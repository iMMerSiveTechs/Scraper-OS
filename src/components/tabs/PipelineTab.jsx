import { useState } from "react";
import { PIPELINE_STEPS } from "../../data/pipeline";
import { generatePipelineCode } from "../../data/pipelineTemplates";
import { CodeBlock } from "../ui";

export function PipelineTab({ pipelineConfig, setPipelineConfig }) {
  const [expandedStep, setExpandedStep] = useState(null);
  const [pipelineName, setPipelineName] = useState("my-scraper");
  const [targetUrl, setTargetUrl] = useState("");
  const [showCode, setShowCode] = useState(false);

  const togglePipelineTool = (step, tool) => {
    const current = pipelineConfig.steps[step] || [];
    const updated = current.includes(tool)
      ? current.filter((t) => t !== tool)
      : [...current, tool];
    setPipelineConfig({
      ...pipelineConfig,
      steps: { ...pipelineConfig.steps, [step]: updated },
    });
  };

  const generatePipelineJSON = () => {
    const config = {
      name: pipelineName,
      schedule: pipelineConfig.schedule,
      targetUrl: targetUrl || undefined,
      steps: PIPELINE_STEPS.map((s) => ({
        name: s.title.toLowerCase(),
        tools: pipelineConfig.steps[s.step] || [],
        output: s.output,
      })),
    };
    return JSON.stringify(config, null, 2);
  };

  const generatedCode = generatePipelineCode(pipelineConfig, pipelineName, targetUrl);

  return (
    <div>
      <div
        style={{
          fontSize: "13px",
          color: "#999",
          marginBottom: "20px",
          lineHeight: 1.6,
        }}
      >
        Configure your pipeline. Select tools for each step, then export
        the config.
      </div>

      {/* Schedule selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          fontSize: "12px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#999" }}>Schedule:</span>
        {["hourly", "daily", "weekly", "manual"].map((s) => (
          <button
            key={s}
            onClick={() =>
              setPipelineConfig({ ...pipelineConfig, schedule: s })
            }
            aria-pressed={pipelineConfig.schedule === s}
            style={{
              padding: "4px 12px",
              background:
                pipelineConfig.schedule === s ? "#00ff8822" : "#1a1a2e",
              border: `1px solid ${pipelineConfig.schedule === s ? "#00ff8844" : "#2a2a3e"}`,
              borderRadius: "6px",
              color: pipelineConfig.schedule === s ? "#00ff88" : "#888",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "inherit",
              textTransform: "capitalize",
              transition: "all 0.2s",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {PIPELINE_STEPS.map((s) => {
          const isExpanded = expandedStep === s.step;
          const selectedTools = pipelineConfig.steps[s.step] || [];

          return (
            <div
              key={s.step}
              style={{
                background: isExpanded ? "#141428" : "#0e0e18",
                border: `1px solid ${isExpanded ? "#00ff8844" : "#1a1a2e"}`,
                borderRadius: "10px",
                overflow: "hidden",
                transition: "all 0.2s",
              }}
            >
              <button
                onClick={() =>
                  setExpandedStep(isExpanded ? null : s.step)
                }
                aria-expanded={isExpanded}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  cursor: "pointer",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "#1a1a2e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      flexShrink: 0,
                    }}
                    role="img"
                    aria-hidden="true"
                  >
                    {s.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#00ff88",
                          fontFamily: "inherit",
                        }}
                      >
                        {String(s.step).padStart(2, "0")}
                      </span>
                      <span
                        style={{
                          fontSize: "14px",
                          color: "#e0e0e8",
                          fontWeight: 600,
                          fontFamily: "inherit",
                        }}
                      >
                        {s.title}
                      </span>
                      {selectedTools.length > 0 && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#00ff88",
                            background: "#00ff8815",
                            padding: "2px 8px",
                            borderRadius: "8px",
                          }}
                        >
                          {selectedTools.length} selected
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: "#999", fontSize: "14px" }}>
                    {isExpanded ? "\u2212" : "+"}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div
                  style={{
                    padding: "0 20px 16px",
                    borderTop: "1px solid #1a1a2e",
                  }}
                >
                  <p
                    style={{
                      color: "#888",
                      fontSize: "12px",
                      lineHeight: 1.7,
                      margin: "12px 0",
                    }}
                  >
                    {s.desc}
                  </p>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#999",
                      letterSpacing: "1px",
                      marginBottom: "8px",
                    }}
                  >
                    SELECT TOOLS:
                  </div>
                  <div
                    role="group"
                    aria-label={`Tools for ${s.title} step`}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    {s.tools.map((tool) => {
                      const isSelected = selectedTools.includes(tool);
                      return (
                        <button
                          key={tool}
                          onClick={() => togglePipelineTool(s.step, tool)}
                          aria-pressed={isSelected}
                          style={{
                            padding: "5px 12px",
                            background: isSelected
                              ? "#00ff8822"
                              : "#0a0a0f",
                            border: `1px solid ${isSelected ? "#00ff8844" : "#2a2a3e"}`,
                            borderRadius: "6px",
                            color: isSelected ? "#00ff88" : "#888",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontFamily: "inherit",
                            transition: "all 0.2s",
                          }}
                        >
                          {isSelected ? "+ " : ""}{tool}
                        </button>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "11px",
                      color: "#999",
                    }}
                  >
                    Output: {s.output}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pipeline config inputs */}
      <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "10px", color: "#999", letterSpacing: "1px", marginBottom: "4px" }}>
            PIPELINE NAME
          </label>
          <input
            type="text"
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            placeholder="my-scraper"
            style={{ width: "100%", padding: "8px 12px", background: "#080810", border: "1px solid #2a2a3e", borderRadius: "6px", color: "#e0e0e8", fontSize: "12px", fontFamily: "inherit", outline: "none" }}
          />
        </div>
        <div style={{ flex: "1 1 300px" }}>
          <label style={{ display: "block", fontSize: "10px", color: "#999", letterSpacing: "1px", marginBottom: "4px" }}>
            TARGET URL
          </label>
          <input
            type="text"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.com"
            style={{ width: "100%", padding: "8px 12px", background: "#080810", border: "1px solid #2a2a3e", borderRadius: "6px", color: "#e0e0e8", fontSize: "12px", fontFamily: "inherit", outline: "none" }}
          />
        </div>
      </div>

      {/* Output toggle */}
      <div style={{ marginTop: "16px", display: "flex", gap: "6px", marginBottom: "12px" }}>
        <button
          onClick={() => setShowCode(false)}
          aria-pressed={!showCode}
          style={{
            padding: "5px 14px",
            background: !showCode ? "#a78bfa22" : "#1a1a2e",
            border: `1px solid ${!showCode ? "#a78bfa44" : "#2a2a3e"}`,
            borderRadius: "6px",
            color: !showCode ? "#a78bfa" : "#888",
            cursor: "pointer",
            fontSize: "11px",
            fontFamily: "inherit",
          }}
        >
          Config JSON
        </button>
        <button
          onClick={() => setShowCode(true)}
          aria-pressed={showCode}
          style={{
            padding: "5px 14px",
            background: showCode ? "#00ff8822" : "#1a1a2e",
            border: `1px solid ${showCode ? "#00ff8844" : "#2a2a3e"}`,
            borderRadius: "6px",
            color: showCode ? "#00ff88" : "#888",
            cursor: "pointer",
            fontSize: "11px",
            fontFamily: "inherit",
          }}
        >
          Generated Code
        </button>
      </div>

      {/* Generated output */}
      {showCode ? (
        <CodeBlock
          code={generatedCode}
          label="GENERATED PIPELINE CODE"
          color="#00ff88"
          filename={`${pipelineName || 'pipeline'}.mjs`}
          showDownload
          maxHeight="500px"
        />
      ) : (
        <CodeBlock
          code={generatePipelineJSON()}
          label="PIPELINE CONFIG"
          color="#a78bfa"
          filename="pipeline-config.json"
          showDownload
          maxHeight="300px"
        />
      )}
    </div>
  );
}
