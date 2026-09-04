import { useState, useEffect, useMemo } from 'react'
import { suggestCapoKey, nashvilleToStandard, toCagedLeadShape, getCapoFret } from './lib/transposer'
import './index.css'

const KEYS = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B"]

function App() {
  const [connected, setConnected] = useState(false)
  const [rawSongData, setRawSongData] = useState(null)
  
  const [selectedKey, setSelectedKey] = useState("C")
  const [capoMode, setCapoMode] = useState("Off")
  const [cagedEnabled, setCagedEnabled] = useState(false)

  // Initialize WebSocket connection
  useEffect(() => {
    // Determine the host dynamically based on where the web app is served from
    const wsHost = window.location.hostname || 'localhost';
    const wsUrl = `ws://${wsHost}:8080`;
    
    let ws;
    let reconnectTimer;
    
    const connect = () => {
      console.log(`Connecting to ${wsUrl}...`);
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("Connected to HarmonySync Host!");
        setConnected(true);
      };
      
      ws.onmessage = (event) => {
        console.log("Received raw WS message:", event.data);
        try {
          const data = JSON.parse(event.data);
          console.log("Parsed WS event:", data);
          if (data.event === 'SONG_MAP_UPDATED') {
            if (!data.payload) {
                console.warn("Payload is empty or missing!");
                setRawSongData(null);
                return;
            }
            try {
              const payload = JSON.parse(data.payload);
              console.log("Parsed song map payload:", payload);
              setRawSongData(payload);
              if (payload.originalKey) {
                setSelectedKey(payload.originalKey);
              }
            } catch(err) {
              console.error("Failed to parse the JSON inside data.payload:", err);
            }
          }
        } catch (e) {
          console.error("Failed to parse top-level WS message", e);
        }
      };
      
      ws.onclose = () => {
        setConnected(false);
        console.log("Disconnected. Reconnecting in 2s...");
        reconnectTimer = setTimeout(connect, 2000);
      };
      
      ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
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
    
    return rawSongData.sections.map(section => {
      let transposedSectionChords = section.chords;
      if (transposedSectionChords) {
          const chordParts = transposedSectionChords.split(/[\s-]+/).filter(Boolean);
          const replacedChords = chordParts.map(part => {
            let stdChord = nashvilleToStandard(part, targetKey);
            if (cagedEnabled && capoMode === "Off") {
              stdChord = toCagedLeadShape(stdChord);
            }
            return stdChord;
          });
          // Reconstruct with dashes since we split by dash/space
          transposedSectionChords = replacedChords.join(" - ");
      }
      
      const lines = (section.lines || []).map(line => {
        let text = typeof line === 'string' ? line : (line.text || line.lyric || "");
        let chords = typeof line === 'object' ? line.chords : null;
        
        if (chords) {
          const chordParts = chords.split(/\s+/).filter(Boolean);
          const transposedChords = chordParts.map(part => {
            let stdChord = nashvilleToStandard(part, targetKey);
            if (cagedEnabled && capoMode === "Off") {
              stdChord = toCagedLeadShape(stdChord);
            }
            return stdChord;
          });
          chords = transposedChords.join(" ");
        }
        
        return { text, chords };
      });
      
      return { ...section, chords: transposedSectionChords, lines };
    });
  }, [rawSongData, selectedKey, capoMode, cagedEnabled]);

  return (
    <div className="app-container">
      <header className="header">
        <div className="song-title">
          {rawSongData ? rawSongData.title : "HarmonySync Musician View"}
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
