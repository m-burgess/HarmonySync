#!/bin/bash

# HarmonySync Full Repository Clean & Build Script
# This script performs a clean rebuild of all apps and packages
# Usage: ./dev-rebuild.sh

set -e  # Exit on error

echo "=========================================="
echo "HarmonySync Full Repository Clean & Build"
echo "=========================================="
echo ""

# Step 1: Clean all dist folders
echo "Step 1: Cleaning all dist folders..."
echo "  - Cleaning apps/electron-app..."
rm -rf apps/electron-app/dist

echo "  - Cleaning apps/renderer..."
rm -rf apps/renderer/dist

echo "  - Cleaning apps/control-app..."
rm -rf apps/control-app/dist

echo "  - Cleaning apps/mobile-app..."
rm -rf apps/mobile-app/dist

echo "  - Cleaning harmonysync services..."
rm -rf harmonysync-audio-service/dist
rm -rf harmonysync-image-service/dist
rm -rf harmonysync-video-service/dist
rm -rf harmonysync-folder-service/dist
rm -rf apps/harmonysync-audio-service/dist
rm -rf apps/harmonysync-image-service/dist
rm -rf apps/harmonysync-video-service/dist
rm -rf apps/harmonysync-folder-service/dist

echo "  - Cleaning packages/core..."
rm -rf packages/core/dist

echo "  - Cleaning packages/shared-logic..."
rm -rf packages/shared-logic/dist

echo "  - Cleaning packages/ui..."
rm -rf packages/ui/dist

echo "✅ All dist folders cleaned"
echo ""

# Step 2: Build all packages and apps
echo "Step 2: Building all packages and applications..."
pnpm run build
echo "✅ Build complete"
echo ""

echo "=========================================="
echo "Clean & Build Complete!"
echo "Run './dev.sh' to start the dev server"
echo "=========================================="
