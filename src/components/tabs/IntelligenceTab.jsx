import { useState, useCallback } from 'react';

const DIGEST_STYLES = [
  { id: 'executive', label: 'Executive', desc: 'High-level summary for decision makers' },
  { id: 'technical', label: 'Technical', desc: 'Deep-dive into tools, repos, and tech trends' },
  { id: 'trends', label: 'Trend Radar', desc: 'Focus on emerging patterns and signals' },
];

const SIGNAL_COLORS = {
  strong: '#00ff88',
  emerging: '#ffaa00',
  weak: '#888',
};

const PRIORITY_COLORS = {
  high: '#ff6b35',
  medium: '#ffaa00',
  low: '#888',
};

export function IntelligenceTab({ results, settings, projects, projectNotes, onNavigate }) {
  const [activeSection, setActiveSection] = useState('briefing');
  const [digest, setDigest] = useState(null);
  const [projectBrief, setProjectBrief] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customResult, setCustomResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasKey = !!(settings?.openaiKey || settings?.anthropicKey);
  const provider = settings?.preferredProvider
    || (settings?.anthropicKey ? 'anthropic' : settings?.openaiKey ? 'openai' : null);
  const apiKey = provider === 'anthropic' ? settings?.anthropicKey : settings?.openaiKey;

  const sections = [
    { id: 'briefing', label: 'Daily Briefing' },
    { id: 'projects', label: 'Project Intel' },
    { id: 'analysis', label: 'Custom Analysis' },
    { id: 'signals', label: 'Signal Map' },
  ];

  const handleGenerateDigest = useCallback(async () => {
    if (!hasKey || !results?.length) return;
    setLoading(true);
    setError(null);
    try {
      const { generateDigest } = await import('../../services/intelligence.js');
      const result = await generateDigest(provider, apiKey, results, {
        model: provider === 'anthropic' ? settings?.anthropicModel : settings?.openaiModel,
      });
      setDigest(result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [hasKey, results, provider, apiKey, settings]);

  const handleProjectBrief = useCallback(async (project) => {
    if (!hasKey || !results?.length) return;
    setLoading(true);
    setError(null);
    setSelectedProject(project);
    try {
      const { generateProjectBrief } = await import('../../services/intelligence.js');
      const enrichedProject = {
        ...project,
        notes: projectNotes?.[project.app] || '',
      };
      const result = await generateProjectBrief(provider, apiKey, enrichedProject, results, {
        model: provider === 'anthropic' ? settings?.anthropicModel : settings?.openaiModel,
      });
      setProjectBrief(result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [hasKey, results, provider, apiKey, settings, projectNotes]);

  const handleCustomAnalysis = useCallback(async () => {
    if (!hasKey || !customPrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { customAnalysis } = await import('../../services/intelligence.js');
      const result = await customAnalysis(provider, apiKey, customPrompt, results || [], {
        model: provider === 'anthropic' ? settings?.anthropicModel : settings?.openaiModel,
      });
      setCustomResult(result);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [hasKey, customPrompt, provider, apiKey, results, settings]);

  // No API key state
  if (!hasKey) {
    return <NoKeyState onNavigate={onNavigate} />;
  }

  return (
    <div>
      {/* Section Nav */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding: '6px 16px', borderRadius: '6px', cursor: 'pointer',
              background: activeSection === s.id ? '#00d4ff18' : '#1a1a2e',
              border: `1px solid ${activeSection === s.id ? '#00d4ff44' : '#2a2a3e'}`,
              color: activeSection === s.id ? '#00d4ff' : '#888',
              fontSize: '11px', fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            {s.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#555' }}>
            {results?.length || 0} items · {provider}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#ff444418', border: '1px solid #ff444433', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      {/* Daily Briefing */}
      {activeSection === 'briefing' && (
        <BriefingSection
          digest={digest}
          loading={loading}
          onGenerate={handleGenerateDigest}
          resultCount={results?.length || 0}
        />
      )}

      {/* Project Intel */}
      {activeSection === 'projects' && (
        <ProjectIntelSection
          projects={projects}
          projectNotes={projectNotes}
          selectedProject={selectedProject}
          projectBrief={projectBrief}
          loading={loading}
          onSelectProject={handleProjectBrief}
        />
      )}

      {/* Custom Analysis */}
      {activeSection === 'analysis' && (
        <CustomAnalysisSection
          prompt={customPrompt}
          setPrompt={setCustomPrompt}
          result={customResult}
          loading={loading}
          onAnalyze={handleCustomAnalysis}
        />
      )}

      {/* Signal Map */}
      {activeSection === 'signals' && (
        <SignalMapSection results={results} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function BriefingSection({ digest, loading, onGenerate, resultCount }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#999' }}>
          AI-powered intelligence briefing from {resultCount} scraped items.
        </div>
        <button onClick={onGenerate} disabled={loading || !resultCount} style={actionBtnStyle(loading)}>
          {loading ? 'Generating...' : digest ? 'Regenerate' : 'Generate Briefing'}
        </button>
      </div>

      {!digest && !loading && (
        <div style={emptyStyle}>
          <div style={{ fontSize: '28px', opacity: 0.3, marginBottom: '12px' }}>&#9889;</div>
          <div>Click <span style={{ color: '#00d4ff' }}>Generate Briefing</span> to analyze your scraped data.</div>
        </div>
      )}

      {digest && !digest.parseError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary */}
          <DigestCard title="EXECUTIVE SUMMARY" color="#00d4ff">
            <div style={{ fontSize: '13px', color: '#e0e0e8', lineHeight: 1.7 }}>{digest.summary}</div>
            {digest.sentiment && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#888' }}>
                Sentiment: <span style={{ color: digest.sentiment.overall === 'positive' ? '#00ff88' : digest.sentiment.overall === 'negative' ? '#ff4444' : '#ffaa00' }}>
                  {digest.sentiment.overall}
                </span>
                {digest.sentiment.breakdown && ` — ${digest.sentiment.breakdown}`}
              </div>
            )}
          </DigestCard>

          {/* Trends */}
          {digest.trends?.length > 0 && (
            <DigestCard title="TRENDING SIGNALS" color="#ffaa00">
              {digest.trends.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < digest.trends.length - 1 ? '1px solid #12121e' : 'none' }}>
                  <span style={{ fontSize: '10px', color: SIGNAL_COLORS[t.signal] || '#888', background: (SIGNAL_COLORS[t.signal] || '#888') + '18', padding: '2px 8px', borderRadius: '8px', height: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
                    {t.signal}
                  </span>
                  <div>
                    <div style={{ fontSize: '12px', color: '#e0e0e8', fontWeight: 500 }}>{t.topic}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{t.detail}</div>
                    {t.sources?.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        {t.sources.map((s) => (
                          <span key={s} style={{ fontSize: '9px', color: '#666', background: '#1a1a2e', padding: '1px 6px', borderRadius: '4px' }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </DigestCard>
          )}

          {/* Notable */}
          {digest.notable?.length > 0 && (
            <DigestCard title="NOTABLE ITEMS" color="#00ff88">
              {digest.notable.map((n, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < digest.notable.length - 1 ? '1px solid #12121e' : 'none' }}>
                  <div style={{ fontSize: '12px', color: '#e0e0e8' }}>
                    {n.url ? <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: '#e0e0e8', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.color = '#00ff88'} onMouseLeave={(e) => e.target.style.color = '#e0e0e8'}>{n.title}</a> : n.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{n.why}</div>
                  <span style={{ fontSize: '9px', color: '#666', background: '#1a1a2e', padding: '1px 6px', borderRadius: '4px' }}>{n.source}</span>
                </div>
              ))}
            </DigestCard>
          )}

          {/* Cross Source */}
          {digest.crossSource?.length > 0 && (
            <DigestCard title="CROSS-SOURCE INTELLIGENCE" color="#a78bfa">
              {digest.crossSource.map((cs, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < digest.crossSource.length - 1 ? '1px solid #12121e' : 'none' }}>
                  <div style={{ fontSize: '12px', color: '#e0e0e8', fontWeight: 500 }}>{cs.topic}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{cs.insight}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    {cs.sources?.map((s) => (
                      <span key={s} style={{ fontSize: '9px', color: '#a78bfa', background: '#a78bfa18', padding: '1px 6px', borderRadius: '4px' }}>{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </DigestCard>
          )}

          {/* Action Items */}
          {digest.actionItems?.length > 0 && (
            <DigestCard title="RECOMMENDED ACTIONS" color="#ff6b35">
              {digest.actionItems.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < digest.actionItems.length - 1 ? '1px solid #12121e' : 'none' }}>
                  <span style={{ fontSize: '10px', color: PRIORITY_COLORS[a.priority] || '#888', background: (PRIORITY_COLORS[a.priority] || '#888') + '18', padding: '2px 8px', borderRadius: '8px', height: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
                    {a.priority}
                  </span>
                  <div>
                    <div style={{ fontSize: '12px', color: '#e0e0e8' }}>{a.action}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{a.reason}</div>
                  </div>
                </div>
              ))}
            </DigestCard>
          )}
        </div>
      )}

      {/* Raw fallback */}
      {digest?.parseError && (
        <DigestCard title="RAW ANALYSIS" color="#888">
          <pre style={{ fontSize: '11px', color: '#c8c8d0', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {digest.raw}
          </pre>
        </DigestCard>
      )}
    </div>
  );
}

function ProjectIntelSection({ projects, projectNotes, selectedProject, projectBrief, loading, onSelectProject }) {
  const allProjects = projects || [];

  return (
    <div>
      <div style={{ fontSize: '13px', color: '#999', marginBottom: '16px', lineHeight: 1.6 }}>
        Select a project to generate a tailored intelligence brief from your scraped data.
      </div>

      {/* Project selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {allProjects.map((p) => (
          <button
            key={p.app}
            onClick={() => onSelectProject(p)}
            disabled={loading}
            style={{
              padding: '8px 14px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              background: selectedProject?.app === p.app ? (p.color || '#00d4ff') + '18' : '#0e0e18',
              border: `1px solid ${selectedProject?.app === p.app ? (p.color || '#00d4ff') + '44' : '#1a1a2e'}`,
              color: selectedProject?.app === p.app ? (p.color || '#00d4ff') : '#888',
              fontSize: '12px', fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            <span style={{ marginRight: '6px' }}>{p.icon}</span>
            {p.app}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '40px 0', textAlign: 'center', fontSize: '12px', color: '#00d4ff', animation: 'pulse 1.5s ease-in-out infinite' }}>
          Synthesizing project brief...
        </div>
      )}

      {!loading && !projectBrief && (
        <div style={emptyStyle}>
          <div style={{ fontSize: '28px', opacity: 0.3, marginBottom: '12px' }}>&#128218;</div>
          <div>Select a project above to generate an intelligence brief.</div>
        </div>
      )}

      {projectBrief && !projectBrief.parseError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Relevance + Briefing */}
          <DigestCard title="PROJECT BRIEFING" color={selectedProject?.color || '#00d4ff'}>
            {projectBrief.relevance && (
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '8px', marginBottom: '8px', display: 'inline-block',
                color: projectBrief.relevance === 'high' ? '#00ff88' : projectBrief.relevance === 'medium' ? '#ffaa00' : '#888',
                background: (projectBrief.relevance === 'high' ? '#00ff88' : projectBrief.relevance === 'medium' ? '#ffaa00' : '#888') + '18',
                textTransform: 'uppercase', letterSpacing: '1px',
              }}>
                {projectBrief.relevance} relevance
              </span>
            )}
            <div style={{ fontSize: '13px', color: '#e0e0e8', lineHeight: 1.7 }}>{projectBrief.briefing}</div>
          </DigestCard>

          {/* Opportunities */}
          {projectBrief.opportunities?.length > 0 && (
            <DigestCard title="OPPORTUNITIES" color="#00ff88">
              {projectBrief.opportunities.map((o, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < projectBrief.opportunities.length - 1 ? '1px solid #12121e' : 'none' }}>
                  <span style={{ fontSize: '10px', color: PRIORITY_COLORS[o.priority] || '#888', background: (PRIORITY_COLORS[o.priority] || '#888') + '18', padding: '2px 8px', borderRadius: '8px', height: 'fit-content', flexShrink: 0 }}>
                    {o.priority}
                  </span>
                  <div>
                    <div style={{ fontSize: '12px', color: '#e0e0e8', fontWeight: 500 }}>{o.title}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{o.detail}</div>
                  </div>
                </div>
              ))}
            </DigestCard>
          )}

          {/* Competitors */}
          {projectBrief.competitors?.length > 0 && (
            <DigestCard title="COMPETITIVE LANDSCAPE" color="#ff6b35">
              {projectBrief.competitors.map((c, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < projectBrief.competitors.length - 1 ? '1px solid #12121e' : 'none' }}>
                  <div style={{ fontSize: '12px', color: '#e0e0e8', fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{c.detail}</div>
                  <span style={{ fontSize: '9px', color: '#666', background: '#1a1a2e', padding: '1px 6px', borderRadius: '4px' }}>{c.source}</span>
                </div>
              ))}
            </DigestCard>
          )}

          {/* Technologies */}
          {projectBrief.technologies?.length > 0 && (
            <DigestCard title="RELEVANT TECHNOLOGIES" color="#a78bfa">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {projectBrief.technologies.map((t, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', background: '#0a0a0f', borderRadius: '8px',
                    border: `1px solid ${t.trending ? '#a78bfa33' : '#1a1a2e'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#e0e0e8', fontWeight: 500 }}>{t.name}</span>
                      {t.trending && (
                        <span style={{ fontSize: '9px', color: '#00ff88', background: '#00ff8818', padding: '1px 6px', borderRadius: '4px' }}>trending</span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '3px' }}>{t.detail}</div>
                  </div>
                ))}
              </div>
            </DigestCard>
          )}

          {/* Synthesized Outline */}
          {projectBrief.outline?.length > 0 && (
            <DigestCard title="SYNTHESIZED OUTLINE" color="#00d4ff">
              {projectBrief.outline.map((section, i) => (
                <div key={i} style={{ marginBottom: i < projectBrief.outline.length - 1 ? '14px' : 0 }}>
                  <div style={{ fontSize: '12px', color: '#e0e0e8', fontWeight: 600, marginBottom: '6px' }}>
                    {i + 1}. {section.section}
                  </div>
                  {section.points?.map((p, j) => (
                    <div key={j} style={{ fontSize: '11px', color: '#888', padding: '2px 0 2px 16px', lineHeight: 1.6 }}>
                      &bull; {p}
                    </div>
                  ))}
                </div>
              ))}
            </DigestCard>
          )}

          {/* Next Steps */}
          {projectBrief.nextSteps?.length > 0 && (
            <DigestCard title="NEXT STEPS" color="#ffaa00">
              {projectBrief.nextSteps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', padding: '6px 0', fontSize: '12px' }}>
                  <span style={{ color: '#ffaa00', fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ color: '#e0e0e8' }}>{step}</span>
                </div>
              ))}
            </DigestCard>
          )}
        </div>
      )}
    </div>
  );
}

function CustomAnalysisSection({ prompt, setPrompt, result, loading, onAnalyze }) {
  const PROMPTS = [
    'What are the top 5 emerging technologies mentioned across all sources?',
    'Identify potential market opportunities based on the trending items.',
    'Compare the sentiment across different sources and explain divergences.',
    'What topics appear in multiple sources? What does this convergence suggest?',
    'Identify the most actionable items for a startup founder.',
  ];

  return (
    <div>
      <div style={{ fontSize: '13px', color: '#999', marginBottom: '16px', lineHeight: 1.6 }}>
        Ask any question about your scraped data. The AI will analyze all recent results.
      </div>

      {/* Quick prompts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => setPrompt(p)}
            style={{
              padding: '4px 10px', background: '#0e0e18', border: '1px solid #1a1a2e',
              borderRadius: '6px', color: '#888', cursor: 'pointer',
              fontSize: '10px', fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            {p.slice(0, 50)}...
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask anything about your scraped data..."
          rows={3}
          style={{
            flex: 1, padding: '10px 12px', background: '#080810',
            border: '1px solid #2a2a3e', borderRadius: '8px',
            color: '#e0e0e8', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.6, resize: 'vertical', outline: 'none',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#00d4ff44')}
          onBlur={(e) => (e.target.style.borderColor = '#2a2a3e')}
        />
      </div>
      <button onClick={onAnalyze} disabled={loading || !prompt.trim()} style={actionBtnStyle(loading)}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>

      {/* Result */}
      {result && (
        <DigestCard title="ANALYSIS" color="#00d4ff" style={{ marginTop: '16px' }}>
          <pre style={{
            fontSize: '12px', color: '#e0e0e8', lineHeight: 1.7,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {result}
          </pre>
        </DigestCard>
      )}
    </div>
  );
}

function SignalMapSection({ results }) {
  // Build signal map from raw data (no AI required)
  const signals = buildSignalMap(results || []);

  return (
    <div>
      <div style={{ fontSize: '13px', color: '#999', marginBottom: '16px', lineHeight: 1.6 }}>
        Automated signal detection across all sources. No API key needed.
      </div>

      {/* Source breakdown */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {signals.sourceCounts.map(({ source, count, color }) => (
          <div key={source} style={{
            padding: '12px 16px', background: '#0e0e18', border: '1px solid #1a1a2e',
            borderLeft: `3px solid ${color}`, borderRadius: '8px', flex: '1 1 120px',
          }}>
            <div style={{ fontSize: '10px', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>{source}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color, fontFamily: "'Space Grotesk', monospace" }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Word frequency */}
      {signals.topTerms.length > 0 && (
        <DigestCard title="TOP TERMS" color="#a78bfa">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {signals.topTerms.map(({ term, count }) => (
              <span key={term} style={{
                padding: '4px 10px', background: '#a78bfa12', border: '1px solid #a78bfa22',
                borderRadius: '6px', fontSize: '11px', color: '#a78bfa',
              }}>
                {term} <span style={{ color: '#666', fontSize: '10px' }}>{count}</span>
              </span>
            ))}
          </div>
        </DigestCard>
      )}

      {/* Timeline sparkline (SVG) */}
      {signals.timeline.length > 1 && (
        <DigestCard title="SCRAPE TIMELINE" color="#00ff88" style={{ marginTop: '16px' }}>
          <Sparkline data={signals.timeline} color="#00ff88" height={60} />
        </DigestCard>
      )}

      {/* Cross-source overlaps (automated) */}
      {signals.crossSource.length > 0 && (
        <DigestCard title="CROSS-SOURCE SIGNALS" color="#ffaa00" style={{ marginTop: '16px' }}>
          {signals.crossSource.map((cs, i) => (
            <div key={i} style={{ padding: '6px 0', borderBottom: i < signals.crossSource.length - 1 ? '1px solid #12121e' : 'none', fontSize: '12px' }}>
              <span style={{ color: '#e0e0e8' }}>{cs.term}</span>
              <span style={{ color: '#666', marginLeft: '8px', fontSize: '10px' }}>
                found in {cs.sources.join(', ')}
              </span>
            </div>
          ))}
        </DigestCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DigestCard({ title, color = '#888', children, style: extraStyle }) {
  return (
    <div style={{
      background: '#0e0e18', border: '1px solid #1a1a2e', borderRadius: '12px',
      overflow: 'hidden', ...extraStyle,
    }}>
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid #1a1a2e', background: '#0c0c14',
        fontSize: '10px', color, letterSpacing: '2px',
      }}>
        {title}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

function NoKeyState({ onNavigate }) {
  return (
    <div style={{
      padding: '60px 24px', textAlign: 'center',
      background: '#0e0e18', border: '1px solid #1a1a2e', borderRadius: '12px',
    }}>
      <div style={{ fontSize: '36px', opacity: 0.3, marginBottom: '16px' }}>&#9889;</div>
      <div style={{ fontSize: '14px', color: '#e0e0e8', marginBottom: '8px', fontWeight: 600 }}>
        Intelligence Engine
      </div>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '20px', lineHeight: 1.7, maxWidth: '400px', margin: '0 auto 20px' }}>
        Add your OpenAI or Anthropic API key in <span style={{ color: '#00d4ff' }}>Settings</span> to unlock AI-powered analysis: daily briefings, project synthesis, trend detection, and custom queries.
      </div>
      {onNavigate && (
        <button onClick={() => onNavigate('settings')} style={{
          padding: '8px 20px', background: '#00d4ff18', border: '1px solid #00d4ff44',
          borderRadius: '6px', color: '#00d4ff', cursor: 'pointer',
          fontSize: '12px', fontFamily: 'inherit', marginBottom: '16px',
        }}>
          Go to Settings
        </button>
      )}
      <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.6 }}>
        BYOK (Bring Your Own Key) — your data stays between you and your AI provider.
        <br />The Signal Map section works without a key.
      </div>
    </div>
  );
}

function Sparkline({ data, color = '#00ff88', height = 40 }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 400;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d.count / max) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: `${height}px` }}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={`0,${height} ${points} ${width},${height}`}
          fill={color + '10'}
          stroke="none"
        />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555', marginTop: '4px' }}>
        {data.length > 0 && <span>{data[0].label}</span>}
        {data.length > 1 && <span>{data[data.length - 1].label}</span>}
      </div>
    </div>
  );
}

function buildSignalMap(results) {
  const SOURCE_COLORS = {
    hn: '#ff6b35',
    github: '#a78bfa',
    producthunt: '#00ff88',
    custom: '#00d4ff',
  };

  // Source counts
  const countMap = {};
  for (const r of results) {
    const src = r.source || 'unknown';
    countMap[src] = (countMap[src] || 0) + 1;
  }
  const sourceCounts = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({
      source,
      count,
      color: SOURCE_COLORS[source] || '#888',
    }));

  // Top terms (word frequency from titles)
  const STOP_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'and', 'or', 'for', 'to', 'in', 'on', 'of', 'with', 'by', 'from', 'at', 'as', 'it', 'its', 'this', 'that', 'how', 'what', 'new', 'your', 'you', 'can', 'will', 'has', 'have', 'not', 'but', 'all', 'do', 'if', 'my', 'more', 'just', 'about', 'we', 'up', 'out', 'no', 'so', 'get', 'one', 'like', 'use', 'using', 'show', 'hn']);
  const termMap = {};
  for (const r of results) {
    const words = (r.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    for (const w of words) {
      if (w.length > 2 && !STOP_WORDS.has(w)) {
        termMap[w] = (termMap[w] || 0) + 1;
      }
    }
  }
  const topTerms = Object.entries(termMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([term, count]) => ({ term, count }));

  // Timeline (group by hour)
  const timeMap = {};
  for (const r of results) {
    if (r.scrapedAt) {
      const hour = r.scrapedAt.slice(0, 13);
      timeMap[hour] = (timeMap[hour] || 0) + 1;
    }
  }
  const timeline = Object.entries(timeMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label: label.slice(5), count }));

  // Cross-source detection (terms appearing in 2+ sources)
  const termBySrc = {};
  for (const r of results) {
    const words = (r.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && !STOP_WORDS.has(w)) {
        if (!termBySrc[w]) termBySrc[w] = new Set();
        termBySrc[w].add(r.source || 'unknown');
      }
    }
  }
  const crossSource = Object.entries(termBySrc)
    .filter(([, sources]) => sources.size >= 2)
    .map(([term, sources]) => ({ term, sources: Array.from(sources) }))
    .sort((a, b) => b.sources.length - a.sources.length)
    .slice(0, 15);

  return { sourceCounts, topTerms, timeline, crossSource };
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const emptyStyle = {
  padding: '48px 24px', textAlign: 'center',
  background: '#0e0e18', border: '1px solid #1a1a2e', borderRadius: '12px',
  color: '#666', fontSize: '12px', lineHeight: 1.6,
};

function actionBtnStyle(disabled) {
  return {
    padding: '8px 20px', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#1a1a2e' : '#00d4ff18',
    border: `1px solid ${disabled ? '#2a2a3e' : '#00d4ff44'}`,
    color: disabled ? '#666' : '#00d4ff',
    fontSize: '12px', fontFamily: 'inherit', fontWeight: 500,
    transition: 'all 0.2s',
  };
}
