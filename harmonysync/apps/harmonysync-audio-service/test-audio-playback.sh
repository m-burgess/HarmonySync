#!/bin/bash

# Test script to verify audio service can play audio files
echo "🧪 Testing Audio Service Playback"
echo "================================="

# Check if service is running
if ! curl -s http://localhost:3001/api/health > /dev/null; then
    echo "❌ Audio service is not running"
    echo "Run: ./start-service.sh start"
    exit 1
fi

echo "✅ Audio service is running"

# Create a test tone (if available)
if command -v ffmpeg > /dev/null; then
    echo "🎵 Creating test audio file..."
    ffmpeg -f lavfi -i "sine=frequency=440:duration=3" -y test-tone.wav > /dev/null 2>&1
    
    if [ -f "test-tone.wav" ]; then
        echo "✅ Test tone created: test-tone.wav"
        
        # Try to load the test file
        echo "📁 Loading test audio file..."
        RESPONSE=$(curl -s -X POST http://localhost:3001/api/tracks/load \
            -H "Content-Type: application/json" \
            -d "{\"filePath\": \"$(pwd)/test-tone.wav\", \"name\": \"Test Tone\"}")
        
        if echo "$RESPONSE" | grep -q "success.*true"; then
            echo "✅ Test file loaded successfully"
            
            # Try to play it
            echo "▶️  Attempting to play test tone..."
            curl -s -X POST http://localhost:3001/api/mixer/play-all > /dev/null
            
            echo "🔊 You should hear a 3-second 440Hz tone now!"
            echo "If you don't hear anything, check your audio settings."
            
            # Wait and then stop
            sleep 4
            curl -s -X POST http://localhost:3001/api/mixer/stop-all > /dev/null
            echo "⏹️  Test complete"
            
            # Clean up
            rm -f test-tone.wav
            curl -s -X DELETE http://localhost:3001/api/mixer/clear > /dev/null
        else
            echo "❌ Failed to load test file"
            echo "Response: $RESPONSE"
        fi
    else
        echo "❌ Failed to create test audio file"
    fi
else
    echo "⚠️  ffmpeg not available - cannot create test tone"
    echo "To test audio playback:"
    echo "1. Find an audio file (MP3, WAV, etc.)"
    echo "2. Use the frontend to load and play it"
    echo "3. Or use curl to test the API directly"
fi

echo ""
echo "📋 Manual Test Commands:"
echo "# Load an audio file:"
echo "curl -X POST http://localhost:3001/api/tracks/load \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"filePath\": \"/path/to/your/audio/file.mp3\"}'"
echo ""
echo "# Play all tracks:"
echo "curl -X POST http://localhost:3001/api/mixer/play-all"
echo ""
echo "# Stop all tracks:"
echo "curl -X POST http://localhost:3001/api/mixer/stop-all"