#!/bin/bash

# Start HarmonySync Video Service
# This script starts the video processing service with environment variables

export HOST=127.0.0.1
export PORT=3002
export SHUTDOWN_TOKEN=$(uuidgen 2>/dev/null || echo "video-service-token-$(date +%s)")

echo "🎬 Starting HarmonySync Video Service..."
echo "📍 Host: $HOST"
echo "🔌 Port: $PORT"
echo "🔐 Shutdown Token: $SHUTDOWN_TOKEN"

node server.js
