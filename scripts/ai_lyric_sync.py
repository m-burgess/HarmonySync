#!/usr/bin/env python3
import sys
import json
import warnings
import os

# Suppress warnings from whisper/librosa
warnings.filterwarnings("ignore")

try:
    import whisper
    import librosa
    import numpy as np
    from scipy import signal
    import difflib
except ImportError:
    print(json.dumps([{"error": "Missing required dependencies. Run: pip install openai-whisper librosa scipy numpy"}]))
    sys.exit(1)

def find_audio_offset(ref_path, multi_path, sr=22050):
    """
    Cross-correlates the reference track with the multitrack to find the time delay.
    Returns the time in seconds that the reference track is delayed relative to the multitrack.
    (e.g., if multitrack has a 5-second count-in, this returns approx 5.0)
    """
    # Load audio files (downsampled to mono for speed)
    y_ref, _ = librosa.load(ref_path, sr=sr, mono=True)
    y_multi, _ = librosa.load(multi_path, sr=sr, mono=True)
    
    # We only need the first 30 seconds to find the correlation peak (avoids massive memory usage)
    max_len = min(len(y_ref), len(y_multi), sr * 30)
    y_ref = y_ref[:max_len]
    y_multi = y_multi[:max_len]
    
    # Cross-correlate
    correlation = signal.correlate(y_multi, y_ref, mode='full')
    lags = signal.correlation_lags(len(y_multi), len(y_ref), mode='full')
    
    peak_idx = np.argmax(correlation)
    lag = lags[peak_idx]
    
    # Calculate offset in seconds
    offset_seconds = lag / float(sr)
    
    # Ensure it's not negative (if reference starts earlier than multitrack, which is rare for click tracks)
    if offset_seconds < 0:
        offset_seconds = 0.0
        
    return offset_seconds

def align_lyrics(ref_path, lyrics_path, offset, lead_time=1.5):
    """
    Uses Whisper to transcribe the reference audio, constrained by the known lyrics,
    and returns timestamped lines adjusted by the offset and lead time.
    """
    model = whisper.load_model("base") # Use base model for speed vs accuracy balance
    
    # We read the lyrics, though standard Whisper transcription might not perfectly match the exact text.
    # A true forced aligner like whisperX is better, but raw Whisper gives decent segment timestamps.
    try:
        with open(lyrics_path, 'r', encoding='utf-8') as f:
            raw_lines = [line.strip() for line in f.readlines()]
            
            blocks = []
            current_block = ""
            line_count = 0
            is_header = False
            for line in raw_lines:
                if line == "":
                    if current_block != "":
                        blocks.append(current_block)
                        current_block = ""
                        line_count = 0
                    continue
                
                if line.startswith("[") and line.endswith("]"):
                    if current_block != "":
                        blocks.append(current_block)
                        current_block = ""
                        line_count = 0
                    blocks.append(line)
                    continue
                
                if current_block == "":
                    current_block = line
                    line_count = 1
                else:
                    current_block += "\n" + line
                    line_count += 1
                    
                if line_count == 2:
                    blocks.append(current_block)
                    current_block = ""
                    line_count = 0
                    
            if current_block != "":
                blocks.append(current_block)
                
            lyrics_text = " ".join([b.replace("\n", " ") for b in blocks])
    except Exception as e:
        print(f"Error reading lyrics: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Provide the lyrics as the initial prompt to guide Whisper towards the correct words
    result = model.transcribe(ref_path, initial_prompt=lyrics_text, word_timestamps=False)
    
    # Map Whisper segments back to the blocks
    output = []
    current_block_idx = 0
    
    for segment in result["segments"]:
        if current_block_idx >= len(blocks):
            break
            
        segment_text = segment["text"].strip()
        start_time = segment["start"]
        
        # Apply cross-correlation offset (so it matches the click track timeline)
        adjusted_time = start_time + offset
        
        # Subtract lead time (so lyrics show up before the singer sings)
        final_time = adjusted_time - lead_time
        if final_time < 0:
            final_time = 0.0
            
        # Ignore empty or music-only segments
        if len(segment_text) > 2:
            output.append({
                "time": final_time,
                "text": blocks[current_block_idx]
            })
            current_block_idx += 1
            
    # If whisper missed some blocks at the end, just add them with incremental timestamps as a fallback
    last_time = output[-1]["time"] if output else 0.0
    while current_block_idx < len(blocks):
        last_time += 2.5
        output.append({
            "time": last_time,
            "text": blocks[current_block_idx]
        })
        current_block_idx += 1
            
    return output

def main():
    if len(sys.argv) < 4:
        print("Usage: python ai_lyric_sync.py <ref_path> <multi_path> <lyrics_path>", file=sys.stderr)
        sys.exit(1)

    ref_path = sys.argv[1]
    multi_path = sys.argv[2]
    lyrics_path = sys.argv[3]

    try:
        # Step 1: Find the offset caused by the count-in on the multitrack
        offset = find_audio_offset(ref_path, multi_path)
        
        # Step 2: Align with Whisper and adjust timestamps
        timestamped_lines = align_lyrics(ref_path, lyrics_path, offset, lead_time=1.5)
        
        # Output JSON for C++ to parse
        print(json.dumps(timestamped_lines))
        
    except Exception as e:
        print(f"Error during AI synchronization: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
