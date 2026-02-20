package api

import (
	"encoding/json"
	"net/http"

	"harmonysync-media-engine/video"
)

type VideoHandler struct {
	Service *video.Service
}

func NewVideoHandler(service *video.Service) *VideoHandler {
	return &VideoHandler{Service: service}
}

func (h *VideoHandler) HandleTranscode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req video.TranscodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	go func() {
		if err := h.Service.Transcode(req); err != nil {
			// Error logged in service
		}
	}()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "transcoding started"})
}

func (h *VideoHandler) HandleThumbnail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Path string `json:"path"`
		Time string `json:"time"` // default "00:00:01"
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Time == "" {
		req.Time = "00:00:01"
	}

	thumbPath, err := h.Service.GenerateThumbnail(req.Path, req.Time)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"path": thumbPath})
}

func (h *VideoHandler) HandleStream(w http.ResponseWriter, r *http.Request) {
	// Simple streaming handler: ?path=...
	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "Missing path parameter", http.StatusBadRequest)
		return
	}

	http.ServeFile(w, r, path)
}
