import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSongStructure,
  createSongMapConnection,
  normalizeKey,
  songDataFromMessage,
  transposeChordList,
} from "./appLogic";

describe("song map parsing", () => {
  it("normalizes supported keys and enharmonic aliases", () => {
    expect(normalizeKey("  d#")).toBe("Eb");
    expect(normalizeKey("g#")).toBe("Ab");
    expect(normalizeKey("F#")).toBe("F#");
    expect(normalizeKey("H")).toBeNull();
    expect(normalizeKey(null)).toBeNull();
    expect(normalizeKey(" ")).toBeNull();
  });

  it("accepts song updates, legacy keys, and empty payloads", () => {
    expect(
      songDataFromMessage(
        JSON.stringify({
          event: "SONG_MAP_UPDATED",
          payload: '{"originalKey":"A","title":"Song"}',
        }),
      ),
    ).toEqual({
      kind: "song",
      payload: { originalKey: "A", title: "Song" },
      songKey: "A",
    });
    expect(
      songDataFromMessage(
        JSON.stringify({ event: "SONG_MAP_UPDATED", payload: "" }),
      ),
    ).toEqual({ kind: "empty", songKey: null });
    expect(songDataFromMessage("{")).toEqual({ kind: "invalid" });
    expect(songDataFromMessage(JSON.stringify({ event: "OTHER" }))).toEqual({
      kind: "ignored",
    });
    expect(
      songDataFromMessage(
        JSON.stringify({ event: "SONG_MAP_UPDATED", payload: "{" }),
      ),
    ).toEqual({ kind: "invalid-payload" });
    expect(
      songDataFromMessage(
        JSON.stringify({ event: "SONG_MAP_UPDATED", payload: "null" }),
      ),
    ).toEqual({ kind: "invalid-payload" });
  });
});

describe("song structure transformation", () => {
  it("transposes sections and lyric lines, tolerating incomplete input", () => {
    const result = buildSongStructure(
      {
        sections: [
          null,
          {
            name: "Verse",
            chords: "1-6m-5-4",
            lines: [
              "plain lyric",
              null,
              { lyric: "legacy text", chords: "1 4" },
              { text: "modern text" },
            ],
          },
        ],
      },
      "C",
      "Off",
      false,
    );
    expect(result).toEqual([
      {
        name: "Verse",
        chords: "C - Am - G - F",
        lines: [
          { text: "plain lyric", chords: null },
          { text: "", chords: null },
          { text: "legacy text", chords: "C F" },
          { text: "modern text", chords: null },
        ],
      },
    ]);
    expect(buildSongStructure(null, "C", "Off", false)).toBeNull();
    expect(
      buildSongStructure({ sections: "bad" }, "C", "Off", false),
    ).toBeNull();
    expect(
      buildSongStructure({ sections: [{ lines: "bad" }] }, "", "Off", false)[0]
        .lines,
    ).toEqual([]);
  });

  it("applies capo selection and CAGED shapes only when enabled without capo", () => {
    const song = { sections: [{ chords: "1-4" }] };
    expect(buildSongStructure(song, "E", "Auto", true)[0].chords).toBe("C - F");
    expect(buildSongStructure(song, "G", "D", false)[0].chords).toBe("D - G");
    expect(buildSongStructure(song, "C", "Off", true)[0].chords).toContain(
      "[C-shape fret 0]",
    );
    expect(transposeChordList("  ", /\s+/, "C", false)).toBeNull();
    expect(transposeChordList("1 4", /\s+/, "C", false)).toEqual(["C", "F"]);
  });
});

describe("WebSocket connection lifecycle", () => {
  let cleanup;
  afterEach(() => {
    cleanup?.();
    vi.useRealTimers();
  });

  const makeDocument = () => ({
    visibilityState: "hidden",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });

  it("opens at the configured host and routes connection and song events", () => {
    const doc = makeDocument();
    const onConnected = vi.fn();
    const onSongData = vi.fn();
    class FakeSocket {
      static CLOSED = 3;
      static instances = [];
      constructor(url) {
        this.url = url;
        this.readyState = 0;
        FakeSocket.instances.push(this);
      }
      close = vi.fn();
    }
    cleanup = createSongMapConnection({
      WebSocketClass: FakeSocket,
      hostname: "host.local",
      port: "9000",
      doc,
      onConnected,
      onSongData,
    });
    const socket = FakeSocket.instances[0];
    expect(socket.url).toBe("ws://host.local:9000");
    socket.onopen();
    socket.onmessage({
      data: JSON.stringify({
        event: "SONG_MAP_UPDATED",
        payload: '{"key":"D"}',
      }),
    });
    socket.onclose();
    expect(onConnected.mock.calls).toEqual([[true], [false]]);
    expect(onSongData).toHaveBeenCalledWith({
      kind: "song",
      payload: { key: "D" },
      songKey: "D",
    });
    cleanup();
    expect(doc.removeEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    expect(socket.close).toHaveBeenCalledOnce();
    expect(socket.onmessage).toBeNull();
    cleanup = null;
  });

  it("reconnects after closure, on visibility, and after constructor failure", () => {
    vi.useFakeTimers();
    const doc = makeDocument();
    class FakeSocket {
      static CLOSED = 3;
      static instances = [];
      constructor() {
        this.readyState = 0;
        FakeSocket.instances.push(this);
      }
      close = vi.fn();
    }
    cleanup = createSongMapConnection({
      WebSocketClass: FakeSocket,
      hostname: "",
      doc,
      reconnectDelay: 10,
    });
    FakeSocket.instances[0].readyState = FakeSocket.CLOSED;
    FakeSocket.instances[0].onclose();
    doc.visibilityState = "visible";
    doc.addEventListener.mock.calls[0][1]();
    expect(FakeSocket.instances).toHaveLength(2);
    FakeSocket.instances[1].readyState = FakeSocket.CLOSED;
    doc.addEventListener.mock.calls[0][1]();
    expect(FakeSocket.instances).toHaveLength(3);
    cleanup();
    cleanup = null;

    class ThrowingSocket {
      constructor() {
        throw new Error("construction failed");
      }
    }
    const onError = vi.fn();
    cleanup = createSongMapConnection({
      WebSocketClass: ThrowingSocket,
      doc,
      onError,
      reconnectDelay: 10,
    });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "construction failed" }),
    );
    vi.advanceTimersByTime(10);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it("cancels pending reconnect on cleanup and reports socket errors", () => {
    vi.useFakeTimers();
    const doc = makeDocument();
    const onError = vi.fn();
    class FakeSocket {
      static CLOSED = 3;
      static instances = [];
      constructor() {
        FakeSocket.instances.push(this);
      }
      close = vi.fn();
    }
    cleanup = createSongMapConnection({
      WebSocketClass: FakeSocket,
      hostname: "localhost",
      doc,
      onError,
    });
    const socket = FakeSocket.instances[0];
    socket.onerror("socket error");
    socket.onclose();
    cleanup();
    cleanup = null;
    vi.runOnlyPendingTimers();
    expect(onError).toHaveBeenCalledWith("socket error");
    expect(FakeSocket.instances).toHaveLength(1);
  });
});
