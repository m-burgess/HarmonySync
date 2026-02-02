#!/bin/bash

# Quick test script for folder service
# This creates a test zip file and tests the service

set -e

echo "🧪 Creating test service folder..."

TEST_DIR="$(mktemp -d)"
SERVICE_DIR="$TEST_DIR/Service Order 02-02-2026"

# Create service folder structure
mkdir -p "$SERVICE_DIR/01 - Announcements"
mkdir -p "$SERVICE_DIR/02 - 5 Minute Countdown"
mkdir -p "$SERVICE_DIR/03 - Song 1"
mkdir -p "$SERVICE_DIR/04 - Sermon"
mkdir -p "$SERVICE_DIR/05 - Special Services"

# Create some dummy files
echo "Announcement 1" > "$SERVICE_DIR/01 - Announcements/slide1.txt"
echo "Announcement 2" > "$SERVICE_DIR/01 - Announcements/slide2.txt"
echo "Countdown video placeholder" > "$SERVICE_DIR/02 - 5 Minute Countdown/countdown.txt"
echo "Amazing Grace lyrics" > "$SERVICE_DIR/03 - Song 1/lyrics.txt"
touch "$SERVICE_DIR/03 - Song 1/track1.mp3"
touch "$SERVICE_DIR/03 - Song 1/track2.mp3"
echo "Sermon notes" > "$SERVICE_DIR/04 - Sermon/notes.txt"
echo "Wedding ceremony order" > "$SERVICE_DIR/05 - Special Services/wedding.txt"

# Create zip file in Downloads
ZIP_DIR="$HOME/Downloads/test-services"
mkdir -p "$ZIP_DIR"
ZIP_FILE="$ZIP_DIR/Service-Order-02-02-2026.zip"

cd "$TEST_DIR"
zip -r "$ZIP_FILE" "Service Order 02-02-2026"

echo "✅ Test zip file created: $ZIP_FILE"
echo ""
echo "Contents:"
unzip -l "$ZIP_FILE"
echo ""
echo "📂 Watching folder: $ZIP_DIR"
echo ""
echo "The service should now detect and extract this zip file."
echo "Check the folder service logs with:"
echo "  journalctl -u harmonysync-folder-service -f"
echo ""

# Clean up temp dir
rm -rf "$TEST_DIR"
