package audio

import (
	"fmt"
	"log"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
)

type TranspositionService struct {
	TempDir          string
	ExcludedKeywords []string
}

func NewTranspositionService() *TranspositionService {
	tempDir := filepath.Join(os.TempDir(), "harmonysync-transposed")
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		log.Printf("Warning: Failed to create temp dir %s: %v", tempDir, err)
	}

	return &TranspositionService{
		TempDir: tempDir,
		ExcludedKeywords: []string{
			"click", "guide", "metronome", "drum", "perc", "shaker", "tambourine",
		},
	}
}

// TransposeSong returns a map of trackID -> filePath
func (s *TranspositionService) TransposeSong(tracks []TrackInfo, semitones int) (map[string]string, error) {
	if semitones == 0 {
		result := make(map[string]string)
		for _, t := range tracks {
			result[t.ID] = t.Path
		}
		return result, nil
	}

	result := make(map[string]string)
	var mu sync.Mutex
	var wg sync.WaitGroup
	errChan := make(chan error, len(tracks))

	for _, track := range tracks {
		wg.Add(1)
		go func(t TrackInfo) {
			defer wg.Done()

			path, err := s.processTrack(t, semitones)
			if err != nil {
				errChan <- fmt.Errorf("failed to transpose track %s: %w", t.ID, err)
				return
			}

			mu.Lock()
			result[t.ID] = path
			mu.Unlock()
		}(track)
	}

	wg.Wait()
	close(errChan)

	if len(errChan) > 0 {
		return nil, <-errChan
	}

	return result, nil
}

func (s *TranspositionService) processTrack(track TrackInfo, semitones int) (string, error) {
	// Check exclusions
	lowerPath := strings.ToLower(track.Path)
	// We should probably check the track name/ID if available, but path usually contains the name
	// The previous implementation checked 'track.name', here we have ID and Path.
	// Let's check both ID and Path just to be safe.
	for _, keyword := range s.ExcludedKeywords {
		if strings.Contains(strings.ToLower(track.ID), keyword) || strings.Contains(lowerPath, keyword) {
			log.Printf("Skipping transposition for %s (excluded keyword)", track.ID)
			return track.Path, nil
		}
	}

	ext := filepath.Ext(track.Path)
	baseName := strings.TrimSuffix(filepath.Base(track.Path), ext)

	sign := ""
	if semitones > 0 {
		sign = "+"
	}
	newFileName := fmt.Sprintf("%s_t%s%d%s", baseName, sign, semitones, ext)
	outputPath := filepath.Join(s.TempDir, newFileName)

	// Check cache
	if _, err := os.Stat(outputPath); err == nil {
		return outputPath, nil
	}

	// Detect Sample Rate
	sampleRate, err := s.getSampleRate(track.Path)
	if err != nil {
		log.Printf("Warning: Failed to detect sample rate for %s, defaulting to 44100: %v", track.Path, err)
		sampleRate = 44100
	}

	// Calculate filters
	factor := math.Pow(2, float64(semitones)/12.0)
	atempo := 1.0 / factor

	// Build filter string
	filter := fmt.Sprintf("asetrate=%d*%f,atempo=%f", sampleRate, factor, atempo)

	cmd := exec.Command("ffmpeg", "-y", "-i", track.Path, "-af", filter, outputPath)

	// Capture output for debugging if needed, but usually we just want to know if it failed
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("ffmpeg failed: %s, output: %s", err, string(output))
	}

	return outputPath, nil
}

func (s *TranspositionService) Cleanup() {
	os.RemoveAll(s.TempDir)
}

func (s *TranspositionService) getSampleRate(path string) (int, error) {
	cmd := exec.Command("ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate", "-of", "default=noprint_wrappers=1:nokey=1", path)
	output, err := cmd.Output()
	if err != nil {
		return 0, err
	}
	var rate int
	_, err = fmt.Sscanf(strings.TrimSpace(string(output)), "%d", &rate)
	return rate, err
}
