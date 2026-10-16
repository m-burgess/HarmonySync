import {
  suggestCapoKey,
  nashvilleToStandard,
  toCagedLeadShape,
  getCapoFret,
} from "./lib/transposer";

export const KEYS = [
  "C",
  "C#",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
const KEY_ALIASES = { "D#": "Eb", "G#": "Ab", "A#": "Bb" };

export const normalizeKey = (key) => {
  if (typeof key !== "string") return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  const normalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  if (KEYS.includes(normalized)) return normalized;
  return KEY_ALIASES[normalized] || null;
};

export const transposeChordList = (
  chordString,
  separator,
  targetKey,
  applyCaged,
) => {
  if (typeof chordString !== "string" || !chordString.trim()) return null;
  return chordString
    .split(separator)
    .filter(Boolean)
    .map((part) => {
      const standardChord = nashvilleToStandard(part, targetKey);
      return applyCaged ? toCagedLeadShape(standardChord) : standardChord;
    });
};

export const songDataFromMessage = (message) => {
  let data;
  try {
    data = JSON.parse(message);
  } catch {
    return { kind: "invalid" };
  }
  if (!data || data.event !== "SONG_MAP_UPDATED") return { kind: "ignored" };
  if (!data.payload) return { kind: "empty", songKey: null };
  try {
    const payload = JSON.parse(data.payload);
    if (!payload || typeof payload !== "object")
      return { kind: "invalid-payload" };
    return {
      kind: "song",
      payload,
      songKey: normalizeKey(payload.key ?? payload.originalKey),
    };
  } catch {
    return { kind: "invalid-payload" };
  }
};

export const buildSongStructure = (
  rawSongData,
  selectedKey,
  capoMode,
  cagedEnabled,
) => {
  if (!rawSongData || !Array.isArray(rawSongData.sections)) return null;
  let targetKey = selectedKey || "C";
  if (capoMode !== "Off")
    targetKey = capoMode === "Auto" ? suggestCapoKey(targetKey) : capoMode;
  const applyCaged = cagedEnabled && capoMode === "Off";
  return rawSongData.sections
    .filter((section) => section && typeof section === "object")
    .map((section) => {
      const sectionChords = transposeChordList(
        section.chords,
        /[\s-]+/,
        targetKey,
        applyCaged,
      );
      const lines = (Array.isArray(section.lines) ? section.lines : []).map(
        (line) => {
          if (typeof line === "string") return { text: line, chords: null };
          if (!line || typeof line !== "object")
            return { text: "", chords: null };
          const text = line.text || line.lyric || "";
          const chords = transposeChordList(
            line.chords,
            /\s+/,
            targetKey,
            applyCaged,
          );
          return { text, chords: chords ? chords.join(" ") : null };
        },
      );
      return {
        ...section,
        chords: sectionChords ? sectionChords.join(" - ") : null,
        lines,
      };
    });
};

export { getCapoFret };

export const createSongMapConnection = ({
  WebSocketClass,
  hostname,
  port = "8080",
  onConnected,
  onSongData,
  onError,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  doc = document,
  reconnectDelay = 2000,
}) => {
  const url = `ws://${hostname || "localhost"}:${port}`;
  let socket = null;
  let reconnectTimer = null;
  let disposed = false;

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer) return;
    reconnectTimer = setTimer(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelay);
  };
  const connect = () => {
    if (disposed) return;
    try {
      socket = new WebSocketClass(url);
    } catch (error) {
      onError?.(error);
      scheduleReconnect();
      return;
    }
    socket.onopen = () => onConnected?.(true);
    socket.onmessage = (event) => onSongData?.(songDataFromMessage(event.data));
    socket.onclose = () => {
      onConnected?.(false);
      scheduleReconnect();
    };
    socket.onerror = (error) => onError?.(error);
  };
  const handleVisibility = () => {
    if (doc.visibilityState !== "visible" || disposed) return;
    if (!socket || socket.readyState === WebSocketClass.CLOSED) {
      if (reconnectTimer) clearTimer(reconnectTimer);
      reconnectTimer = null;
      connect();
    }
  };
  doc.addEventListener("visibilitychange", handleVisibility);
  connect();
  return () => {
    disposed = true;
    doc.removeEventListener("visibilitychange", handleVisibility);
    if (reconnectTimer) clearTimer(reconnectTimer);
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      socket.close();
    }
  };
};
