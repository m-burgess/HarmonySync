#!/bin/bash

# HarmonySync Development Server Script
# Usage: ./dev.sh

echo "=========================================="
echo "HarmonySync Full Stack Development Server"
echo "=========================================="
echo ""

echo "Building Go Media Engine..."
(cd apps/media-engine && go build -o harmonysync-media-engine)

echo "Starting Desktop App (Electron & Angular)..."
pnpm run dev
