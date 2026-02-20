package api

import (
	"encoding/json"
	"net/http"

	"harmonysync-media-engine/image"
)

type ImageHandler struct {
	Service *image.Service
}

func NewImageHandler(service *image.Service) *ImageHandler {
	return &ImageHandler{Service: service}
}

func (h *ImageHandler) HandleResize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req image.ResizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.Service.Resize(req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "image resized", "path": req.OutputPath})
}

func (h *ImageHandler) HandleConvert(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		InputPath  string `json:"inputPath"`
		OutputPath string `json:"outputPath"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.Service.Convert(req.InputPath, req.OutputPath); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "image converted", "path": req.OutputPath})
}
