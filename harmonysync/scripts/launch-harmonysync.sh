#!/bin/bash
# HarmonySync AppImage Launcher (No Sandbox)
# This script launches the AppImage without sandboxing to allow YouTube API access

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Find the AppImage file (assuming it's in the same directory or parent directory)
APPIMAGE_NAME="harmonysync.AppImage"
APPIMAGE_PATH=""

# Check current directory
if [ -f "$SCRIPT_DIR/$APPIMAGE_NAME" ]; then
    APPIMAGE_PATH="$SCRIPT_DIR/$APPIMAGE_NAME"
# Check parent directory
elif [ -f "$SCRIPT_DIR/../$APPIMAGE_NAME" ]; then
    APPIMAGE_PATH="$SCRIPT_DIR/../$APPIMAGE_NAME"
# Check for any .AppImage file
else
    APPIMAGE_PATH=$(find "$SCRIPT_DIR" -maxdepth 2 -name "*.AppImage" | head -1)
fi

if [ -z "$APPIMAGE_PATH" ]; then
    echo "Error: Could not find HarmonySync AppImage file"
    echo "Please ensure the AppImage is in the same directory as this script"
    exit 1
fi

echo "Launching HarmonySync without sandboxing..."
echo "AppImage: $APPIMAGE_PATH"

# Launch the AppImage with --no-sandbox flag
exec "$APPIMAGE_PATH" --no-sandbox "$@"