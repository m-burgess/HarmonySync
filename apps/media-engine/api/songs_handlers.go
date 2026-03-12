package api

import (
	"encoding/json"
	"log"
	"net/http"

	"harmonysync-media-engine/songs"
)

type SongsHandler struct {
}

func NewSongsHandler() *SongsHandler {
	return &SongsHandler{}
}

func (h *SongsHandler) HandleParseSongMap(w http.ResponseWriter, r *http.Request) {
	log.Printf("[SongsHandler] Request received: %s %s", r.Method, r.URL.Path)
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	filePath := r.URL.Query().Get("filePath")
	if filePath == "" {
		http.Error(w, "filePath is required", http.StatusBadRequest)
		return
	}

	songMap, err := songs.ParseSongMap(filePath)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(songMap)
}
