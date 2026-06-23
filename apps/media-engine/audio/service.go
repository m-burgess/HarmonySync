package audio

import (
	"fmt"
	"log"
	"sync"
	"time"

	"harmonysync-media-engine/audio/mixer"
	"harmonysync-media-engine/events"

	"github.com/gopxl/beep"
	"github.com/gopxl/beep/speaker"
)

type Service struct {
	Mixer         *mixer.Mixer
	Transposition *TranspositionService
	Songs         map[string]SongData
	EventBus      *events.EventBus
}

type SongData struct {
	ID     string
	Tracks []TrackInfo
}

// TrackInfo represents metadata for a loaded track
type TrackInfo struct {
	ID       string  `json:"id"`
	Path     string  `json:"path"`
	Duration float64 `json:"duration"` // Seconds
	Pan      float64 `json:"pan"`      // -1.0 (Left) to 1.0 (Right)
}

func NewService(eb *events.EventBus) (*Service, error) {
	sr := beep.SampleRate(44100)
	if err := speaker.Init(sr, sr.N(time.Second/10)); err != nil {
		return nil, fmt.Errorf("failed to initialize speaker: %w", err)
	}

	m := mixer.NewMixer(sr)

	speaker.Play(m)

	s := &Service{
		Mixer:         m,
		Transposition: NewTranspositionService(),
		Songs:         make(map[string]SongData),
		EventBus:      eb,
	}

	m.OnSongFinished = func(songID string) {
		log.Printf("Playback finished for song %s", songID)
		s.EventBus.Broadcast(map[string]interface{}{
			"type":   "audio_finished",
			"songId": songID,
		})
	}

	go s.monitorPlayback()

	return s, nil
}

func (s *Service) monitorPlayback() {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		<-ticker.C
		if s.Mixer.ActiveSongID != "" {
			isPlaying := s.Mixer.IsPlaying()
			pos := s.Mixer.GetPosition()
			log.Printf("monitorPlayback: ActiveSongID=%s, IsPlaying=%v, Pos=%.2f", s.Mixer.ActiveSongID, isPlaying, pos)
			if isPlaying {
				s.EventBus.Broadcast(map[string]interface{}{
					"type":     "playback_position",
					"songId":   s.Mixer.ActiveSongID,
					"position": pos,
				})
			}
		}
	}
}

func (s *Service) LoadSong(songID string, tracks []TrackInfo) error {
	log.Printf("Loading song %s with %d tracks (parallel)", songID, len(tracks))

	s.Songs[songID] = SongData{
		ID:     songID,
		Tracks: tracks,
	}

	var wg sync.WaitGroup
	errChan := make(chan error, len(tracks))

	// Use mutex for progress updates to avoid race conditions
	var progressMu sync.Mutex
	loadedCount := 0
	totalTracks := len(tracks)

	for _, track := range tracks {
		wg.Add(1)
		go func(t TrackInfo) {
			defer wg.Done()

			if err := s.Mixer.LoadSongTrack(songID, t.ID, t.Path, t.Pan); err != nil {
				errChan <- fmt.Errorf("failed to load track %s: %w", t.ID, err)
				return
			}

			// Update progress
			progressMu.Lock()
			loadedCount++
			current := loadedCount
			progressMu.Unlock()

			// Broadcast progress
			s.EventBus.Broadcast(map[string]interface{}{
				"type":    "audio_load_progress",
				"songId":  songID,
				"current": current,
				"total":   totalTracks,
			})
		}(track)
	}

	wg.Wait()
	close(errChan)

	// Check if any errors occurred
	if len(errChan) > 0 {
		return <-errChan // Return the first error
	}

	s.EventBus.Broadcast(map[string]interface{}{
		"type":   "audio_song_loaded",
		"songId": songID,
	})

	return nil
}

func (s *Service) TransposeSong(songID string, semitones int) error {
	log.Printf("Transposing song %s by %d semitones", songID, semitones)

	songData, ok := s.Songs[songID]
	if !ok {
		return fmt.Errorf("song %s not found", songID)
	}

	transposedMap, err := s.Transposition.TransposeSong(songData.Tracks, semitones)
	if err != nil {
		return err
	}

	for _, track := range songData.Tracks {
		newPath, ok := transposedMap[track.ID]
		if !ok {
			newPath = track.Path
		}

		if err := s.Mixer.LoadSongTrack(songID, track.ID, newPath, track.Pan); err != nil {
			return fmt.Errorf("failed to reload transposed track %s: %w", track.ID, err)
		}
	}

	if s.Mixer.ActiveSongID == songID {
		s.Mixer.ActivateSong(songID)
		s.Mixer.Play()
	}

	s.EventBus.Broadcast(map[string]interface{}{
		"type":      "audio_song_transposed",
		"songId":    songID,
		"semitones": semitones,
	})

	return nil
}

func (s *Service) ActivateSong(songID string) error {
	log.Printf("Activating song %s", songID)
	err := s.Mixer.ActivateSong(songID)
	if err == nil {
		s.EventBus.Broadcast(map[string]interface{}{
			"type":   "audio_song_activated",
			"songId": songID,
		})
	}
	return err
}

func (s *Service) Play() {
	s.Mixer.Play()
	s.EventBus.Broadcast(map[string]interface{}{"type": "audio_play"})
}

func (s *Service) Stop() {
	s.Mixer.Stop()
	s.EventBus.Broadcast(map[string]interface{}{"type": "audio_stop"})
}

func (s *Service) Pause() {
	s.Mixer.Pause()
	s.EventBus.Broadcast(map[string]interface{}{"type": "audio_pause"})
}

func (s *Service) SetVolume(trackID string, volume float64) {
	s.Mixer.SetTrackVolume(trackID, volume)
	// Broadcasting generic volume change might be too noisy if called frequently (e.g. slider drag)
	// But for now, let's do it.
	s.EventBus.Broadcast(map[string]interface{}{
		"type":    "audio_volume_changed",
		"trackId": trackID,
		"volume":  volume,
	})
}

func (s *Service) SetMasterVolume(volume float64) {
	s.Mixer.SetMasterVolume(volume)
	s.EventBus.Broadcast(map[string]interface{}{
		"type":   "audio_master_volume_changed",
		"volume": volume,
	})
}

func (s *Service) SetPan(trackID string, pan float64) {
	s.Mixer.SetTrackPan(trackID, pan)
}

func (s *Service) SetMute(trackID string, muted bool) {
	s.Mixer.SetTrackMute(trackID, muted)
}

func (s *Service) Clear() {
	s.Mixer.Clear()
	s.Songs = make(map[string]SongData)
	s.EventBus.Broadcast(map[string]interface{}{"type": "audio_cleared"})
}
