import { useState, useEffect, useMemo } from "react";
import {
  buildSongStructure,
  createSongMapConnection,
  getCapoFret,
  KEYS,
  suggestCapoKey,
} from "./appLogic";
import "./index.css";

function App() {
  const [connected, setConnected] = useState(false);
  const [rawSongData, setRawSongData] = useState(null);

  const [selectedKey, setSelectedKey] = useState("C");
  const [capoMode, setCapoMode] = useState("Off");
  const [cagedEnabled, setCagedEnabled] = useState(false);

  // Initialize WebSocket connection
  useEffect(
    () =>
      createSongMapConnection({
        WebSocketClass: WebSocket,
        hostname: window.location.hostname,
        port: import.meta.env.VITE_WS_PORT || "8080",
        onConnected: setConnected,
        onSongData: (result) => {
          if (result.kind === "empty") {
            setRawSongData(null);
          } else if (result.kind === "song") {
            setRawSongData(result.payload);
            if (result.songKey) setSelectedKey(result.songKey);
          } else if (
            result.kind === "invalid" ||
            result.kind === "invalid-payload"
          ) {
            console.error("Invalid song map WebSocket message");
          }
        },
        onError: (error) => console.error("WebSocket error:", error),
      }),
    [],
  );

  // Compute transposed structure whenever inputs change
  const songStructure = useMemo(
    () => buildSongStructure(rawSongData, selectedKey, capoMode, cagedEnabled),
    [rawSongData, selectedKey, capoMode, cagedEnabled],
  );

  return (
    <div className="app-container">
      <header className="header">
        <div className="song-title">
          {(rawSongData &&
            typeof rawSongData.title === "string" &&
            rawSongData.title) ||
            "HarmonySync Musician View"}
        </div>
        <div className={`status-badge ${!connected ? "disconnected" : ""}`}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: connected
                ? "var(--success-color)"
                : "var(--danger-color)",
            }}
          />
          {connected ? "Live" : "Offline"}
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
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
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
            <span
              className="badge"
              style={{
                backgroundColor: "var(--accent-color)",
                color: "#fff",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: "bold",
              }}
            >
              {getCapoFret(
                selectedKey,
                capoMode === "Auto" ? suggestCapoKey(selectedKey) : capoMode,
              )}
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
                  {section.chords && (
                    <span
                      className="section-chords"
                      style={{ marginLeft: 10, color: "var(--accent-color)" }}
                    >
                      [{section.chords}]
                    </span>
                  )}
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
  );
}

export default App;
