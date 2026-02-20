package image

import (
	"fmt"
	"log"
	"os/exec"
)

type Service struct {
}

func NewService() *Service {
	return &Service{}
}

// ResizeRequest defines parameters for resizing an image
type ResizeRequest struct {
	InputPath  string `json:"inputPath"`
	OutputPath string `json:"outputPath"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
}

func (s *Service) Resize(req ResizeRequest) error {
	log.Printf("Resizing image: %s -> %s (%dx%d)", req.InputPath, req.OutputPath, req.Width, req.Height)

	// FFmpeg scale filter
	// scale=w:h
	// If one dimension is -1, it maintains aspect ratio.
	scale := fmt.Sprintf("scale=%d:%d", req.Width, req.Height)

	cmd := exec.Command("ffmpeg", "-y", "-i", req.InputPath, "-vf", scale, req.OutputPath)

	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("resize failed: %s, output: %s", err, string(output))
	}

	return nil
}

func (s *Service) Convert(inputPath, outputPath string) error {
	log.Printf("Converting image: %s -> %s", inputPath, outputPath)

	// FFmpeg handles format conversion by extension
	cmd := exec.Command("ffmpeg", "-y", "-i", inputPath, outputPath)

	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("convert failed: %s, output: %s", err, string(output))
	}

	return nil
}
