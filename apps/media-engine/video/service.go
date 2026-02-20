package video

import (
	"bufio"
	"fmt"
	"log"
	"os/exec"
	"path/filepath"
	"strings"

	"harmonysync-media-engine/events"
)

type Service struct {
	EventBus *events.EventBus
}

func NewService(eb *events.EventBus) *Service {
	return &Service{EventBus: eb}
}

// TranscodeRequest defines parameters for a transcoding job
type TranscodeRequest struct {
	InputPath  string `json:"inputPath"`
	OutputPath string `json:"outputPath"`
	Format     string `json:"format"` // e.g. "mp4"
}

func (s *Service) Transcode(req TranscodeRequest) error {
	log.Printf("Starting transcoding: %s -> %s", req.InputPath, req.OutputPath)

	// Notify start
	s.EventBus.Broadcast(map[string]interface{}{
		"type":  "video_transcode_start",
		"input": req.InputPath,
	})

	// Construct FFmpeg command
	cmd := exec.Command("ffmpeg", "-y", "-i", req.InputPath, "-c:v", "libx264", "-c:a", "aac", req.OutputPath)

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	// Parse progress in a goroutine
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.Contains(line, "time=") {
				s.EventBus.Broadcast(map[string]interface{}{
					"type": "video_transcode_progress",
					"data": line,
				})
			}
		}
	}()

	if err := cmd.Wait(); err != nil {
		s.EventBus.Broadcast(map[string]interface{}{
			"type":  "video_transcode_error",
			"error": err.Error(),
		})
		return fmt.Errorf("transcoding failed: %w", err)
	}

	s.EventBus.Broadcast(map[string]interface{}{
		"type":   "video_transcode_complete",
		"output": req.OutputPath,
	})

	return nil
}

func (s *Service) GenerateThumbnail(videoPath string, timeOffset string) (string, error) {
	outputPath := strings.TrimSuffix(videoPath, filepath.Ext(videoPath)) + "_thumb.jpg"

	cmd := exec.Command("ffmpeg", "-y", "-ss", timeOffset, "-i", videoPath, "-vframes", "1", "-q:v", "2", outputPath)
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("thumbnail generation failed: %w", err)
	}

	return outputPath, nil
}
