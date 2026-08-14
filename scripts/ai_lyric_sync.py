#!/usr/bin/env python3
import sys
import json
import time

def main():
    if len(sys.argv) < 3:
        print("Usage: python ai_lyric_sync.py <audio_path> <lyrics_path>", file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    lyrics_path = sys.argv[2]

    # Simulate processing time
    time.sleep(1)

    try:
        with open(lyrics_path, 'r') as f:
            lyrics = f.readlines()
    except Exception as e:
        print(f"Error reading lyrics: {e}", file=sys.stderr)
        sys.exit(1)

    output = []
    current_time = 0.0

    for line in lyrics:
        line = line.strip()
        if not line:
            continue
        
        output.append({
            "time": current_time,
            "text": line
        })
        current_time += 2.5 # Mock spacing of 2.5 seconds per line

    print(json.dumps(output))

if __name__ == "__main__":
    main()
