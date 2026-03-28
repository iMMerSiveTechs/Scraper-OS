import { useState, useRef, useCallback } from 'react';

/**
 * File Ingestion panel — drag-drop upload, directory scanning, file watching.
 */
export function FileIngestion({ fileIngestion }) {
  const {
    serverOnline,
    uploadFiles, uploading, uploadProgress,
    scanDirectory, scanning, scannedFiles,
    ingestFile, ingestAll,
    watchDirs, addWatchDir, removeWatchDir,
    watchEvents, watching, startWatching, stopWatching,
    ingestedItems, clearIngested,
  } = fileIngestion;

  const [activeSection, setActiveSection] = useState('upload');
  const [scanPath, setScanPath] = useState('');
  const [newWatchDir, setNewWatchDir] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  const handleFileSelect = useCallback((e) => {
    uploadFiles(e.target.files);
  }, [uploadFiles]);

  const sections = [
    { id: 'upload', label: 'Upload' },
    { id: 'scan', label: 'Scan Directory' },
    { id: 'watch', label: 'File Watcher' },
    { id: 'ingested', label: `Ingested (${ingestedItems.length})` },
  ];

  return (
    <div style={{
      background: '#0e0e18', border: '1px solid #1a1a2e', borderRadius: '12px', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid #1a1a2e', background: '#0c0c14',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#ffaa00', letterSpacing: '2px' }}>FILE INGESTION</span>
          <ServerDot online={serverOnline} />
        </div>
      </div>

      {/* Section nav */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1a1a2e', padding: '0 16px' }}>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding: '8px 14px', background: 'none', border: 'none',
              borderBottom: activeSection === s.id ? '2px solid #ffaa00' : '2px solid transparent',
              color: activeSection === s.id ? '#ffaa00' : '#888',
              cursor: 'pointer', fontSize: '10px', fontFamily: 'inherit',
              letterSpacing: '0.5px', transition: 'all 0.2s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>
        {/* Upload */}
        {activeSection === 'upload' && (
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '32px', textAlign: 'center', cursor: 'pointer',
                border: `2px dashed ${dragOver ? '#ffaa00' : '#2a2a3e'}`,
                borderRadius: '10px', transition: 'all 0.2s',
                background: dragOver ? '#ffaa0008' : 'transparent',
              }}
            >
              <div style={{ fontSize: '24px', opacity: 0.4, marginBottom: '8px' }}>&#128193;</div>
              <div style={{ fontSize: '12px', color: dragOver ? '#ffaa00' : '#888' }}>
                {uploading
                  ? `Parsing ${uploadProgress.current}/${uploadProgress.total}...`
                  : 'Drop files here or click to browse'}
              </div>
              <div style={{ fontSize: '10px', color: '#555', marginTop: '6px' }}>
                JSON, CSV, TXT, MD, JS, PY, PDF, and more
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept=".json,.csv,.tsv,.txt,.md,.js,.jsx,.ts,.tsx,.py,.rb,.go,.rs,.pdf,.xml,.yaml,.yml,.html,.css"
            />
          </div>
        )}

        {/* Directory Scanner */}
        {activeSection === 'scan' && (
          <div>
            {!serverOnline ? (
              <ServerRequired />
            ) : (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={scanPath}
                    onChange={(e) => setScanPath(e.target.value)}
                    placeholder="/path/to/directory"
                    onKeyDown={(e) => e.key === 'Enter' && scanPath && scanDirectory(scanPath)}
                    style={inputStyle}
                  />
                  <button
                    onClick={() => scanPath && scanDirectory(scanPath)}
                    disabled={scanning || !scanPath}
                    style={btnStyle(scanning ? '#666' : '#ffaa00')}
                  >
                    {scanning ? 'Scanning...' : 'Scan'}
                  </button>
                </div>

                {scannedFiles.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#00ff88' }}>{scannedFiles.length} files found</span>
                      <button onClick={ingestAll} style={btnStyle('#00ff88')}>Ingest All</button>
                    </div>
                    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                      {scannedFiles.slice(0, 50).map((f, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '4px 0', borderBottom: '1px solid #12121e', fontSize: '11px',
                        }}>
                          <span style={{ color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.relativePath || f.name}
                          </span>
                          <span style={{ color: '#555', fontSize: '9px', flexShrink: 0 }}>
                            {(f.size / 1024).toFixed(1)}KB
                          </span>
                          <button
                            onClick={() => ingestFile(f.path)}
                            style={{ ...btnStyle('#888'), padding: '2px 6px', fontSize: '9px' }}
                          >
                            ingest
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* File Watcher */}
        {activeSection === 'watch' && (
          <div>
            {!serverOnline ? (
              <ServerRequired />
            ) : (
              <>
                {/* Watch dirs */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#999', letterSpacing: '1px', marginBottom: '6px' }}>WATCHED DIRECTORIES</div>
                  {watchDirs.map((dir) => (
                    <div key={dir} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '4px 0', borderBottom: '1px solid #12121e', fontSize: '11px',
                    }}>
                      <span style={{ color: '#e0e0e8', flex: 1 }}>{dir}</span>
                      <button onClick={() => removeWatchDir(dir)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>x</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <input
                      type="text"
                      value={newWatchDir}
                      onChange={(e) => setNewWatchDir(e.target.value)}
                      placeholder="/path/to/watch"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newWatchDir) {
                          addWatchDir(newWatchDir);
                          setNewWatchDir('');
                        }
                      }}
                      style={inputStyle}
                    />
                    <button
                      onClick={() => { if (newWatchDir) { addWatchDir(newWatchDir); setNewWatchDir(''); } }}
                      style={btnStyle('#888')}
                    >+</button>
                  </div>
                </div>

                {/* Watch controls */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    onClick={watching ? stopWatching : startWatching}
                    disabled={watchDirs.length === 0}
                    style={btnStyle(watching ? '#ff4444' : '#00ff88')}
                  >
                    {watching ? 'Stop Watching' : 'Start Watching'}
                  </button>
                  {watching && (
                    <span style={{ fontSize: '10px', color: '#00ff88', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      Live
                    </span>
                  )}
                </div>

                {/* Watch events */}
                {watchEvents.length > 0 && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#999', letterSpacing: '1px', marginBottom: '6px' }}>RECENT EVENTS</div>
                    <div style={{ maxHeight: '150px', overflow: 'auto' }}>
                      {watchEvents.slice(0, 20).map((evt, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: '8px', padding: '3px 0',
                          borderBottom: '1px solid #12121e', fontSize: '10px',
                        }}>
                          <span style={{
                            color: evt.event === 'add' ? '#00ff88' : evt.event === 'unlink' ? '#ff4444' : '#ffaa00',
                            width: '40px', flexShrink: 0,
                          }}>
                            {evt.event}
                          </span>
                          <span style={{ color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {evt.name || evt.path}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Ingested items */}
        {activeSection === 'ingested' && (
          <div>
            {ingestedItems.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                No files ingested yet. Upload files or scan a directory.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#00ff88' }}>{ingestedItems.length} items ingested</span>
                  <button onClick={clearIngested} style={btnStyle('#ff4444')}>Clear All</button>
                </div>
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {ingestedItems.slice(0, 30).map((item, i) => (
                    <div key={i} style={{
                      padding: '8px 10px', background: '#0a0a0f', borderRadius: '6px',
                      marginBottom: '6px', fontSize: '11px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '9px', color: '#ffaa00', background: '#ffaa0018', padding: '1px 6px', borderRadius: '4px' }}>
                          {item.sourceType || 'file'}
                        </span>
                        <span style={{ color: '#e0e0e8', fontWeight: 500 }}>{item.title}</span>
                      </div>
                      {item.content && (
                        <div style={{ color: '#666', fontSize: '10px', lineHeight: 1.5, maxHeight: '40px', overflow: 'hidden' }}>
                          {item.content.slice(0, 150)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ServerDot({ online }) {
  return (
    <span style={{
      width: '6px', height: '6px', borderRadius: '50%',
      background: online ? '#00ff88' : '#ff4444',
      display: 'inline-block',
    }} title={online ? 'Server online' : 'Server offline'} />
  );
}

function ServerRequired() {
  return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '20px', opacity: 0.3, marginBottom: '8px' }}>&#9888;</div>
      <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
        This feature requires the local server.
        <br />Start it with: <code style={{ color: '#00ff88', background: '#00ff8810', padding: '1px 6px', borderRadius: '3px' }}>npm run dev</code>
      </div>
    </div>
  );
}

const inputStyle = {
  flex: 1, padding: '7px 10px', background: '#080810',
  border: '1px solid #2a2a3e', borderRadius: '6px',
  color: '#e0e0e8', fontSize: '12px',
  fontFamily: "'JetBrains Mono', monospace", outline: 'none',
};

function btnStyle(color) {
  return {
    padding: '5px 12px', background: color + '18', border: `1px solid ${color}44`,
    borderRadius: '6px', color, cursor: 'pointer', fontSize: '10px',
    fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap',
  };
}
