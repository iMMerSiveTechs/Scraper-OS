import { useState, useCallback } from 'react';

const CONDITION_TYPES = [
  { value: 'keyword', label: 'Keyword Match', desc: 'Fire when title/description contains keywords' },
  { value: 'score_threshold', label: 'Score Threshold', desc: 'Fire when item score exceeds value' },
  { value: 'new_count', label: 'New Item Count', desc: 'Fire when scrape returns N+ items' },
  { value: 'cross_source', label: 'Cross-Source', desc: 'Fire when topic appears in multiple sources' },
  { value: 'regex', label: 'Regex Pattern', desc: 'Fire on regex match in title/description' },
];

const ACTION_TYPES = [
  { value: 'notification', label: 'Browser Notification' },
  { value: 'webhook', label: 'Webhook POST' },
  { value: 'highlight', label: 'Highlight in Feed' },
  { value: 'digest', label: 'Include in Digest' },
];

export function SettingsTab({ settings, updateSetting, updateSettings, resetSettings, triggers }) {
  const [showKey, setShowKey] = useState({});
  const [validating, setValidating] = useState({});
  const [validationResult, setValidationResult] = useState({});
  const [editingTrigger, setEditingTrigger] = useState(null);

  const validateKey = useCallback(async (provider) => {
    const key = provider === 'openai' ? settings.openaiKey : settings.anthropicKey;
    if (!key) return;
    setValidating((p) => ({ ...p, [provider]: true }));
    try {
      const { validateApiKey } = await import('../../services/intelligence.js');
      const result = await validateApiKey(provider, key);
      setValidationResult((p) => ({ ...p, [provider]: result }));
    } catch (err) {
      setValidationResult((p) => ({ ...p, [provider]: { valid: false, error: err.message } }));
    }
    setValidating((p) => ({ ...p, [provider]: false }));
  }, [settings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* AI API Keys */}
      <SettingsCard title="AI API KEYS" color="#00d4ff" subtitle="BYOK — Bring Your Own Key. Keys are stored locally in your browser.">
        <KeyInput
          label="OpenAI API Key"
          value={settings.openaiKey}
          onChange={(v) => updateSetting('openaiKey', v)}
          show={showKey.openai}
          onToggleShow={() => setShowKey((p) => ({ ...p, openai: !p.openai }))}
          onValidate={() => validateKey('openai')}
          validating={validating.openai}
          validation={validationResult.openai}
          placeholder="sk-..."
        />
        <div style={{ marginTop: '8px' }}>
          <FieldLabel>Model</FieldLabel>
          <select
            value={settings.openaiModel || 'gpt-4o-mini'}
            onChange={(e) => updateSetting('openaiModel', e.target.value)}
            style={selectStyle}
          >
            <option value="gpt-4o-mini">GPT-4o Mini (fast, cheap)</option>
            <option value="gpt-4o">GPT-4o (powerful)</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
          </select>
        </div>

        <div style={{ margin: '16px 0', borderTop: '1px solid #1a1a2e' }} />

        <KeyInput
          label="Anthropic API Key"
          value={settings.anthropicKey}
          onChange={(v) => updateSetting('anthropicKey', v)}
          show={showKey.anthropic}
          onToggleShow={() => setShowKey((p) => ({ ...p, anthropic: !p.anthropic }))}
          onValidate={() => validateKey('anthropic')}
          validating={validating.anthropic}
          validation={validationResult.anthropic}
          placeholder="sk-ant-..."
        />
        <div style={{ marginTop: '8px' }}>
          <FieldLabel>Model</FieldLabel>
          <select
            value={settings.anthropicModel || 'claude-sonnet-4-20250514'}
            onChange={(e) => updateSetting('anthropicModel', e.target.value)}
            style={selectStyle}
          >
            <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (balanced)</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (fast)</option>
          </select>
        </div>

        <div style={{ margin: '16px 0', borderTop: '1px solid #1a1a2e' }} />

        <FieldLabel>Preferred Provider</FieldLabel>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { value: '', label: 'Auto (use whichever has a key)' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'anthropic', label: 'Anthropic' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => updateSetting('preferredProvider', p.value)}
              style={{
                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
                background: settings.preferredProvider === p.value ? '#00d4ff18' : '#0a0a0f',
                border: `1px solid ${settings.preferredProvider === p.value ? '#00d4ff44' : '#2a2a3e'}`,
                color: settings.preferredProvider === p.value ? '#00d4ff' : '#888',
                fontSize: '11px', fontFamily: 'inherit',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </SettingsCard>

      {/* Action Triggers */}
      <SettingsCard title="ACTION TRIGGERS" color="#ffaa00" subtitle="Automated alerts when scraped data matches conditions.">
        {triggers.triggers.map((trigger) => (
          <TriggerRow
            key={trigger.id}
            trigger={trigger}
            isEditing={editingTrigger === trigger.id}
            onEdit={() => setEditingTrigger(editingTrigger === trigger.id ? null : trigger.id)}
            onToggle={() => triggers.toggleTrigger(trigger.id)}
            onUpdate={(updates) => triggers.updateTrigger(trigger.id, updates)}
            onDelete={() => {
              if (confirm(`Delete trigger "${trigger.name}"?`)) triggers.removeTrigger(trigger.id);
            }}
          />
        ))}
        <button
          onClick={() => {
            triggers.addTrigger({ name: 'New Trigger' });
          }}
          style={{
            width: '100%', padding: '10px', borderRadius: '8px', cursor: 'pointer',
            background: '#0a0a0f', border: '1px dashed #2a2a3e',
            color: '#888', fontSize: '11px', fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          + Add Trigger
        </button>

        {/* Trigger log */}
        {triggers.triggerLog?.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <FieldLabel>RECENT FIRES</FieldLabel>
            {triggers.triggerLog.slice(0, 5).map((log, i) => (
              <div key={i} style={{ fontSize: '10px', color: '#888', padding: '3px 0', borderBottom: '1px solid #12121e' }}>
                <span style={{ color: '#ffaa00' }}>{log.triggerName}</span>
                {' — '}{log.matchCount} matches · {formatTimeAgo(log.timestamp)}
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      {/* Notifications */}
      <SettingsCard title="NOTIFICATIONS" color="#a78bfa">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#e0e0e8' }}>Browser Notifications</div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Receive alerts when triggers fire</div>
          </div>
          <ToggleSwitch
            value={settings.notificationsEnabled}
            onChange={async (v) => {
              if (v) {
                const { requestNotificationPermission } = await import('../../services/triggers.js');
                const perm = await requestNotificationPermission();
                updateSetting('notificationsEnabled', perm === 'granted');
              } else {
                updateSetting('notificationsEnabled', false);
              }
            }}
          />
        </div>

        <FieldLabel>Webhook URL (optional)</FieldLabel>
        <input
          type="url"
          value={settings.webhookUrl || ''}
          onChange={(e) => updateSetting('webhookUrl', e.target.value)}
          placeholder="https://hooks.slack.com/..."
          style={inputStyle}
        />
      </SettingsCard>

      {/* Scraper Configs */}
      <SettingsCard title="SCRAPER SOURCES" color="#ff6b35" subtitle="Configure built-in scrapers. Subreddits, X accounts, search terms.">
        {/* Reddit */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: '#ff4500', fontWeight: 600, marginBottom: '6px' }}>Reddit</div>
          <FieldLabel>Subreddits (comma-separated)</FieldLabel>
          <input
            type="text"
            value={(settings.redditSubreddits || []).join(', ')}
            onChange={(e) => updateSetting('redditSubreddits', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            placeholder="programming, webdev, machinelearning"
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            {['hot', 'new', 'top', 'rising'].map((s) => (
              <button key={s} onClick={() => updateSetting('redditSort', s)} style={{
                padding: '3px 10px', borderRadius: '6px', cursor: 'pointer',
                background: (settings.redditSort || 'hot') === s ? '#ff450018' : '#0a0a0f',
                border: `1px solid ${(settings.redditSort || 'hot') === s ? '#ff450044' : '#2a2a3e'}`,
                color: (settings.redditSort || 'hot') === s ? '#ff4500' : '#888',
                fontSize: '10px', fontFamily: 'inherit',
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* X / Twitter */}
        <div style={{ borderTop: '1px solid #1a1a2e', paddingTop: '14px', marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: '#1da1f2', fontWeight: 600, marginBottom: '6px' }}>X / Twitter</div>
          <FieldLabel>Usernames to follow</FieldLabel>
          <input
            type="text"
            value={(settings.xUsernames || []).join(', ')}
            onChange={(e) => updateSetting('xUsernames', e.target.value.split(',').map((s) => s.trim().replace(/^@/, '')).filter(Boolean))}
            placeholder="openai, elonmusk, anthropic"
            style={inputStyle}
          />
          <div style={{ marginTop: '6px' }}>
            <FieldLabel>Search terms</FieldLabel>
            <input
              type="text"
              value={(settings.xSearchTerms || []).join(', ')}
              onChange={(e) => updateSetting('xSearchTerms', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder="AI agents, web scraping"
              style={inputStyle}
            />
          </div>
          <div style={{ marginTop: '6px' }}>
            <FieldLabel>X Bearer Token (optional, for official API)</FieldLabel>
            <input
              type="password"
              value={settings.xBearerToken || ''}
              onChange={(e) => updateSetting('xBearerToken', e.target.value)}
              placeholder="Leave empty to use free RSS bridges"
              style={inputStyle}
            />
          </div>
        </div>

        {/* TAAFT */}
        <div style={{ borderTop: '1px solid #1a1a2e', paddingTop: '14px' }}>
          <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, marginBottom: '6px' }}>TAAFT (There's An AI For That)</div>
          <FieldLabel>Search query</FieldLabel>
          <input
            type="text"
            value={settings.taaftQuery || ''}
            onChange={(e) => updateSetting('taaftQuery', e.target.value)}
            placeholder="web scraping, AI agents"
            style={inputStyle}
          />
          <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>Requires local server (npm run dev)</div>
        </div>
      </SettingsCard>

      {/* Data Settings */}
      <SettingsCard title="DATA & STORAGE" color="#888">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Retention (days)</FieldLabel>
            <input
              type="number"
              value={settings.retentionDays || 30}
              onChange={(e) => updateSetting('retentionDays', parseInt(e.target.value) || 30)}
              style={inputStyle}
              min={1}
              max={365}
            />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Max Results</FieldLabel>
            <input
              type="number"
              value={settings.maxResults || 500}
              onChange={(e) => updateSetting('maxResults', parseInt(e.target.value) || 500)}
              style={inputStyle}
              min={50}
              max={5000}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#e0e0e8' }}>Compact Feed</div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Reduce spacing in live feed</div>
          </div>
          <ToggleSwitch
            value={settings.compactFeed}
            onChange={(v) => updateSetting('compactFeed', v)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#e0e0e8' }}>Show Sparklines</div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Activity sparklines on dashboard</div>
          </div>
          <ToggleSwitch
            value={settings.showSparklines !== false}
            onChange={(v) => updateSetting('showSparklines', v)}
          />
        </div>

        {resetSettings && (
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1a1a2e' }}>
            <button
              onClick={() => { if (confirm('Reset all settings to defaults?')) resetSettings(); }}
              style={{
                padding: '6px 14px', background: '#ff444418', border: '1px solid #ff444433',
                borderRadius: '6px', color: '#ff4444', cursor: 'pointer',
                fontSize: '11px', fontFamily: 'inherit',
              }}
            >
              Reset All Settings
            </button>
          </div>
        )}
      </SettingsCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SettingsCard({ title, color = '#888', subtitle, children }) {
  return (
    <div style={{
      background: '#0e0e18', border: '1px solid #1a1a2e', borderRadius: '12px', overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a2e', background: '#0c0c14' }}>
        <div style={{ fontSize: '10px', color, letterSpacing: '2px' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>{subtitle}</div>}
      </div>
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
  );
}

function KeyInput({ label, value, onChange, show, onToggleShow, onValidate, validating, validation, placeholder }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={onToggleShow} style={smallBtnStyle}>
          {show ? 'Hide' : 'Show'}
        </button>
        <button onClick={onValidate} disabled={!value || validating} style={smallBtnStyle}>
          {validating ? '...' : 'Test'}
        </button>
      </div>
      {validation && (
        <div style={{ fontSize: '10px', marginTop: '4px', color: validation.valid ? '#00ff88' : '#ff4444' }}>
          {validation.valid ? 'Key is valid' : validation.error || 'Invalid key'}
        </div>
      )}
    </div>
  );
}

function TriggerRow({ trigger, isEditing, onEdit, onToggle, onUpdate, onDelete }) {
  return (
    <div style={{
      background: '#0a0a0f', border: `1px solid ${isEditing ? '#ffaa0044' : '#1a1a2e'}`,
      borderRadius: '10px', marginBottom: '8px', overflow: 'hidden', transition: 'all 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer' }} onClick={onEdit}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: '#e0e0e8', fontWeight: 500 }}>{trigger.name}</div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
            {trigger.condition.type} · {trigger.fireCount || 0} fires
          </div>
        </div>
        <ToggleSwitch value={trigger.enabled} onChange={(e) => { onToggle(); }} small />
        <span style={{ color: '#555', fontSize: '14px' }}>{isEditing ? '\u2212' : '+'}</span>
      </div>

      {/* Edit form */}
      {isEditing && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1a1a2e' }}>
          {/* Name */}
          <div style={{ marginTop: '10px' }}>
            <FieldLabel>Name</FieldLabel>
            <input
              type="text"
              value={trigger.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* Condition type */}
          <div style={{ marginTop: '10px' }}>
            <FieldLabel>Condition</FieldLabel>
            <select
              value={trigger.condition.type}
              onChange={(e) => onUpdate({ condition: { ...trigger.condition, type: e.target.value } })}
              style={selectStyle}
            >
              {CONDITION_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>

          {/* Condition-specific fields */}
          {trigger.condition.type === 'keyword' && (
            <div style={{ marginTop: '8px' }}>
              <FieldLabel>Keywords (comma-separated)</FieldLabel>
              <input
                type="text"
                value={(trigger.condition.keywords || []).join(', ')}
                onChange={(e) => onUpdate({
                  condition: {
                    ...trigger.condition,
                    keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
                  },
                })}
                placeholder="AI, startup, funding"
                style={inputStyle}
              />
            </div>
          )}

          {trigger.condition.type === 'score_threshold' && (
            <div style={{ marginTop: '8px' }}>
              <FieldLabel>Minimum Score</FieldLabel>
              <input
                type="number"
                value={trigger.condition.threshold || 100}
                onChange={(e) => onUpdate({
                  condition: { ...trigger.condition, threshold: parseInt(e.target.value) || 100 },
                })}
                style={inputStyle}
              />
            </div>
          )}

          {trigger.condition.type === 'new_count' && (
            <div style={{ marginTop: '8px' }}>
              <FieldLabel>Minimum Items</FieldLabel>
              <input
                type="number"
                value={trigger.condition.minCount || 10}
                onChange={(e) => onUpdate({
                  condition: { ...trigger.condition, minCount: parseInt(e.target.value) || 10 },
                })}
                style={inputStyle}
              />
            </div>
          )}

          {trigger.condition.type === 'regex' && (
            <div style={{ marginTop: '8px' }}>
              <FieldLabel>Regex Pattern</FieldLabel>
              <input
                type="text"
                value={trigger.condition.pattern || ''}
                onChange={(e) => onUpdate({
                  condition: { ...trigger.condition, pattern: e.target.value },
                })}
                placeholder="e.g. AI|machine learning"
                style={inputStyle}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: '10px' }}>
            <FieldLabel>Actions</FieldLabel>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {ACTION_TYPES.map((at) => {
                const active = (trigger.actions || []).some((a) => a.type === at.value);
                return (
                  <button
                    key={at.value}
                    onClick={() => {
                      const actions = active
                        ? (trigger.actions || []).filter((a) => a.type !== at.value)
                        : [...(trigger.actions || []), { type: at.value }];
                      onUpdate({ actions });
                    }}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
                      background: active ? '#ffaa0018' : '#1a1a2e',
                      border: `1px solid ${active ? '#ffaa0044' : '#2a2a3e'}`,
                      color: active ? '#ffaa00' : '#888',
                      fontSize: '10px', fontFamily: 'inherit',
                    }}
                  >
                    {at.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onDelete} style={{
              padding: '4px 12px', background: '#ff444418', border: '1px solid #ff444433',
              borderRadius: '6px', color: '#ff4444', cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit',
            }}>
              Delete Trigger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ value, onChange, small }) {
  const w = small ? 28 : 36;
  const h = small ? 14 : 18;
  const dot = small ? 10 : 14;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!value); }}
      role="switch"
      aria-checked={value}
      style={{
        width: `${w}px`, height: `${h}px`, borderRadius: `${h}px`, cursor: 'pointer',
        background: value ? '#00ff8844' : '#1a1a2e',
        border: `1px solid ${value ? '#00ff8866' : '#2a2a3e'}`,
        position: 'relative', transition: 'all 0.2s', flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        left: value ? `${w - dot - 3}px` : '2px',
        width: `${dot}px`, height: `${dot}px`, borderRadius: '50%',
        background: value ? '#00ff88' : '#666',
        transition: 'all 0.2s',
      }} />
    </button>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{ display: 'block', fontSize: '10px', color: '#999', letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const inputStyle = {
  width: '100%', padding: '7px 10px', background: '#080810',
  border: '1px solid #2a2a3e', borderRadius: '6px',
  color: '#e0e0e8', fontSize: '12px',
  fontFamily: "'JetBrains Mono', monospace", outline: 'none',
};

const selectStyle = {
  ...inputStyle, cursor: 'pointer',
};

const smallBtnStyle = {
  padding: '5px 10px', background: '#1a1a2e', border: '1px solid #2a2a3e',
  borderRadius: '6px', color: '#888', cursor: 'pointer',
  fontSize: '10px', fontFamily: 'inherit', whiteSpace: 'nowrap',
};

function formatTimeAgo(date) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
