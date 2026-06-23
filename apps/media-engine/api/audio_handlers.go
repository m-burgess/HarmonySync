package api

import (
	"encoding/json"
	"net/http"

	"harmonysync-media-engine/audio"
)

type AudioHandler struct {
	Service *audio.Service
}

func NewAudioHandler(service *audio.Service) *AudioHandler {
	return &AudioHandler{Service: service}
}

// Handler functions
func (h *AudioHandler) HandleCreateSong(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ID     string            `json:"id"`
		Tracks []audio.TrackInfo `json:"tracks"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.Service.LoadSong(req.ID, req.Tracks); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Auto-activate for now (can be separate step if needed)
	if err := h.Service.ActivateSong(req.ID); err != nil {
		http.Error(w, "Failed to activate song: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "song created", "id": req.ID})
}

func (h *AudioHandler) HandlePlay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	h.Service.Play()
	w.WriteHeader(http.StatusOK)
}

func (h *AudioHandler) HandlePause(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	h.Service.Pause()
	w.WriteHeader(http.StatusOK)
}

func (h *AudioHandler) HandleStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	h.Service.Stop()
	w.WriteHeader(http.StatusOK)
}

func (h *AudioHandler) HandleSetVolume(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TrackID string  `json:"trackId"`
		Volume  float64 `json:"volume"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	h.Service.SetVolume(req.TrackID, req.Volume)
	w.WriteHeader(http.StatusOK)
}

func (h *AudioHandler) HandleSetMasterVolume(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Volume float64 `json:"volume"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	h.Service.SetMasterVolume(req.Volume)
	w.WriteHeader(http.StatusOK)
}

func (h *AudioHandler) HandleSetPan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TrackID string  `json:"trackId"`
		Pan     float64 `json:"pan"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	h.Service.SetPan(req.TrackID, req.Pan)
	w.WriteHeader(http.StatusOK)
}

func (h *AudioHandler) HandleSetMute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TrackID string `json:"trackId"`
		Muted   bool   `json:"muted"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	h.Service.SetMute(req.TrackID, req.Muted)
	w.WriteHeader(http.StatusOK)
}

func (h *AudioHandler) HandleTransposeSong(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		SongID    string `json:"songId"`
		Semitones int    `json:"semitones"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.Service.TransposeSong(req.SongID, req.Semitones); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
