import { useState, useMemo, useCallback } from 'react';
import { FileIngestion } from '../FileIngestion';

const SCRAPER_TYPES = [
  { id: 'css', label: 'CSS / HTML', color: '#00ff88', desc: 'Parse HTML with CSS selectors' },
  { id: 'json', label: 'JSON / API', color: '#a78bfa', desc: 'Extract from JSON APIs' },
  { id: 'rss', label: 'RSS / Atom', color: '#ff6b35', desc: 'Parse RSS or Atom feeds' },
];

const EXTRACT_OPTIONS = [
  { value: 'text', label: 'Text content' },
  { value: 'href', label: 'Link (href)' },
  { value: 'src', label: 'Image (src)' },
  { value: 'html', label: 'Inner HTML' },
  { value: 'attr', label: 'Custom attribute' },
];

const SCHEDULE_OPTIONS = [
  { value: 'manual', label: 'Manual only' },
  { value: 'hourly', label: 'Every hour' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const COLORS = ['#00ff88', '#a78bfa', '#ff6b35', '#00d4ff', '#ffaa00', '#ff4444', '#f0c040', '#da552f'];

const EMPTY_CONFIG = {
  name: '',
  url: '',
  type: 'css',
  itemSelector: '',
  fields: [
    { name: 'title', selector: '', extract: 'text' },
    { name: 'url', selector: 'a', extract: 'href' },
  ],
  dataPath: '',
  schedule: 'manual',
  limit: 30,
  icon: '\u2699',
  color: '#00d4ff',
};

export function BuilderTab({ customScrapers = {}, fileIngestion }) {
  const {
    scrapers = [], testResults = {}, testing = {},
    addScraper, updateScraper, removeScraper, toggleScraper,
    testScraper, duplicateScraper,
  } = customScrapers;

  const [editing, setEditing] = useState(null); // null = list view, 'new' = new, id = editing
  const [config, setConfig] = useState({ ...EMPTY_CONFIG });
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  const isNew = editing === 'new';

  const startNew = () => {
    setConfig({ ...EMPTY_CONFIG });
    setEditing('new');
    setPreviewResult(null);
    setValidationErrors([]);
  };

  const startEdit = (scraper) => {
    setConfig({ ...scraper });
    setEditing(scraper.id);
    setPreviewResult(null);
    setValidationErrors([]);
  };

  const cancelEdit = () => {
    setEditing(null);
    setConfig({ ...EMPTY_CONFIG });
    setPreviewResult(null);
    setValidationErrors([]);
  };

  const updateField = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updateFieldDef = (index, key, value) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === index ? { ...f, [key]: value } : f)),
    }));
  };

  const addField = () => {
    setConfig((prev) => ({
      ...prev,
      fields: [...prev.fields, { name: '', selector: '', extract: 'text' }],
    }));
  };

  const removeField = (index) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const handleTest = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const result = await testScraper(config);
      setPreviewResult(result);
    } catch (err) {
      setPreviewResult({ items: [], error: err.message });
    }
    setPreviewLoading(false);
  }, [config, testScraper]);

  const handleSave = async () => {
    // Validate
    const { validateConfig } = await import('../../scrapers/dynamicEngine.js');
    const { valid, errors } = validateConfig(config);
    if (!valid) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    if (isNew) {
      addScraper(config);
    } else {
      updateScraper(editing, config);
    }
    cancelEdit();
  };

  // List view
  if (editing === null) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#999', lineHeight: 1.6 }}>
              Build custom scrapers. Define URL, selectors, and fields — test live, deploy instantly.
            </div>
          </div>
          <button onClick={startNew} style={btnStyle('#00ff88')}>
            + New Scraper
          </button>
        </div>

        {scrapers.length === 0 ? (
          <EmptyState onNew={startNew} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scrapers.map((s) => (
              <ScraperCard
                key={s.id}
                scraper={s}
                testResult={testResults[s.id]}
                isTesting={testing[s.id]}
                onEdit={() => startEdit(s)}
                onToggle={() => toggleScraper(s.id)}
                onDuplicate={() => duplicateScraper(s.id)}
                onDelete={() => {
                  if (confirm(`Delete "${s.name}"?`)) removeScraper(s.id);
                }}
                onTest={() => testScraper(s.id)}
              />
            ))}
          </div>
        )}

        {/* File Ingestion */}
        {fileIngestion && (
          <div style={{ marginTop: '20px' }}>
            <FileIngestion fileIngestion={fileIngestion} />
          </div>
        )}
      </div>
    );
  }

  // Editor view
  const typeConfig = SCRAPER_TYPES.find((t) => t.id === config.type);

  return (
    <div>
      {/* Editor Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={cancelEdit} style={{ ...btnStyle('#888'), padding: '5px 10px' }}>
            &larr; Back
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0e8' }}>
            {isNew ? 'New Scraper' : `Edit: ${config.name}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleTest} disabled={previewLoading} style={btnStyle('#00d4ff')}>
            {previewLoading ? 'Testing...' : 'Test Run'}
          </button>
          <button onClick={handleSave} style={btnStyle('#00ff88')}>
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div style={{ padding: '10px 14px', background: '#ff444418', border: '1px solid #ff444433', borderRadius: '8px', marginBottom: '16px' }}>
          {validationErrors.map((e, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#ff6b6b', lineHeight: 1.6 }}>
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Main editor area: Config + Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
        {/* Left: Config Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Basic Info */}
          <Card title="BASIC INFO">
            <FormRow>
              <FormField label="Name" flex={2}>
                <Input value={config.name} onChange={(v) => updateField('name', v)} placeholder="My Scraper" />
              </FormField>
              <FormField label="Color">
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateField('color', c)}
                      style={{
                        width: '20px', height: '20px', borderRadius: '4px',
                        background: c, border: config.color === c ? '2px solid #fff' : '2px solid transparent',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </div>
              </FormField>
            </FormRow>
            <FormField label="URL">
              <Input value={config.url} onChange={(v) => updateField('url', v)} placeholder="https://example.com/data" />
            </FormField>
            <FormRow>
              <FormField label="Schedule">
                <Select value={config.schedule} onChange={(v) => updateField('schedule', v)} options={SCHEDULE_OPTIONS} />
              </FormField>
              <FormField label="Limit">
                <Input type="number" value={config.limit} onChange={(v) => updateField('limit', parseInt(v) || 30)} />
              </FormField>
            </FormRow>
          </Card>

          {/* Type Selection */}
          <Card title="SCRAPER TYPE">
            <div style={{ display: 'flex', gap: '8px' }}>
              {SCRAPER_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateField('type', t.id)}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                    background: config.type === t.id ? t.color + '18' : '#0a0a0f',
                    border: `1px solid ${config.type === t.id ? t.color + '44' : '#2a2a3e'}`,
                    color: config.type === t.id ? t.color : '#888',
                    fontSize: '11px', fontFamily: 'inherit', transition: 'all 0.2s', textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>{t.label}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Type-specific config */}
          {(config.type === 'css') && (
            <Card title="CSS EXTRACTION">
              <FormField label="Item Selector" hint="CSS selector for each repeating item container">
                <Input
                  value={config.itemSelector}
                  onChange={(v) => updateField('itemSelector', v)}
                  placeholder=".item, article, tr"
                  color="#00ff88"
                />
              </FormField>

              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={labelStyle}>FIELDS</span>
                  <button onClick={addField} style={{ ...btnStyle('#888'), padding: '2px 8px', fontSize: '10px' }}>+ Field</button>
                </div>
                {config.fields.map((field, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <Input
                      value={field.name}
                      onChange={(v) => updateFieldDef(i, 'name', v)}
                      placeholder="field name"
                      style={{ flex: '1 1 80px' }}
                    />
                    <Input
                      value={field.selector}
                      onChange={(v) => updateFieldDef(i, 'selector', v)}
                      placeholder=".selector"
                      style={{ flex: '2 1 120px' }}
                      color="#00ff88"
                    />
                    <Select
                      value={field.extract}
                      onChange={(v) => updateFieldDef(i, 'extract', v)}
                      options={EXTRACT_OPTIONS}
                      style={{ flex: '1 1 100px' }}
                    />
                    {config.fields.length > 1 && (
                      <button onClick={() => removeField(i)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', padding: '0 4px' }}>
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(config.type === 'json') && (
            <Card title="JSON EXTRACTION">
              <FormField label="Data Path" hint="Dot-notation path to the array (e.g. data.items)">
                <Input
                  value={config.dataPath}
                  onChange={(v) => updateField('dataPath', v)}
                  placeholder="data.items"
                  color="#a78bfa"
                />
              </FormField>
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={labelStyle}>FIELD MAPPINGS</span>
                  <button onClick={addField} style={{ ...btnStyle('#888'), padding: '2px 8px', fontSize: '10px' }}>+ Field</button>
                </div>
                {config.fields.map((field, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <Input
                      value={field.name}
                      onChange={(v) => updateFieldDef(i, 'name', v)}
                      placeholder="output name"
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: '#555', fontSize: '11px' }}>&larr;</span>
                    <Input
                      value={field.path || field.name}
                      onChange={(v) => updateFieldDef(i, 'path', v)}
                      placeholder="json.path"
                      style={{ flex: 1 }}
                      color="#a78bfa"
                    />
                    {config.fields.length > 1 && (
                      <button onClick={() => removeField(i)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', padding: '0 4px' }}>
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(config.type === 'rss') && (
            <Card title="RSS / ATOM FEED">
              <div style={{ padding: '12px', background: '#0a0a0f', borderRadius: '8px', fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
                RSS feeds are auto-parsed. Standard fields extracted: title, url, description, author, pubDate, category.
              </div>
            </Card>
          )}
        </div>

        {/* Right: Live Preview */}
        <div>
          <Card title="LIVE PREVIEW" color="#00d4ff">
            {previewLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#00d4ff', animation: 'pulse 1.5s ease-in-out infinite' }}>
                  Fetching and parsing...
                </div>
              </div>
            ) : previewResult ? (
              <div>
                {previewResult.error && (
                  <div style={{ padding: '8px 12px', background: '#ff444418', border: '1px solid #ff444433', borderRadius: '6px', marginBottom: '10px', fontSize: '11px', color: '#ff6b6b' }}>
                    {previewResult.error}
                  </div>
                )}
                {previewResult.items?.length > 0 ? (
                  <div>
                    <div style={{ fontSize: '11px', color: '#00ff88', marginBottom: '10px' }}>
                      {previewResult.items.length} items extracted
                    </div>
                    {previewResult.items.map((item, i) => (
                      <div key={i} style={{ padding: '8px 10px', background: '#0a0a0f', borderRadius: '6px', marginBottom: '6px', fontSize: '11px' }}>
                        {Object.entries(item)
                          .filter(([k]) => !k.startsWith('_') && k !== 'source' && k !== 'scrapedAt')
                          .map(([key, val]) => (
                            <div key={key} style={{ display: 'flex', gap: '8px', padding: '2px 0' }}>
                              <span style={{ color: '#888', minWidth: '60px' }}>{key}:</span>
                              <span style={{ color: '#e0e0e8', wordBreak: 'break-all' }}>
                                {typeof val === 'string' ? (val.length > 120 ? val.slice(0, 120) + '...' : val) : JSON.stringify(val)}
                              </span>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  !previewResult.error && (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                      No items extracted. Check your selectors.
                    </div>
                  )
                )}
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', opacity: 0.3, marginBottom: '12px' }}>&#9881;</div>
                <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.6 }}>
                  Configure your scraper and click <span style={{ color: '#00d4ff' }}>Test Run</span> to see a live preview of extracted data.
                </div>
              </div>
            )}
          </Card>

          {/* Quick reference */}
          <Card title="QUICK REFERENCE" style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.8 }}>
              <div><span style={{ color: '#00ff88' }}>.class</span> — select by class name</div>
              <div><span style={{ color: '#00ff88' }}>#id</span> — select by ID</div>
              <div><span style={{ color: '#00ff88' }}>tag</span> — select by element type</div>
              <div><span style={{ color: '#00ff88' }}>[attr=val]</span> — select by attribute</div>
              <div><span style={{ color: '#00ff88' }}>parent &gt; child</span> — direct child</div>
              <div><span style={{ color: '#00ff88' }}>A B</span> — descendant selector</div>
              <div><span style={{ color: '#00ff88' }}>:nth-child(n)</span> — nth element</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScraperCard({ scraper, testResult, isTesting, onEdit, onToggle, onDuplicate, onDelete, onTest }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: '#0e0e18',
      border: `1px solid ${expanded ? scraper.color + '44' : '#1a1a2e'}`,
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'all 0.2s',
    }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '14px 18px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Color indicator */}
        <div style={{ width: '4px', height: '32px', borderRadius: '2px', background: scraper.color, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e0e0e8' }}>{scraper.name}</span>
            <span style={{ fontSize: '9px', color: scraper.color, background: scraper.color + '15', padding: '2px 8px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {scraper.type}
            </span>
            {scraper.schedule !== 'manual' && (
              <span style={{ fontSize: '9px', color: '#999', background: '#1a1a2e', padding: '2px 8px', borderRadius: '8px' }}>
                {scraper.schedule}
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {scraper.url}
          </div>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {scraper.lastRunStatus && (
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: scraper.lastRunStatus === 'success' ? '#00ff88' : scraper.lastRunStatus === 'partial' ? '#f0c040' : '#ff4444',
            }} />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
              padding: '3px 10px', borderRadius: '10px', cursor: 'pointer',
              background: scraper.enabled ? '#00ff8818' : '#1a1a2e',
              border: `1px solid ${scraper.enabled ? '#00ff8844' : '#2a2a3e'}`,
              color: scraper.enabled ? '#00ff88' : '#666',
              fontSize: '10px', fontFamily: 'inherit',
            }}
          >
            {scraper.enabled ? 'ON' : 'OFF'}
          </button>
          <span style={{ color: '#555', fontSize: '14px' }}>{expanded ? '\u2212' : '+'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 18px 14px', borderTop: '1px solid #1a1a2e' }}>
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button onClick={onEdit} style={btnStyle(scraper.color)}>Edit</button>
            <button onClick={onTest} disabled={isTesting} style={btnStyle('#00d4ff')}>
              {isTesting ? 'Testing...' : 'Test'}
            </button>
            <button onClick={onDuplicate} style={btnStyle('#888')}>Duplicate</button>
            <button onClick={onDelete} style={btnStyle('#ff4444')}>Delete</button>
          </div>

          {/* Test result preview */}
          {testResult && (
            <div style={{ marginTop: '10px', padding: '10px', background: '#0a0a0f', borderRadius: '8px' }}>
              {testResult.error && (
                <div style={{ fontSize: '11px', color: '#ff6b6b', marginBottom: '6px' }}>{testResult.error}</div>
              )}
              {testResult.items?.length > 0 && (
                <div style={{ fontSize: '11px', color: '#00ff88', marginBottom: '6px' }}>
                  {testResult.items.length} items
                </div>
              )}
              {testResult.items?.slice(0, 3).map((item, i) => (
                <div key={i} style={{ fontSize: '10px', color: '#888', padding: '3px 0', borderBottom: '1px solid #12121e' }}>
                  {item.title || JSON.stringify(item).slice(0, 80)}
                </div>
              ))}
            </div>
          )}

          {/* Meta info */}
          <div style={{ marginTop: '10px', fontSize: '10px', color: '#555' }}>
            {scraper.lastRun && `Last run: ${formatTimeAgo(scraper.lastRun)}`}
            {scraper.createdAt && ` · Created: ${new Date(scraper.createdAt).toLocaleDateString()}`}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onNew }) {
  return (
    <div style={{
      padding: '60px 24px', textAlign: 'center',
      background: '#0e0e18', border: '1px solid #1a1a2e', borderRadius: '12px',
    }}>
      <div style={{ fontSize: '36px', opacity: 0.3, marginBottom: '16px' }}>&#9881;</div>
      <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>No custom scrapers yet</div>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '20px', lineHeight: 1.6 }}>
        Build scrapers with CSS selectors, JSON paths, or RSS feeds.
        <br />Test live, deploy instantly.
      </div>
      <button onClick={onNew} style={{ ...btnStyle('#00ff88'), padding: '8px 20px' }}>
        + Create Your First Scraper
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable form primitives
// ---------------------------------------------------------------------------

function Card({ title, children, color = '#888', style: extraStyle }) {
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

function FormRow({ children }) {
  return <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>{children}</div>;
}

function FormField({ label, hint, children, flex }) {
  return (
    <div style={{ flex: flex || 1, marginBottom: '8px' }}>
      <label style={labelStyle}>{label}</label>
      {hint && <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>{hint}</div>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', color: inputColor, style: extraStyle }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '7px 10px', background: '#080810',
        border: '1px solid #2a2a3e', borderRadius: '6px',
        color: inputColor || '#e0e0e8', fontSize: '12px',
        fontFamily: "'JetBrains Mono', monospace", outline: 'none',
        transition: 'border-color 0.2s', ...extraStyle,
      }}
      onFocus={(e) => (e.target.style.borderColor = '#00ff8844')}
      onBlur={(e) => (e.target.style.borderColor = '#2a2a3e')}
    />
  );
}

function Select({ value, onChange, options, style: extraStyle }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%', padding: '7px 10px', background: '#080810',
        border: '1px solid #2a2a3e', borderRadius: '6px',
        color: '#e0e0e8', fontSize: '11px',
        fontFamily: "'JetBrains Mono', monospace", outline: 'none',
        cursor: 'pointer', ...extraStyle,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const labelStyle = {
  display: 'block', fontSize: '10px', color: '#999',
  letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase',
};

function btnStyle(color) {
  return {
    padding: '5px 14px', background: color + '18', border: `1px solid ${color}44`,
    borderRadius: '6px', color, cursor: 'pointer', fontSize: '11px',
    fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap',
  };
}

function formatTimeAgo(date) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
