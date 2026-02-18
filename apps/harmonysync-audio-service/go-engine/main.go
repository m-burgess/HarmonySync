package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"harmonysync-audio-engine/mixer"

	"github.com/gopxl/beep"
	"github.com/gopxl/beep/speaker"
)

// Command represents an incoming JSON-RPC command
type Command struct {
	Op   string          `json:"op"`
	Args json.RawMessage `json:"args"`
}

// LoadArgs arguments for loading a track
type LoadArgs struct {
	ID   string `json:"id"`
	Path string `json:"path"`
}

// VolumeArgs arguments for setting volume
type VolumeArgs struct {
	ID     string  `json:"id"`
	Volume float64 `json:"volume"`
}

// PanArgs arguments for setting pan
type PanArgs struct {
	ID  string  `json:"id"`
	Pan float64 `json:"pan"`
}

// MuteArgs arguments for setting mute
type MuteArgs struct {
	ID    string `json:"id"`
	Muted bool   `json:"muted"`
}

// SongTrackArgs arguments for loading a track into a song
type SongTrackArgs struct {
	SongID  string `json:"songId"`
	TrackID string `json:"trackId"`
	Path    string `json:"path"`
}

// SongArgs arguments for song operations
type SongArgs struct {
	SongID string `json:"songId"`
}

func main() {
	// Initialize speaker (44100 Hz sample rate)
	sr := beep.SampleRate(44100)
	speaker.Init(sr, sr.N(time.Second/10))

	// Create mixer
	m := mixer.NewMixer(sr)
	speaker.Play(m)

	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		line := scanner.Bytes()
		var cmd Command
		if err := json.Unmarshal(line, &cmd); err != nil {
			logError("Invalid JSON: %v", err)
			continue
		}

		handleCommand(m, cmd)
	}

	if err := scanner.Err(); err != nil {
		logError("Scanner error: %v", err)
	}
}

func handleCommand(m *mixer.Mixer, cmd Command) {
	switch cmd.Op {
	case "load":
		var args LoadArgs
		if err := json.Unmarshal(cmd.Args, &args); err != nil {
			logError("Invalid args for load: %v", err)
			return
		}
		// Convert relative path to absolute if needed
		absPath, err := filepath.Abs(args.Path)
		if err != nil {
			logError("Failed to resolve path: %v", err)
			return
		}
		if err := m.LoadTrack(args.ID, absPath); err != nil {
			logError("Failed to load track %s: %v", args.ID, err)
		} else {
			logSuccess("Loaded track %s", args.ID)
		}

	case "play":
		m.Play()
		logSuccess("Playback started")

	case "stop":
		m.Stop()
		logSuccess("Playback stopped")

	case "pause":
		m.Pause()
		logSuccess("Playback paused")

	case "setVolume":
		var args VolumeArgs
		if err := json.Unmarshal(cmd.Args, &args); err != nil {
			logError("Invalid args for setVolume: %v", err)
			return
		}
		m.SetTrackVolume(args.ID, args.Volume)

	case "setPan":
		var args PanArgs
		if err := json.Unmarshal(cmd.Args, &args); err != nil {
			logError("Invalid args for setPan: %v", err)
			return
		}
		m.SetTrackPan(args.ID, args.Pan)

	case "setMute":
		var args MuteArgs
		if err := json.Unmarshal(cmd.Args, &args); err != nil {
			logError("Invalid args for setMute: %v", err)
			return
		}
		m.SetTrackMute(args.ID, args.Muted)

	case "clear":
		m.Clear()
		logSuccess("Cleared all tracks and songs")

	case "loadSongTrack":
		var args SongTrackArgs
		if err := json.Unmarshal(cmd.Args, &args); err != nil {
			logError("Invalid args for loadSongTrack: %v", err)
			return
		}
		absPath, err := filepath.Abs(args.Path)
		if err != nil {
			logError("Failed to resolve path: %v", err)
			return
		}
		if err := m.LoadSongTrack(args.SongID, args.TrackID, absPath); err != nil {
			logError("Failed to load song track %s/%s: %v", args.SongID, args.TrackID, err)
		} else {
			logSuccess("Loaded track %s for song %s", args.TrackID, args.SongID)
		}

	case "activateSong":
		var args SongArgs
		if err := json.Unmarshal(cmd.Args, &args); err != nil {
			logError("Invalid args for activateSong: %v", err)
			return
		}
		if err := m.ActivateSong(args.SongID); err != nil {
			logError("Failed to activate song %s: %v", args.SongID, err)
		} else {
			logSuccess("Activated song %s", args.SongID)
		}

	case "clearSong":
		var args SongArgs
		if err := json.Unmarshal(cmd.Args, &args); err != nil {
			logError("Invalid args for clearSong: %v", err)
			return
		}
		m.ClearSong(args.SongID)
		logSuccess("Cleared song %s", args.SongID)

	default:
		logError("Unknown command: %s", cmd.Op)
	}
}

func logError(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	// JSON log for the parent process
	fmt.Printf("{\"level\":\"error\", \"message\":%q}\n", msg)
}

func logSuccess(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	fmt.Printf("{\"level\":\"info\", \"message\":%q}\n", msg)
}
