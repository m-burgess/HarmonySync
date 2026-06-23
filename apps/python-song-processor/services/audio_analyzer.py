import librosa
import stable_whisper
import warnings
import os
import json
import difflib
import numpy as np
from pydub import AudioSegment
import pyttsx3
import soundfile as sf
from demucs.separate import main as demucs_main

import collections
import numpy as np
try:
    import collections.abc
    collections.MutableSequence = collections.abc.MutableSequence
    collections.MutableMapping = collections.abc.MutableMapping
except AttributeError:
    pass

np.float = np.float64
np.int = int
np.complex = complex

try:
    from madmom.features.chords import CNNChordFeatureProcessor, CRFChordRecognitionProcessor
    HAS_MADMOM = True
except ImportError as e:
    print(f"[AudioAnalyzer] Failed to import madmom: {e}")
    HAS_MADMOM = False

warnings.filterwarnings("ignore")

def get_core_loop(progression):
    n = len(progression)
    if n < 2:
        return progression
        
    for loop_len in range(1, n // 2 + 1):
        loop = progression[:loop_len]
        is_loop = True
        for i in range(loop_len, n):
            if progression[i] != loop[i % loop_len]:
                is_loop = False
                break
        if is_loop:
            return loop
            
    half = n // 2
    if progression[:half] == progression[half:half*2]:
        return progression[:half]
        
    return progression

class AudioAnalyzer:
    _model_cache = None

    def __init__(self, audio_path, lyrics_path):
        self.audio_path = audio_path
        self.lyrics_path = lyrics_path
        
        # We will load a small model by default for speed, can be customized
        if AudioAnalyzer._model_cache is None:
            AudioAnalyzer._model_cache = stable_whisper.load_model('base')
        self.model = AudioAnalyzer._model_cache
        self.bpm = 120
        self.original_duration = 0

    def analyze_bpm_and_key(self):
        """
        Uses librosa to estimate the BPM (tempo) and the key of the track.
        """
        try:
            y, sr = librosa.load(self.audio_path, duration=60) # Analyze first 60 seconds for speed
            
            if len(y) == 0:
                print(f"[AudioAnalyzer] Warning: Audio file {self.audio_path} is empty.")
                return 120, "C"

            # BPM estimation
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            bpm = int(round(tempo[0])) if hasattr(tempo, '__len__') else int(round(tempo))
            self.bpm = bpm
            self.beat_times = librosa.frames_to_time(beats, sr=sr)
            self.original_duration = librosa.get_duration(y=y, sr=sr)

            # Basic key estimation using chroma
            chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
            chroma_sum = chroma.sum(axis=1)
            
            keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            key_idx = chroma_sum.argmax()
            estimated_key = keys[key_idx]
            self.estimated_key = estimated_key

            return bpm, estimated_key
        except Exception as e:
            print(f"[AudioAnalyzer] Error analyzing audio: {str(e)}")
            self.bpm = 120
            self.beat_times = []
            self.original_duration = 0
            return 120, "C"

    def parse_and_align_lyrics(self):
        """
        Parses the provided lyrics.txt for structure (e.g. [Verse 1] or Verse 1), 
        chords (e.g. Chords: F#m D), and aligns the raw text to audio.
        Returns (sections, aligned_lyrics).
        """
        from utils.chord_converter import absolute_to_nashville
        import re
        
        if self.lyrics_path.lower().endswith('.pdf'):
            import fitz
            doc = fitz.open(self.lyrics_path)
            try:
                raw_lyrics = ""
                for page in doc:
                    raw_lyrics += page.get_text() + "\n"
            finally:
                doc.close()
        else:
            with open(self.lyrics_path, 'r', encoding='utf-8') as f:
                raw_lyrics = f.read()

        sections = []
        current_section = None
        all_lyric_lines = []
        
        # Determine the key from the header if possible
        # e.g., "Come Alive [A, 76 bpm, 4/4]"
        detected_key = self.estimated_key if hasattr(self, 'estimated_key') else "C"
        
        lines = raw_lyrics.split('\n')
        for i, line in enumerate(lines):
            line = line.strip().replace('.', ' ')
            if not line:
                continue
                
            # Check for header like "Come Alive [A, 76 bpm]"
            if i == 0 and '[' in line and ']' in line:
                # If it's literally just a section tag, don't treat it as a header
                if line.startswith('[') and line.endswith(']') and not ',' in line:
                    pass # It's a section tag like [Verse 1], let it fall through
                else:
                    header_info = line[line.find('[')+1 : line.rfind(']')]
                    parts = header_info.split(',')
                    if len(parts) >= 1:
                        detected_key = parts[0].strip()
                        self.estimated_key = detected_key
                    continue
                
            # Check for tags like [AMPD] but don't ignore valid sections like [Chorus]
            if line.startswith('[') and line.endswith(']'):
                tag_content = line[1:-1].strip().lower()
                if tag_content == "ampd":
                    continue
                
            lower_line = line.lower()
            is_section = False
            section_name = line
            
            # Common section keywords if brackets aren't used
            section_keywords = ["intro", "verse", "pre chorus", "chorus", "bridge", "interlude", "ending", "outro"]
            if line.startswith('[') and line.endswith(']'):
                if lower_line.startswith('[chords') or lower_line.startswith('[break chords'):
                    # Strip brackets so the chord logic below can parse it
                    line = line[1:-1].strip()
                    lower_line = line.lower()
                else:
                    is_section = True
                    section_name = line[1:-1]
            else:
                for keyword in section_keywords:
                    if lower_line.startswith(keyword):
                        is_section = True
                        break
                        
            if is_section:
                if current_section and current_section["lyrics_text"]:
                    sections.append(current_section)
                current_section = {"label": section_name, "lyrics_text": [], "lyrics": [], "chords_extracted": None}
                continue
                
            # Check for chords
            if lower_line.startswith("chords:") or lower_line.startswith("break chords:") or lower_line.startswith("chords "):
                if ":" in line:
                    chord_str = line.split(":", 1)[1].strip()
                else:
                    # e.g., "Chords F#m D Bm"
                    # we want to strip the "Chords" part, preserving case
                    import re
                    chord_str = re.sub(r'(?i)^(?:break )?chords[:\.\s]*', '', line).strip()
                    
                nashville_chords = absolute_to_nashville(chord_str, detected_key)
                
                if current_section is None:
                    current_section = {"label": "Intro", "lyrics_text": [], "lyrics": [], "chords_extracted": None}
                current_section["chords_extracted"] = nashville_chords
                continue
                
            # Treat as lyrics
            if current_section is None:
                current_section = {"label": "Intro", "lyrics_text": [], "lyrics": [], "chords_extracted": None}
                
            # Skip page numbers like "1" or "2"
            if line.isdigit() and len(line) <= 2:
                continue
                
            current_section["lyrics_text"].append(line)
            all_lyric_lines.append(line)
                
        if current_section and current_section["lyrics_text"]:
            sections.append(current_section)

        if not all_lyric_lines:
            return sections, []

        print(f"[Whisper] Aligning {len(all_lyric_lines)} lines of provided lyrics to audio...")
        lyrics_str = "\n".join(all_lyric_lines)
        result = self.model.align(self.audio_path, lyrics_str, language='en', original_split=True)

        aligned_lines = []
        segment_idx = 0
        
        for sec in sections:
            sec_start = None
            sec_end = None
            for text_line in sec["lyrics_text"]:
                if segment_idx < len(result.segments):
                    segment = result.segments[segment_idx]
                    start_time = segment.start
                    end_time = segment.end
                    
                    if sec_start is None:
                        sec_start = start_time - 1.0 # Buffer
                    sec_end = end_time + 1.0
                    
                    minutes = int(start_time // 60)
                    seconds = int(start_time % 60)
                    timestamp = f"{minutes:02d}:{seconds:02d}"
                    
                    aligned_obj = {
                        "raw_time": start_time,
                        "timestamp": timestamp,
                        "text": segment.text.strip()
                    }
                    aligned_lines.append(aligned_obj)
                    sec["lyrics"].append(aligned_obj)
                    segment_idx += 1
            
            sec["start_time"] = sec_start if sec_start is not None else 0.0
            sec["end_time"] = sec_end if sec_end is not None else sec["start_time"] + 10.0
            
            if sec.get("chords_extracted") is not None:
                sec["chords"] = sec["chords_extracted"]
            
        return sections, aligned_lines

    def assign_chords_to_sections(self, sections, beat_chords):
        for i, section in enumerate(sections):
            s_start = section.get("start_time", 0.0)
            
            # If there's a next section, the current section ends where the next begins.
            if i + 1 < len(sections):
                s_end = sections[i+1].get("start_time", section.get("end_time", s_start + 10.0))
            else:
                s_end = self.original_duration if hasattr(self, 'original_duration') else section.get("end_time", s_start + 10.0)
                
            section["end_time"] = s_end
            
            section_chords = []
            for (time, chord) in beat_chords:
                if s_start <= time <= s_end:
                    section_chords.append(chord)
                    
            reduced = []
            for p in section_chords:
                if not reduced or reduced[-1] != p:
                    reduced.append(p)
            
            core_loop = get_core_loop(reduced)
            section["chords"] = " ".join(core_loop)
            
        return sections

    def transcribe_lyrics(self, target_audio=None):
        import re
        
        GUIDE_VOCAB = {
            "intro", "verse", "chorus", "bridge", "outro", "interlude", "instrumental",
            "vamp", "tag", "turnaround", "ending", "break", "prechorus", "pre", "post",
            "one", "two", "three", "four", "1", "2", "3", "4", "five", "six", "5", "6",
            "down", "up", "big", "soft", "all", "in", "out", "band", "drums", "build",
            "hold", "stop", "a", "acappella", "cappella", "acapella"
        }

        def is_guide_cue(text):
            clean_text = re.sub(r'[^\w\s]', '', text.lower())
            words = clean_text.split()
            if not words:
                return True
            return all(word in GUIDE_VOCAB for word in words)

        path_to_transcribe = target_audio if target_audio else self.audio_path
        print(f"[Whisper] Transcribing lyrics from scratch using {path_to_transcribe}...")
        result = self.model.transcribe(path_to_transcribe, language='en', initial_prompt="Do not transcribe vocal guide cues like 'intro', 'verse', 'chorus', 'one', 'two', 'three', 'four'.")
        
        aligned_lines = []
        for segment in result.segments:
            start_time = segment.start
            text = segment.text.strip()
            
            if is_guide_cue(text):
                print(f"[Whisper] Ignored vocal guide cue: '{text}'")
                continue
            
            minutes = int(start_time // 60)
            seconds = int(start_time % 60)
            timestamp = f"{minutes:02d}:{seconds:02d}"
            
            aligned_lines.append({
                "raw_time": start_time,
                "timestamp": timestamp,
                "text": text
            })
        return aligned_lines

    def build_sections_from_lyrics(self, aligned_lyrics, beat_chords=None):
        sections = []
        if not aligned_lyrics:
            return sections
            
        stanzas = []
        current_stanza = []
        
        for i, line in enumerate(aligned_lyrics):
            if i > 0:
                gap = line["raw_time"] - aligned_lyrics[i-1]["raw_time"]
                if gap > 4.0:
                    stanzas.append(current_stanza)
                    current_stanza = []
            current_stanza.append(line)
        if current_stanza:
            stanzas.append(current_stanza)
            
        unique_groups = []
        group_counts = {}
        stanza_group_mapping = []
        
        for stanza in stanzas:
            text = " ".join([l["text"] for l in stanza]).lower()
            matched_group = None
            for gid, rep_text in enumerate(unique_groups):
                ratio = difflib.SequenceMatcher(None, text, rep_text).ratio()
                if ratio > 0.7:
                    matched_group = gid
                    break
            
            if matched_group is None:
                matched_group = len(unique_groups)
                unique_groups.append(text)
                group_counts[matched_group] = 1
            else:
                group_counts[matched_group] += 1
                
            stanza_group_mapping.append(matched_group)
            
        group_labels = {}
        verse_count = 1
        chorus_group = None
        
        max_freq = max(group_counts.values()) if group_counts else 0
        if max_freq >= 2:
            for gid, count in group_counts.items():
                if count == max_freq:
                    chorus_group = gid
                    break
                    
        bridge_count = 1
        prechorus_count = 1
        
        for gid in range(len(unique_groups)):
            if gid == chorus_group and group_counts[gid] > 1:
                group_labels[gid] = "Chorus"
            elif group_counts[gid] > 1:
                group_labels[gid] = "Repeated Part"
            else:
                group_labels[gid] = f"Verse {verse_count}"
                verse_count += 1
                
        for i, gid in enumerate(stanza_group_mapping):
            if gid not in group_labels or group_labels[gid] == "Repeated Part":
                if i + 1 < len(stanza_group_mapping) and stanza_group_mapping[i+1] in group_labels and group_labels[stanza_group_mapping[i+1]] == "Chorus":
                    group_labels[gid] = f"Pre-Chorus {prechorus_count}"
                    prechorus_count += 1
                else:
                    group_labels[gid] = f"Bridge / Tag {bridge_count}"
                    bridge_count += 1

        for i, stanza in enumerate(stanzas):
            gid = stanza_group_mapping[i]
            label = group_labels[gid]
            start_time = stanza[0]["raw_time"] - 1.0
            end_time = stanza[-1]["raw_time"] + 3.0
            if i == len(stanzas) - 1:
                end_time = self.original_duration if hasattr(self, 'original_duration') else stanza[-1]["raw_time"] + 10.0
                
            current_section = {
                "label": label,
                "start_time": start_time,
                "end_time": end_time,
                "lyrics": stanza
            }
            sections.append(current_section)

        if beat_chords:
            for section in sections:
                s_start = section["start_time"]
                s_end = section["end_time"]
                
                section_chords = []
                for (time, chord) in beat_chords:
                    if s_start <= time <= s_end:
                        section_chords.append(chord)
                        
                reduced = []
                for p in section_chords:
                    if not reduced or reduced[-1] != p:
                        reduced.append(p)
                
                core_loop = get_core_loop(reduced)
                section["chords"] = " ".join(core_loop)
                
        return sections

    def detect_chords(self, audio_path=None):
        target = audio_path if audio_path else self.audio_path
        
        keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        try:
            key_idx = keys.index(self.estimated_key)
        except:
            key_idx = 0
            
        if HAS_MADMOM:
            print("[Audio] Detecting Nashville Numbers using Madmom Neural Networks...")
            try:
                feat_processor = CNNChordFeatureProcessor(num_threads=1)
                decode_processor = CRFChordRecognitionProcessor(num_threads=1)
                
                features = feat_processor(target)
                chords_output = decode_processor(features)
                
                # We want to sample the chord at each beat time from librosa to get 16 beats
                y, sr = librosa.load(target)
                tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
                beat_times = librosa.frames_to_time(beats, sr=sr)
                
                beat_chords = []
                for b_time in beat_times:
                    chord_label = "N"
                    for start_time, end_time, label in chords_output:
                        if float(start_time) <= b_time < float(end_time):
                            chord_label = label
                            break
                    
                    if chord_label == "N" or ":" not in chord_label:
                        continue
                        
                    root, quality = chord_label.split(":")
                    
                    # Convert flat roots to sharp to match our keys array
                    flat_to_sharp = {'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'}
                    if root in flat_to_sharp:
                        root = flat_to_sharp[root]
                        
                    try:
                        root_idx = keys.index(root)
                    except ValueError:
                        root_idx = 0
                    
                    rel_idx = (root_idx - key_idx) % 12
                    quality_short = 'maj' if 'maj' in quality else ('min' if 'min' in quality else 'maj')
                    
                    nashville_map = {
                        (0, 'maj'): "1", (2, 'min'): "2m", (4, 'min'): "3m", 
                        (5, 'maj'): "4", (7, 'maj'): "5", (9, 'min'): "6m", (11, 'min'): "7m"
                    }
                    
                    nn = nashville_map.get((rel_idx, quality_short), "?")
                    if nn == "?":
                        notes = ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"]
                        nn = notes[rel_idx] + ("m" if quality_short == "min" else "")
                        
                    beat_chords.append((b_time, nn))
                
                return beat_chords
                    
            except Exception as e:
                print(f"[Audio] Error with Madmom: {e}. Falling back to template matching.")

        print("[Audio] Detecting Nashville Numbers using Template Matching...")
        y, sr = librosa.load(target, duration=120) # Analyze first 2 mins to save time
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        
        # Sync chroma to beats
        chroma_sync = librosa.util.sync(chroma, beats, aggregate=np.median)
        
        # Create templates for Major and Minor chords
        # C Major: C, E, G
        maj_template = np.array([1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0])
        # C Minor: C, Eb, G
        min_template = np.array([1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0])
        
        templates = []
        template_labels = []
        for i in range(12):
            templates.append(np.roll(maj_template, i))
            template_labels.append((i, 'maj'))
        for i in range(12):
            templates.append(np.roll(min_template, i))
            template_labels.append((i, 'min'))
            
        templates = np.array(templates) # Shape: (24, 12)
            
        nashville_map = {
            (0, 'maj'): "1", (2, 'min'): "2m", (4, 'min'): "3m", 
            (5, 'maj'): "4", (7, 'maj'): "5", (9, 'min'): "6m", (11, 'min'): "7m"
        }
        
        beat_times = librosa.frames_to_time(beats, sr=sr)
        beat_chords = []
        for col in range(chroma_sync.shape[1]):
            c = chroma_sync[:, col]
            if np.sum(c) > 0:
                c = c / np.sum(c) # Normalize
                
            scores = np.dot(templates, c)
            best_match_idx = np.argmax(scores)
            root_idx, quality = template_labels[best_match_idx]
            
            rel_idx = (root_idx - key_idx) % 12
            nn = nashville_map.get((rel_idx, quality), "?")
            
            # Fallback for non-diatonic chords
            if nn == "?":
                notes = ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"]
                nn = notes[rel_idx] + ("m" if quality == "min" else "")
                
            b_time = beat_times[col] if col < len(beat_times) else 0.0
            beat_chords.append((b_time, nn))
                
        return beat_chords

    def generate_stems_and_cues(self, sections, aligned_lyrics):
        target_dir = os.path.dirname(os.path.abspath(self.audio_path))
        
        # 1. Run Demucs
        print("[Demucs] Starting 6-stem AI separation. This may take several minutes...")
        demucs_main(['-n', 'htdemucs_6s', '--segment', '7', '-j', '1', self.audio_path, '-o', target_dir])
        
        song_name = os.path.splitext(os.path.basename(self.audio_path))[0]
        demucs_out_dir = os.path.join(target_dir, 'htdemucs_6s', song_name)

        if not os.path.exists(demucs_out_dir):
            print(f"[Demucs] Error: Expected output directory not found at {demucs_out_dir}")
            return None, aligned_lyrics, sections

        # 2. Calculate Pre-roll (8 beats)
        beat_duration = 60.0 / self.bpm
        preroll_duration = beat_duration * 8
        preroll_ms = int(preroll_duration * 1000)

        print(f"[Audio] Applying {preroll_duration:.2f}s pre-roll (8 beats @ {self.bpm} BPM)")

        # 3. Pad Stems
        stem_names = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other']
        silence = AudioSegment.silent(duration=preroll_ms)
        
        final_stems = {}
        for stem in stem_names:
            stem_path = os.path.join(demucs_out_dir, f'{stem}.wav')
            if os.path.exists(stem_path):
                audio = AudioSegment.from_wav(stem_path)
                padded = silence + audio
                final_path = os.path.join(target_dir, f'{stem}.wav')
                padded.export(final_path, format="wav")
                final_stems[stem] = final_path
        
        # 3.5 Magic Ingestion Fallbacks
        if not aligned_lyrics:
            # Transcribe from isolated vocal stem for maximum accuracy!
            vocal_stem = os.path.join(demucs_out_dir, 'vocals.wav')
            if os.path.exists(vocal_stem):
                aligned_lyrics = self.transcribe_lyrics(vocal_stem)
            else:
                aligned_lyrics = self.transcribe_lyrics(self.audio_path)
                
        if not sections:
            # Detect chords from the original audio (Madmom is trained on full mixes)
            chord_target = self.audio_path
            chords = self.detect_chords(chord_target)
            
            # Generate sections automatically
            sections = self.build_sections_from_lyrics(aligned_lyrics, chords)

        # 4. Generate Click Track
        print("[Audio] Generating Click Track...")
        sr_click = 44100
        click_length = int(self.original_duration * sr_click)
        click_track_original = librosa.clicks(times=self.beat_times, sr=sr_click, length=click_length)
        
        click_orig_path = os.path.join(target_dir, 'click_temp.wav')
        sf.write(click_orig_path, click_track_original, sr_click)
        
        # Create pre-roll clicks
        preroll_click_times = np.arange(0, preroll_duration, beat_duration)
        preroll_click_array = librosa.clicks(times=preroll_click_times, sr=sr_click, length=int(preroll_duration * sr_click))
        preroll_click_path = os.path.join(target_dir, 'click_preroll.wav')
        sf.write(preroll_click_path, preroll_click_array, sr_click)

        # Combine
        click_preroll_seg = AudioSegment.from_wav(preroll_click_path)
        click_orig_seg = AudioSegment.from_wav(click_orig_path)
        click_final_seg = click_preroll_seg + click_orig_seg
        click_final_path = os.path.join(target_dir, 'click.wav')
        click_final_seg.export(click_final_path, format="wav")
        final_stems['click'] = click_final_path
        
        os.remove(click_orig_path)
        os.remove(preroll_click_path)

        # 5. Generate Vocal Cues
        print("[Audio] Generating Vocal Cues...")
        total_duration_ms = preroll_ms + int(self.original_duration * 1000)
        cues_track = AudioSegment.silent(duration=total_duration_ms)
        
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)
        
        def render_tts(text, time_sec):
            temp_path = os.path.join(target_dir, 'temp_cue.wav')
            engine.save_to_file(text, temp_path)
            engine.runAndWait()
            if os.path.exists(temp_path):
                cue_seg = AudioSegment.from_wav(temp_path)
                return cue_seg
            return None

        # Add pre-roll count in (Beat 1, 3, 5, 6, 7, 8)
        cues = [
            ("One", 0),
            ("Two", beat_duration * 2),
            ("One", beat_duration * 4),
            ("Two", beat_duration * 5),
            ("Three", beat_duration * 6),
            ("Four", beat_duration * 7)
        ]
        
        # Add section cues 4 beats before they start
        for section in sections:
            # We need to find the raw_time for the section. We'll estimate based on aligned_lyrics.
            # Assuming sections match a lyric line text or we find the closest timestamp.
            # For simplicity, if a section name is in lyrics, we use that timestamp.
            sec_time = 0.0
            label = section.get('label') or section.get('name') or "Part"
            for line in aligned_lyrics:
                if label.lower() in line['text'].lower() or line['text'].lower().startswith(label.lower()):
                    sec_time = line['raw_time']
                    break
            
            if sec_time > 0:
                cue_time = sec_time + preroll_duration - (beat_duration * 4) # 1 measure before
                if cue_time > 0:
                    cues.append((label, cue_time))

        for text, t_sec in cues:
            cue_seg = render_tts(text, t_sec)
            if cue_seg:
                cues_track = cues_track.overlay(cue_seg, position=int(t_sec * 1000))

        cues_final_path = os.path.join(target_dir, 'cues.wav')
        cues_track.export(cues_final_path, format="wav")
        final_stems['cues'] = cues_final_path

        if os.path.exists(os.path.join(target_dir, 'temp_cue.wav')):
            os.remove(os.path.join(target_dir, 'temp_cue.wav'))

        # 6. Shift Timestamps
        print("[Audio] Shifting timestamps...")
        for line in aligned_lyrics:
            new_time = line['raw_time'] + preroll_duration
            minutes = int(new_time // 60)
            seconds = int(new_time % 60)
            line['timestamp'] = f"{minutes:02d}:{seconds:02d}"

        # Shift section times if they had explicit times (they didn't in the original, but just in case)
        
        return final_stems, aligned_lyrics, sections
