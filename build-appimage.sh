#!/bin/bash

# HarmonySync Presenter - AppImage Build Script
# This script builds an AppImage for HarmonySync Presenter on Linux

set -e  # Exit on error

echo "====================================="
echo "HarmonySync AppImage Installer Build"
echo "====================================="
echo ""

# Check if we're on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "⚠️  Warning: This script is designed for Linux."
    echo "   AppImages can only be built on Linux systems."
    exit 1
fi

# Navigate to harmonysync directory
cd "$(dirname "$0")/harmonysync"

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Building frontend..."
npm run build

echo ""
echo "🦀 Building Tauri application for Linux..."
echo "   This will create an AppImage"
echo ""

# Install required Linux dependencies if not present
echo "Checking for required system dependencies..."
if ! command -v file &> /dev/null; then
    echo "Installing required system packages..."
    sudo apt-get update
    sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf file
fi

# Build the application with Tauri
# Tauri will automatically create AppImage if the builder is available
npm run tauri build -- --target x86_64-unknown-linux-gnu

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Output files:"
echo "   AppImage: src-tauri/target/release/bundle/appimage/harmonysync_*.AppImage"
echo "   Deb Package: src-tauri/target/release/bundle/deb/harmonysync_*.deb"
echo ""
echo "🚀 You can now distribute the AppImage file to users!"
echo ""
echo "Note: The AppImage is a portable application that can run on most Linux distributions"
echo "      without installation. Users just need to make it executable and run it:"
echo "      chmod +x harmonysync_*.AppImage"
echo "      ./harmonysync_*.AppImage"
echo ""
echo "Done!"
