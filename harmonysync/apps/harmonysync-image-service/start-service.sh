#!/bin/bash

# Start HarmonySync Image Service
# This script starts the image processing service with environment variables

export HOST=127.0.0.1
export PORT=3003
export MAX_CONCURRENT_JOBS=3
export SHUTDOWN_TOKEN=$(uuidgen 2>/dev/null || echo "image-service-token-$(date +%s)")

echo "🖼️  Starting HarmonySync Image Service..."
echo "📍 Host: $HOST"
echo "🔌 Port: $PORT"
echo "⚙️  Max Concurrent Jobs: $MAX_CONCURRENT_JOBS"
echo "🔐 Shutdown Token: $SHUTDOWN_TOKEN"

node server.js
