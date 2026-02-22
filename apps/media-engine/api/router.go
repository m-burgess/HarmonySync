package api

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"harmonysync-media-engine/audio"
	"harmonysync-media-engine/events"
	"harmonysync-media-engine/image"
	"harmonysync-media-engine/video"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins for now (development)
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Router struct {
	Handler  http.Handler
	EventBus *events.EventBus
}

func NewRouter(audioService *audio.Service, videoService *video.Service, imageService *image.Service, eventBus *events.EventBus) *Router {
	mux := http.NewServeMux()

	// Handlers
	audioHandler := NewAudioHandler(audioService)
	videoHandler := NewVideoHandler(videoService)
	imageHandler := NewImageHandler(imageService)

	// Health check
	mux.HandleFunc("/health", handleHealth)

	// Middleware
	enableCors := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}

	// WebSocket endpoint
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		// WebSocket upgrader handles its own CORS via CheckOrigin
		handleWebSocket(w, r, eventBus)
	})

	// Audio Endpoints
	mux.HandleFunc("/api/songs/create", audioHandler.HandleCreateSong)
	mux.HandleFunc("/api/mixer/play", audioHandler.HandlePlay)
	mux.HandleFunc("/api/mixer/pause", audioHandler.HandlePause)
	mux.HandleFunc("/api/mixer/stop", audioHandler.HandleStop)
	mux.HandleFunc("/api/mixer/volume", audioHandler.HandleSetVolume)
	mux.HandleFunc("/api/mixer/pan", audioHandler.HandleSetPan)
	mux.HandleFunc("/api/mixer/mute", audioHandler.HandleSetMute)
	mux.HandleFunc("/api/songs/transpose", audioHandler.HandleTransposeSong)

	// Video Endpoints
	mux.HandleFunc("/api/video/transcode", videoHandler.HandleTranscode)
	mux.HandleFunc("/api/video/thumbnail", videoHandler.HandleThumbnail)
	mux.HandleFunc("/api/video/stream", videoHandler.HandleStream)

	// Image Endpoints
	mux.HandleFunc("/api/image/resize", imageHandler.HandleResize)
	mux.HandleFunc("/api/image/convert", imageHandler.HandleConvert)

	// Wrap the mux with global CORS handler
	handler := enableCors(mux)

	// Create a wrapper struct that exposes the Handler instead of just Mux
	return &Router{Handler: handler, EventBus: eventBus}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"service": "harmonysync-media-engine",
		"time":    time.Now().String(),
	})
}

func handleWebSocket(w http.ResponseWriter, r *http.Request, eb *events.EventBus) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	eb.Register(conn)
	defer eb.Unregister(conn)

	log.Println("Client connected")

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			log.Println("Read error:", err)
			break
		}
	}
}
