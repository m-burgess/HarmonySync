package mixer

import (
	"fmt"
	"math"
	"os"
	"strings"
	"sync"

	"github.com/gopxl/beep"
	"github.com/gopxl/beep/effects"
	"github.com/gopxl/beep/flac"
	"github.com/gopxl/beep/mp3"
	"github.com/gopxl/beep/vorbis"
	"github.com/gopxl/beep/wav"
)

// Track represents a single audio track
type Track struct {
	ID       string
	Path     string
	Streamer beep.StreamSeekCloser
	Format   beep.Format
	Buffer   *beep.Buffer

	// Effects chain
	Volume *effects.Volume
	Pan    *effects.Pan
	Ctrl   *beep.Ctrl
}

// Mixer manages multiple songs, each containing multiple tracks.
// Only one song is active at a time; switching is instant.
type Mixer struct {
	mu             sync.Mutex
	Songs          map[string]map[string]*Track // songId -> trackId -> Track
	ActiveSongID   string
	Tracks         map[string]*Track // legacy flat map (kept for backward compat)
	inner          *beep.Mixer
	MasterVolume   *effects.Volume
	SampleRate     beep.SampleRate
	OnSongFinished func(songID string)
	TotalSamples   int64
}

// Stream implements beep.Streamer, delegating to the master volume node.
func (m *Mixer) Stream(samples [][2]float64) (n int, ok bool) {
	m.mu.Lock()
	master := m.MasterVolume
	m.mu.Unlock()
	n, _ = master.Stream(samples)
	
	// Fill the remainder of the buffer with silence so the speaker never drops the mixer
	for i := n; i < len(samples); i++ {
		samples[i][0] = 0
		samples[i][1] = 0
	}

	if n > 0 && m.IsPlaying() {
		m.mu.Lock()
		m.TotalSamples += int64(n)
		m.mu.Unlock()
	}
	// Always return len(samples) and true so it plays forever
	return len(samples), true
}

// GetPosition returns the current playback position in seconds
func (m *Mixer) GetPosition() float64 {
	m.mu.Lock()
	defer m.mu.Unlock()
	return float64(m.TotalSamples) / float64(m.SampleRate)
}

// IsPlaying returns true if any track in the active song is unpaused
func (m *Mixer) IsPlaying() bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, t := range m.Tracks {
		if !t.Ctrl.Paused {
			return true
		}
	}
	return false
}

// GetActiveSongID returns the ID of the currently active song
func (m *Mixer) GetActiveSongID() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.ActiveSongID
}

// Err implements beep.Streamer
func (m *Mixer) Err() error {
	return nil
}

// NewMixer creates a new mixer instance
func NewMixer(sr beep.SampleRate) *Mixer {
	inner := &beep.Mixer{}
	masterVol := &effects.Volume{Streamer: inner, Base: 2, Volume: 0, Silent: false}
	
	m := &Mixer{
		Songs:        make(map[string]map[string]*Track),
		Tracks:       make(map[string]*Track),
		inner:        inner,
		MasterVolume: masterVol,
		SampleRate:   sr,
	}
	return m
}

// decodeFile opens and decodes an audio file, returning the streamer and format
func decodeFile(filePath string) (beep.StreamSeekCloser, beep.Format, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, beep.Format{}, err
	}

	var streamer beep.StreamSeekCloser
	var format beep.Format

	ext := strings.ToLower(filePath)
	if strings.HasSuffix(ext, ".mp3") {
		streamer, format, err = mp3.Decode(f)
	} else if strings.HasSuffix(ext, ".wav") {
		streamer, format, err = wav.Decode(f)
	} else if strings.HasSuffix(ext, ".ogg") {
		streamer, format, err = vorbis.Decode(f)
	} else if strings.HasSuffix(ext, ".flac") {
		streamer, format, err = flac.Decode(f)
	} else {
		// Try wav as fallback
		streamer, format, err = wav.Decode(f)
	}

	if err != nil {
		f.Close()
		return nil, beep.Format{}, fmt.Errorf("failed to decode: %v", err)
	}

	return streamer, format, nil
}

// buildTrack decodes, resamples, buffers, and creates the effects chain for a track
func (m *Mixer) buildTrack(id, filePath string, panValue float64) (*Track, error) {
	fmt.Fprintf(os.Stderr, "[Mixer] buildTrack %s: pan=%f\n", id, panValue)
	streamer, format, err := decodeFile(filePath)
	if err != nil {
		return nil, err
	}

	// Resample if necessary
	var resampled beep.Streamer = streamer
	if format.SampleRate != m.SampleRate {
		fmt.Fprintf(os.Stderr, "Resampling track %s from %v to %v\n", id, format.SampleRate, m.SampleRate)
		resampled = beep.Resample(4, format.SampleRate, m.SampleRate, streamer)
	}

	fmt.Fprintf(os.Stderr, "Track %s format: SampleRate=%v, NumChannels=%d\n", id, format.SampleRate, format.NumChannels)

	// Buffer the whole track in memory
	buffer := beep.NewBuffer(format)
	buffer.Append(resampled)
	streamer.Close()

	fmt.Fprintf(os.Stderr, "Track %s buffered: %d samples\n", id, buffer.Len())

	// Create playback chain — start paused
	bufStream := buffer.Streamer(0, buffer.Len())
	ctrl := &beep.Ctrl{Streamer: bufStream, Paused: true}
	vol := &effects.Volume{Streamer: ctrl, Base: 2, Volume: 0, Silent: false}
	pan := &effects.Pan{Streamer: vol, Pan: panValue}

	return &Track{
		ID:     id,
		Path:   filePath,
		Format: format,
		Buffer: buffer,
		Volume: vol,
		Pan:    pan,
		Ctrl:   ctrl,
	}, nil
}

// LoadSongTrack loads a track into a specific song group (does NOT add to inner mixer)
func (m *Mixer) LoadSongTrack(songID, trackID, filePath string, pan float64) error {
	track, err := m.buildTrack(trackID, filePath, pan)
	if err != nil {
		return err
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Create song group if needed
	if m.Songs[songID] == nil {
		m.Songs[songID] = make(map[string]*Track)
	}
	m.Songs[songID][trackID] = track

	// If this song is already active, also add to inner mixer
	if m.ActiveSongID == songID {
		m.inner.Add(track.Pan)
	}

	return nil
}

// ActivateSong switches playback to a different song.
// Pauses+rewinds the old song's tracks, removes them from mixer,
// adds the new song's tracks, and unpauses them.
func (m *Mixer) ActivateSong(songID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.Songs[songID]; !ok {
		return fmt.Errorf("song %s not found", songID)
	}

	// Deactivate current song (if any)
	if m.ActiveSongID != "" && m.ActiveSongID != songID {
		if oldTracks, ok := m.Songs[m.ActiveSongID]; ok {
			for _, t := range oldTracks {
				t.Ctrl.Paused = true
				// Rewind for next time
				t.Ctrl.Streamer = t.Buffer.Streamer(0, t.Buffer.Len())
			}
		}
	}

	// Rebuild inner mixer with only the new song's tracks
	m.inner = &beep.Mixer{}
	m.MasterVolume.Streamer = m.inner
	newTracks := m.Songs[songID]
	first := true
	for _, t := range newTracks {
		// Keep them paused — Play() will unpause
		t.Ctrl.Paused = true
		t.Ctrl.Streamer = t.Buffer.Streamer(0, t.Buffer.Len())

		if first && m.OnSongFinished != nil {
			id := songID
			t.Ctrl.Streamer = beep.Seq(t.Ctrl.Streamer, beep.Callback(func() {
				if m.OnSongFinished != nil {
					m.OnSongFinished(id)
				}
			}))
			first = false
		}

		m.inner.Add(t.Pan)
	}

	m.ActiveSongID = songID

	// Also update legacy flat Tracks map for backward compat
	m.Tracks = newTracks

	return nil
}

// SetTrackPan sets the pan of a specific track (-1.0 to 1.0)
func (m *Mixer) SetTrackPan(trackID string, pan float64) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Search in active song first
	if m.ActiveSongID != "" {
		if tracks, ok := m.Songs[m.ActiveSongID]; ok {
			if track, ok := tracks[trackID]; ok {
				track.Pan.Pan = pan
				return nil
			}
		}
	}

	// Search in all songs (fallback)
	for _, tracks := range m.Songs {
		if track, ok := tracks[trackID]; ok {
			track.Pan.Pan = pan
			return nil
		}
	}

	return fmt.Errorf("track %s not found", trackID)
}

// ClearSong removes one song's tracks from memory
func (m *Mixer) ClearSong(songID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// If clearing the active song, stop playback first
	if m.ActiveSongID == songID {
		m.inner = &beep.Mixer{}
		m.MasterVolume.Streamer = m.inner
		m.ActiveSongID = ""
		m.Tracks = make(map[string]*Track)
	}

	delete(m.Songs, songID)
}

// LoadTrack loads a track into the legacy flat map (backward compatible)
func (m *Mixer) LoadTrack(id, path string) error {
	track, err := m.buildTrack(id, path, 0.0)
	if err != nil {
		return err
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.Tracks[id] = track
	m.inner.Add(track.Pan)

	return nil
}

// Play starts playback for the active song's tracks
func (m *Mixer) Play() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.Tracks {
		t.Ctrl.Paused = false
	}
}

// Pause pauses playback for the active song's tracks
func (m *Mixer) Pause() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.Tracks {
		t.Ctrl.Paused = true
	}
}

// Stop stops playback and rewinds the active song's tracks
func (m *Mixer) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.TotalSamples = 0
	for _, t := range m.Tracks {
		t.Ctrl.Paused = true
		t.Ctrl.Streamer = t.Buffer.Streamer(0, t.Buffer.Len())
	}
}

// SetTrackVolume sets the volume of a track
func (m *Mixer) SetTrackVolume(id string, volume float64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if t, ok := m.Tracks[id]; ok {
		if volume <= 0.001 {
			t.Volume.Silent = true
		} else {
			t.Volume.Silent = false
			t.Volume.Volume = math.Log2(volume)
		}
	}
}

// SetTrackMute mutes a track
func (m *Mixer) SetTrackMute(id string, muted bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if t, ok := m.Tracks[id]; ok {
		t.Volume.Silent = muted
	}
}

// Clear clears all tracks and songs
func (m *Mixer) Clear() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Tracks = make(map[string]*Track)
	m.Songs = make(map[string]map[string]*Track)
	m.ActiveSongID = ""
	m.inner = &beep.Mixer{}
	m.MasterVolume.Streamer = m.inner
}

// SetMasterVolume sets the overall volume of the mixer
func (m *Mixer) SetMasterVolume(volume float64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if volume <= 0.001 {
		m.MasterVolume.Silent = true
	} else {
		m.MasterVolume.Silent = false
		m.MasterVolume.Volume = math.Log2(volume)
	}
}
