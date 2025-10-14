#!/bin/bash

# HarmonySync Presenter - macOS Installer Build Script
# This script builds a macOS DMG installer for HarmonySync Presenter

set -e  # Exit on error

echo "=================================="
echo "HarmonySync macOS Installer Build"
echo "=================================="
echo ""

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  Warning: This script is designed for macOS."
    echo "   You can still run it to prepare the build, but the final DMG will only be created on macOS."
    echo ""
fi

# Navigate to harmonysync directory
cd "$(dirname "$0")/harmonysync"

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Building frontend..."
npm run build

echo ""
echo "🦀 Building Tauri application for macOS..."
echo "   This will create a .app bundle and DMG installer"
echo ""

# Build the application with Tauri
# The --target parameter ensures we build for macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    npm run tauri build -- --target universal-apple-darwin
    
    echo ""
    echo "✅ Build complete!"
    echo ""
    echo "📦 Output files:"
    echo "   App Bundle: src-tauri/target/release/bundle/macos/harmonysync.app"
    echo "   DMG Installer: src-tauri/target/release/bundle/dmg/harmonysync_*.dmg"
    echo ""
    echo "🚀 You can now distribute the DMG file to users!"
else
    echo "⚠️  Skipping build - not running on macOS"
    echo "   To build for macOS, run this script on a Mac or use GitHub Actions"
fi

echo ""
echo "Done!"
