package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"harmonysync-media-engine/api"
	"harmonysync-media-engine/audio"
	"harmonysync-media-engine/events"
	"harmonysync-media-engine/image"
	"harmonysync-media-engine/video"
)

func main() {
	// Configuration
	port := "3001"
	if envPort := os.Getenv("PORT"); envPort != "" {
		port = envPort
	}

	// Initialize Event Bus
	eventBus := events.NewEventBus()

	// Initialize Audio Service
	audioService, err := audio.NewService(eventBus)
	if err != nil {
		log.Fatal("Failed to initialize audio service:", err)
	}

	// Initialize Video Service
	videoService := video.NewService(eventBus)

	// Initialize Image Service
	imageService := image.NewService()

	// Initialize API router
	routerWrapper := api.NewRouter(audioService, videoService, imageService, eventBus)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: routerWrapper.Handler,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("🚀 HarmonySync Media Engine starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}
