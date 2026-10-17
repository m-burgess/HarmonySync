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
    from scipy import signal, ndimage, io as scipy_io
    import difflib
except ImportError:
    print(json.dumps([{"error": "Missing required dependencies. Run: pip install openai-whisper librosa scipy numpy"}]))
    sys.exit(1)

def format_timestamp(seconds):
    """
    Formats seconds into church presentation MM:SS.ss timestamp string.
    Matches HarmonySync FolderService formatting.
    """
    m = int(seconds) // 60
    s = seconds - (m * 60)
    return f"{m:02d}:{s:05.2f}"

def isolate_vocals(audio_path, sr=22050):
    """
    Splits stems of a reference track to isolate the vocal component.
    Uses center-channel extraction for stereo reference recordings combined with
    harmonic-percussive separation and spectrogram foreground filtering.
    Returns the path to the isolated vocal WAV file.
    """
    try:
        y, _ = librosa.load(audio_path, sr=sr, mono=False)
        if y.ndim > 1:
            mid = (y[0] + y[1]) / 2.0
            side = (y[0] - y[1]) / 2.0
            y_ref = np.clip(mid - 0.3 * np.abs(side), -1.0, 1.0)
        else:
            y_ref = y

        # Harmonic-percussive separation to isolate vocal harmonics from drums/transients
        y_harmonic, _ = librosa.effects.hpss(y_ref, margin=(1.0, 3.0))

        # Spectrogram foreground filtering to suppress stationary instruments
        D = librosa.stft(y_harmonic)
        S, phase = np.abs(D), np.angle(D)

        filter_len = min(31, max(3, S.shape[1] // 2 * 2 + 1))
        S_bg = ndimage.median_filter(S, size=(1, filter_len))

        mask = np.clip((S - S_bg) / (S + 1e-6), 0.0, 1.0)
        S_vocals = S * (mask ** 2)
        y_vocals = librosa.istft(S_vocals * np.exp(1j * phase))

        max_val = np.max(np.abs(y_vocals))
        if max_val > 0:
            y_vocals = y_vocals / max_val * 0.95

        vocal_path = audio_path + ".vocals.wav"
        wav_data = (y_vocals * 32767).astype(np.int16)
        scipy_io.wavfile.write(vocal_path, sr, wav_data)
        return vocal_path
    except Exception as e:
        print_progress(f"Vocal isolation notice: {e}, falling back to original audio")
        return audio_path

def find_audio_offset(ref_path, multi_path, sr=22050):
    """
    Cross-correlates the reference track with the multitrack (guide, split, or click)
    to find the time delay caused by count-in.
    If multi_path is a SPLIT track (stereo), it correlates against each channel
    (e.g., accompaniment channel and click/guide channel) to accurately detect the offset.
    """
    y_ref, _ = librosa.load(ref_path, sr=sr, mono=True)
    y_multi, _ = librosa.load(multi_path, sr=sr, mono=False)

    max_len = sr * 45
    y_ref = y_ref[:min(len(y_ref), max_len)]

    if y_multi.ndim == 1:
        channels = [y_multi[:min(len(y_multi), max_len)]]
    else:
        channels = [
            y_multi[0][:min(y_multi.shape[1], max_len)],
            y_multi[1][:min(y_multi.shape[1], max_len)]
        ]

    env_ref = librosa.onset.onset_strength(y=y_ref, sr=sr)
    best_offset = 0.0
    best_peak_val = -1.0

    for ch_audio in channels:
        # Check direct correlation first (ideal for split backing tracks sharing mix content)
        if len(ch_audio) >= len(y_ref) and np.std(ch_audio) > 1e-4 and np.std(y_ref) > 1e-4:
            corr_direct = signal.correlate(ch_audio, y_ref, mode='full')
            peak_idx_d = np.argmax(corr_direct)
            peak_val_d = corr_direct[peak_idx_d]
            lags_d = signal.correlation_lags(len(ch_audio), len(y_ref), mode='full')
            lag_d = lags_d[peak_idx_d]
            norm = (np.linalg.norm(ch_audio) * np.linalg.norm(y_ref)) + 1e-6
            coeff = peak_val_d / norm
            if coeff > 0.3:
                return max(0.0, lag_d / float(sr))

        # Onset envelope correlation (ideal for rhythm, clicks, and verbal guide tracks)
        env_ch = librosa.onset.onset_strength(y=ch_audio, sr=sr)
        correlation = signal.correlate(env_ch, env_ref, mode='full')
        lags = signal.correlation_lags(len(env_ch), len(env_ref), mode='full')

        peak_idx = np.argmax(correlation)
        peak_val = correlation[peak_idx]
        lag = lags[peak_idx]
        offset_sec = max(0.0, lag * (512.0 / sr))

        if peak_val > best_peak_val:
            best_peak_val = peak_val
            best_offset = offset_sec

    return best_offset

def adjust_for_crowd_singalong(timestamped_lines, lead_time=1.8):
    """
    Adjusts lyric timestamps for church congregation / crowd sing-along.
    Applies an anticipatory lead time (default 1.8s) so the congregation
    can read ahead and anticipate the melody before the vocals start.
    Ensures non-negative timestamps and prevents slide collisions.
    """
    adjusted = []
    last_time = 0.0
    for i, item in enumerate(timestamped_lines):
        raw_time = float(item.get("time", 0.0))
        adj_time = max(0.0, round(raw_time - lead_time, 2))

        # Prevent slide collision with previous line
        if i > 0 and adj_time < last_time + 0.3:
            adj_time = round(last_time + 0.3, 2)

        last_time = adj_time
        adjusted.append({
            "time": adj_time,
            "text": item.get("text", "")
        })
    return adjusted

def update_songmap_for_church(songmap_path, timed_lyrics):
    """
    Updates song-map.json with crowd-adjusted timestamps formatted for church slides.
    Populates section line timestamps and timedLyrics array.
    """
    try:
        data = {}
        if os.path.exists(songmap_path):
            with open(songmap_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

        sections = data.get("sections", [])
        flat_idx = 0
        for sec in sections:
            lines = sec.get("lines", [])
            new_lines = []
            for line in lines:
                if flat_idx < len(timed_lyrics):
                    tl = timed_lyrics[flat_idx]
                    sec_ts = tl["time"]
                    ts_str = format_timestamp(sec_ts)
                    if isinstance(line, dict):
                        line["timestamp"] = ts_str
                        line["timestampSeconds"] = sec_ts
                        new_lines.append(line)
                    else:
                        new_lines.append({
                            "text": str(line),
                            "timestamp": ts_str,
                            "timestampSeconds": sec_ts
                        })
                    flat_idx += 1
                else:
                    new_lines.append(line)
            sec["lines"] = new_lines
        data["sections"] = sections

        # Populate timedLyrics array
        timed_array = []
        for tl in timed_lyrics:
            timed_array.append({
                "time": format_timestamp(tl["time"]),
                "text": tl["text"]
            })
        data["timedLyrics"] = timed_array

        with open(songmap_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print_progress(f"Notice: Failed to update song-map.json: {e}")
        return False

def align_lyrics(ref_path, lyrics_path, lead_time=1.8):
    """
    Splits reference audio to isolate vocals, uses Whisper to transcribe only the vocals,
    and returns timestamped lines adjusted for church crowd sing-along.
    """
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"

    try:
        model = whisper.load_model("base", device=device)
    except Exception:
        print_progress("CUDA error detected, falling back to CPU mode...")
        model = whisper.load_model("base", device="cpu")

    try:
        with open(lyrics_path, 'r', encoding='utf-8') as f:
            raw_lines = [line.strip() for line in f.readlines()]

            blocks = []
            for line in raw_lines:
                if line == "":
                    continue
                if line.startswith("Title:") or line.startswith("BPM:") or line.startswith("Original Key:"):
                    continue
                if line.startswith("[") and line.endswith("]"):
                    continue
                blocks.append(line)

            lyrics_text = " ".join(blocks)
    except Exception as e:
        print(f"Error reading lyrics: {e}", file=sys.stderr)
        sys.exit(1)

    # Step: Isolate vocals from reference track to avoid instrument interference
    print_progress("Isolating vocal stem from reference track for clean lyric alignment...")
    vocal_audio_path = isolate_vocals(ref_path)

    # Transcribe isolated vocals with Whisper
    result = model.transcribe(vocal_audio_path, initial_prompt=lyrics_text, word_timestamps=False)

    raw_output = []
    current_block_idx = 0

    for segment in result.get("segments", []):
        if current_block_idx >= len(blocks):
            break

        segment_text = segment.get("text", "").strip()
        start_time = segment.get("start", 0.0)

        if len(segment_text) > 2:
            raw_output.append({
                "time": start_time,
                "text": blocks[current_block_idx]
            })
            current_block_idx += 1

    last_time = raw_output[-1]["time"] if raw_output else 0.0
    while current_block_idx < len(blocks):
        last_time += 2.5
        raw_output.append({
            "time": last_time,
            "text": blocks[current_block_idx]
        })
        current_block_idx += 1

    # Adjust timestamps for church congregation crowd sing-along
    timestamped_lines = adjust_for_crowd_singalong(raw_output, lead_time=lead_time)
    return timestamped_lines

def pad_audio_with_ffmpeg(ref_path, multi_path, offset_seconds):
    """
    Uses FFmpeg to pad the reference track with silence so its timeline and length
    exactly match the multitrack count-in.
    """
    try:
        multi_dur = librosa.get_duration(path=multi_path)
    except TypeError:
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
        print("Usage: python ai_lyric_sync.py <ref_path> <multi_path> <lyrics_path> [songmap_path]", file=sys.stderr)
        sys.exit(1)

    ref_path = sys.argv[1]
    multi_path = sys.argv[2]
    lyrics_path = sys.argv[3]
    songmap_path = sys.argv[4] if len(sys.argv) > 4 else None

    # Auto-detect song-map.json in parent folders if not explicitly provided
    if not songmap_path:
        for candidate_dir in [os.path.dirname(ref_path), os.path.dirname(multi_path)]:
            possible_map = os.path.join(candidate_dir, "song-map.json")
            if os.path.exists(possible_map):
                songmap_path = possible_map
                break

    try:
        print_progress("Initializing AI Sync...")

        # Step 1: Find count-in offset using guide or split track
        print_progress("Calculating count-in offset from guide / split track...")
        offset = find_audio_offset(ref_path, multi_path)

        # Step 2: Pad reference track with silence
        print_progress("Aligning and padding audio tracks...")
        pad_audio_with_ffmpeg(ref_path, multi_path, offset)

        # Step 3: Isolate vocals, transcribe, and adjust for crowd sing-along
        print_progress("Processing isolated vocals with Whisper AI...")
        timestamped_lines = align_lyrics(ref_path, lyrics_path)

        # Step 4: Update song-map.json for church presentation
        if songmap_path and os.path.exists(songmap_path):
            print_progress("Updating song-map.json with church slide timestamps...")
            update_songmap_for_church(songmap_path, timestamped_lines)

        print_progress("Finalizing timestamps...")
        print(json.dumps(timestamped_lines), flush=True)

    except Exception as e:
        print(f"Error during AI synchronization: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
