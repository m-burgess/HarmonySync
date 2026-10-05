import { useState, useEffect, useMemo } from 'react'
import { suggestCapoKey, nashvilleToStandard, toCagedLeadShape, getCapoFret } from './lib/transposer'
import './index.css'

const KEYS = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B"]
const KEY_ALIASES = { "D#": "Eb", "G#": "Ab", "A#": "Bb" }
const RECONNECT_DELAY_MS = 2000

// Verbose protocol logging only in dev builds (`npm run dev`).
const debugLog = (...args) => {
  if (import.meta.env.DEV) console.log(...args)
}

// Map a song-map key string onto one of the selectable KEYS, or null if unknown.
const normalizeKey = (key) => {
  if (typeof key !== 'string') return null
  const trimmed = key.trim()
  if (!trimmed) return null
  const k = trimmed[0].toUpperCase() + trimmed.slice(1)
  if (KEYS.includes(k)) return k
  return KEY_ALIASES[k] || null
}

// Transpose a whitespace/dash separated list of Nashville chords.
const transposeChordList = (chordString, separator, targetKey, applyCaged) => {
  if (typeof chordString !== 'string' || !chordString.trim()) return null
  return chordString
    .split(separator)
    .filter(Boolean)
    .map(part => {
      const stdChord = nashvilleToStandard(part, targetKey)
      return applyCaged ? toCagedLeadShape(stdChord) : stdChord
    })
}

function App() {
  const [connected, setConnected] = useState(false)
  const [rawSongData, setRawSongData] = useState(null)
  
  const [selectedKey, setSelectedKey] = useState("C")
  const [capoMode, setCapoMode] = useState("Off")
  const [cagedEnabled, setCagedEnabled] = useState(false)

  // Initialize WebSocket connection
  useEffect(() => {
    // Connect back to the machine that served this page (the desktop host on the LAN).
    // The desktop RemoteApiServer listens on 8080; override with VITE_WS_PORT if needed.
    const wsHost = window.location.hostname || 'localhost';
    const wsPort = import.meta.env.VITE_WS_PORT || '8080';
    const wsUrl = `ws://${wsHost}:${wsPort}`;

    let ws = null;
    let reconnectTimer = null;
    let disposed = false;

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, RECONNECT_DELAY_MS);
    };

    const connect = () => {
      if (disposed) return;
      debugLog(`Connecting to ${wsUrl}...`);
      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        console.error("Failed to create WebSocket:", err);
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        debugLog("Connected to HarmonySync Host!");
        setConnected(true);
      };

      ws.onmessage = (event) => {
        debugLog("Received raw WS message:", event.data);
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          console.error("Failed to parse top-level WS message", e);
          return;
        }
        if (!data || data.event !== 'SONG_MAP_UPDATED') return;

        if (!data.payload) {
          // Desktop sends an empty payload when no song is active.
          setRawSongData(null);
          return;
        }
        try {
          const payload = JSON.parse(data.payload);
          debugLog("Parsed song map payload:", payload);
          if (!payload || typeof payload !== 'object') {
            console.warn("Song map payload is not an object; ignoring.");
            return;
          }
          setRawSongData(payload);
          // Desktop song maps store the key as "key"; older maps used "originalKey"
          // (FolderService accepts both, so do the same here).
          const songKey = normalizeKey(payload.key ?? payload.originalKey);
          if (songKey) {
            setSelectedKey(songKey);
          }
        } catch (err) {
          console.error("Failed to parse the JSON inside data.payload:", err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (disposed) return;
        debugLog(`Disconnected. Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);
        scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        // onclose follows an error and handles the reconnect.
      };
    };

    // Phones suspend background tabs; reconnect right away when the page is shown again.
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible' || disposed) return;
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        connect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    connect();

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
        ws.close();
      }
    };
  }, []);

  // Compute transposed structure whenever inputs change
  const songStructure = useMemo(() => {
    if (!rawSongData || !Array.isArray(rawSongData.sections)) return null;
    
    let targetKey = selectedKey || "C";
    if (capoMode !== "Off") {
        if (capoMode === "Auto") {
            targetKey = suggestCapoKey(targetKey);
        } else {
            targetKey = capoMode;
        }
    }
    
    const applyCaged = cagedEnabled && capoMode === "Off";

    return rawSongData.sections
      .filter(section => section && typeof section === 'object')
      .map(section => {
        // Section chords are written like "1-6m-5-4"; show them joined with dashes.
        const sectionChords = transposeChordList(section.chords, /[\s-]+/, targetKey, applyCaged);

        const lines = (Array.isArray(section.lines) ? section.lines : []).map(line => {
          if (typeof line === 'string') return { text: line, chords: null };
          if (!line || typeof line !== 'object') return { text: "", chords: null };
          const text = line.text || line.lyric || "";
          const chords = transposeChordList(line.chords, /\s+/, targetKey, applyCaged);
          return { text, chords: chords ? chords.join(" ") : null };
        });

        return { ...section, chords: sectionChords ? sectionChords.join(" - ") : null, lines };
      });
  }, [rawSongData, selectedKey, capoMode, cagedEnabled]);

  return (
    <div className="app-container">
      <header className="header">
        <div className="song-title">
          {(rawSongData && typeof rawSongData.title === 'string' && rawSongData.title) || "HarmonySync Musician View"}
        </div>
        <div className={`status-badge ${!connected ? 'disconnected' : ''}`}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', 
            backgroundColor: connected ? 'var(--success-color)' : 'var(--danger-color)'
          }} />
          {connected ? 'Live' : 'Offline'}
        </div>
      </header>

      <section className="controls-card">
        <div className="control-group">
          <span className="control-label">Key:</span>
          <select 
            className="modern-select"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
          >
            {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        
        <div className="control-group">
          <span className="control-label">Capo Mode:</span>
          <select 
            className="modern-select"
            value={capoMode}
            onChange={(e) => setCapoMode(e.target.value)}
          >
            <option value="Off">Off</option>
            <option value="Auto">Auto (Suggest C/G)</option>
            <option value="C">C Shape</option>
            <option value="G">G Shape</option>
          </select>
        </div>
        {capoMode !== "Off" && (
          <div className="control-group">
            <span className="control-label">Capo Fret:</span>
            <span className="badge" style={{backgroundColor: 'var(--accent-color)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 13, fontWeight: 'bold'}}>
              {getCapoFret(selectedKey, capoMode === "Auto" ? suggestCapoKey(selectedKey) : capoMode)}
            </span>
          </div>
        )}
        
        <div className="control-group">
          <span className="control-label">CAGED Lead:</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={cagedEnabled}
              onChange={(e) => setCagedEnabled(e.target.checked)} 
            />
            <span className="slider"></span>
          </label>
        </div>
      </section>

      <main className="content">
        {!songStructure ? (
          <div className="empty-state">
            <h3>No Song Active</h3>
            <p>Load a song in the main host to begin syncing.</p>
          </div>
        ) : (
          <div>
            {songStructure.map((section, idx) => (
              <div key={idx} className="section">
                <div className="section-name">
                  {section.name}
                  {section.chords && <span className="section-chords" style={{marginLeft: 10, color: 'var(--accent-color)'}}>[{section.chords}]</span>}
                </div>
                {section.lines.map((line, lIdx) => (
                  <div key={lIdx} className="lyric-line">
                    {line.chords && <div className="chords">{line.chords}</div>}
                    <div className="lyric">{line.text}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
