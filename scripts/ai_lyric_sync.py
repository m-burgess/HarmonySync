#!/usr/bin/env python3
import sys
import json
import warnings
import os
import subprocess
import shutil

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
    
    # Calculate onset envelopes (captures rhythm and transients)
    # This ensures a click track can successfully correlate against a studio mix
    env_ref = librosa.onset.onset_strength(y=y_ref, sr=sr)
    env_multi = librosa.onset.onset_strength(y=y_multi, sr=sr)
    
    # Cross-correlate envelopes
    correlation = signal.correlate(env_multi, env_ref, mode='full')
    lags = signal.correlation_lags(len(env_multi), len(env_ref), mode='full')
    
    peak_idx = np.argmax(correlation)
    lag = lags[peak_idx]
    
    # Calculate offset in seconds (onset_strength uses default hop_length of 512)
    offset_seconds = lag * (512.0 / sr)
    
    # Ensure it's not negative (if reference starts earlier than multitrack, which is rare for click tracks)
    if offset_seconds < 0:
        offset_seconds = 0.0
        
    return offset_seconds

def align_lyrics(ref_path, lyrics_path, lead_time=0.5):
    """
    Uses Whisper to transcribe the reference audio, constrained by the known lyrics,
    and returns timestamped lines adjusted by the lead time.
    """
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    try:
        # First try to load on whatever device is available
        model = whisper.load_model("base", device=device)
    except Exception as e:
        # If CUDA initialization fails (e.g., incompatible architecture), fallback to CPU
        print_progress("CUDA error detected, falling back to CPU mode...")
        model = whisper.load_model("base", device="cpu")
    
    # We read the lyrics, though standard Whisper transcription might not perfectly match the exact text.
    # A true forced aligner like whisperX is better, but raw Whisper gives decent segment timestamps.
    try:
        with open(lyrics_path, 'r', encoding='utf-8') as f:
            raw_lines = [line.strip() for line in f.readlines()]
            
            blocks = []
            for line in raw_lines:
                if line == "":
                    continue
                
                # Ignore metadata lines
                if line.startswith("Title:") or line.startswith("BPM:") or line.startswith("Original Key:"):
                    continue
                    
                if line.startswith("[") and line.endswith("]"):
                    continue
                
                blocks.append(line)
                
            lyrics_text = " ".join(blocks)
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
        
        # Audio is already physically aligned, just subtract lead time
        final_time = start_time - lead_time
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

def pad_audio_with_ffmpeg(ref_path, multi_path, offset_seconds):
    """
    Uses FFmpeg to pad the reference track with silence so its timeline and length 
    exactly match the multitrack.
    """
    try:
        multi_dur = librosa.get_duration(path=multi_path)
    except TypeError:
        # Fallback for older librosa versions
        multi_dur = librosa.get_duration(filename=multi_path)
        
    delay_ms = int(offset_seconds * 1000)
    temp_out = ref_path + ".padded.mp3"
    
    cmd = [
        "ffmpeg", "-y",
        "-i", ref_path,
        "-af", f"adelay={delay_ms}|{delay_ms},apad",
        "-t", str(multi_dur),
        temp_out
    ]
    
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    shutil.move(temp_out, ref_path)

def print_progress(msg):
    print(json.dumps({"progress": msg}), flush=True)

def main():
    if len(sys.argv) < 4:
        print("Usage: python ai_lyric_sync.py <ref_path> <multi_path> <lyrics_path>", file=sys.stderr)
        sys.exit(1)

    ref_path = sys.argv[1]
    multi_path = sys.argv[2]
    lyrics_path = sys.argv[3]

    try:
        print_progress("Initializing AI Sync...")
        
        # Step 1: Find the offset caused by the count-in on the multitrack
        print_progress("Calculating count-in offset...")
        offset = find_audio_offset(ref_path, multi_path)
        
        # Step 2: Pad the reference audio file with silence and overwrite it
        print_progress("Aligning and padding audio tracks...")
        pad_audio_with_ffmpeg(ref_path, multi_path, offset)
        
        # Step 3: Align with Whisper
        print_progress("Transcribing lyrics using Whisper AI (this may take a minute)...")
        timestamped_lines = align_lyrics(ref_path, lyrics_path)
        
        print_progress("Finalizing timestamps...")
        
        # Output JSON for C++ to parse
        print(json.dumps(timestamped_lines), flush=True)
        
    except Exception as e:
        print(f"Error during AI synchronization: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
