#!/usr/bin/env python3
import unittest
import sys
import os
import json
import tempfile
try:
    import numpy as np
    import scipy.io.wavfile as wavfile
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'scripts')))
    import ai_lyric_sync
    DEPENDENCIES_AVAILABLE = True
except ImportError:
    DEPENDENCIES_AVAILABLE = False


class TestAILyricSync(unittest.TestCase):
    def setUp(self):
        if not DEPENDENCIES_AVAILABLE:
            self.skipTest("Missing required Python AI dependencies (numpy/scipy/librosa)")
        self.test_dir = tempfile.TemporaryDirectory()
        self.sr = 22050

    def tearDown(self):
        if hasattr(self, 'test_dir'):
            self.test_dir.cleanup()

    def create_dummy_wav(self, filename, samples, sr=None):
        if sr is None:
            sr = self.sr
        path = os.path.join(self.test_dir.name, filename)
        # Normalize to int16
        audio = (samples * 32767).astype(np.int16)
        wavfile.write(path, sr, audio)
        return path

    def test_isolate_vocals_splits_reference_stem(self):
        """Test that isolate_vocals extracts the vocal component from a reference track."""
        duration = 1.0
        t = np.linspace(0, duration, int(self.sr * duration), endpoint=False)
        # Mix harmonic voice tone with percussive noise
        tone = 0.5 * np.sin(2 * np.pi * 440 * t)
        noise = 0.2 * np.random.randn(len(t))
        ref_path = self.create_dummy_wav("ref_track.wav", tone + noise)

        vocal_path = ai_lyric_sync.isolate_vocals(ref_path, sr=self.sr)
        self.assertTrue(os.path.exists(vocal_path), "Isolated vocals file must exist")
        self.assertIn("vocals", vocal_path)

        # Check vocal file is valid audio and non-empty
        sr_read, vocal_audio = wavfile.read(vocal_path)
        self.assertEqual(sr_read, self.sr)
        self.assertGreater(len(vocal_audio), 0)

    def test_find_audio_offset_with_split_track(self):
        """Test that find_audio_offset determines count-in offset using a SPLIT stereo track."""
        duration = 4.0
        count_in_sec = 1.0
        t = np.linspace(0, duration, int(self.sr * duration), endpoint=False)

        # Music burst at t=0 for reference
        ref_signal = np.zeros_like(t)
        ref_signal[:int(self.sr * 1.5)] = np.sin(2 * np.pi * 300 * t[:int(self.sr * 1.5)])
        ref_path = self.create_dummy_wav("ref.wav", ref_signal)

        # In a SPLIT track: Channel 0 is Click/Guide, Channel 1 is Music delayed by count_in_sec
        split_ch0 = np.zeros_like(t)
        # Count-in beeps in ch0
        split_ch0[:int(self.sr * count_in_sec)] = 0.8 * np.sin(2 * np.pi * 1000 * t[:int(self.sr * count_in_sec)])

        split_ch1 = np.zeros_like(t)
        # Music begins after count_in_sec in ch1
        music_start = int(self.sr * count_in_sec)
        music_len = min(int(self.sr * 1.5), len(t) - music_start)
        split_ch1[music_start:music_start + music_len] = ref_signal[:music_len]

        split_stereo = np.column_stack((split_ch0, split_ch1))
        split_path = self.create_dummy_wav("split_track.wav", split_stereo)

        offset = ai_lyric_sync.find_audio_offset(ref_path, split_path, sr=self.sr)
        # Offset should detect the ~1.0s count-in delay
        self.assertAlmostEqual(offset, count_in_sec, delta=0.25)

    def test_crowd_singalong_timestamp_adjustment(self):
        """Test that timestamps are adjusted for crowd anticipation (1.5-2.0s lead time)."""
        raw_lines = [
            {"time": 4.0, "text": "Amazing grace how sweet the sound"},
            {"time": 8.0, "text": "That saved a wretch like me"},
            {"time": 12.0, "text": "I once was lost but now am found"}
        ]
        lead_time = 1.8
        adjusted = ai_lyric_sync.adjust_for_crowd_singalong(raw_lines, lead_time=lead_time)

        self.assertEqual(len(adjusted), 3)
        # 4.0 - 1.8 = 2.2
        self.assertAlmostEqual(adjusted[0]["time"], 2.2, places=1)
        # 8.0 - 1.8 = 6.2
        self.assertAlmostEqual(adjusted[1]["time"], 6.2, places=1)
        # 12.0 - 1.8 = 10.2
        self.assertAlmostEqual(adjusted[2]["time"], 10.2, places=1)

        # Test line near 0s clamps to 0.0s, not negative
        early_lines = [{"time": 0.8, "text": "Early line"}]
        adjusted_early = ai_lyric_sync.adjust_for_crowd_singalong(early_lines, lead_time=lead_time)
        self.assertEqual(adjusted_early[0]["time"], 0.0)

    def test_update_church_songmap(self):
        """Test updating song-map.json with crowd-adjusted timestamps formatted for church slides."""
        songmap_path = os.path.join(self.test_dir.name, "song-map.json")
        initial_map = {
            "title": "Way Maker",
            "artist": "Sinach",
            "bpm": 68,
            "sections": [
                {
                    "name": "Verse 1",
                    "lines": [
                        "You are here moving in our midst",
                        "I worship You I worship You"
                    ]
                },
                {
                    "name": "Chorus",
                    "lines": [
                        "Way Maker Miracle Worker"
                    ]
                }
            ]
        }
        with open(songmap_path, 'w', encoding='utf-8') as f:
            json.dump(initial_map, f, indent=2)

        timed_lyrics = [
            {"time": 2.5, "text": "You are here moving in our midst"},
            {"time": 6.8, "text": "I worship You I worship You"},
            {"time": 12.0, "text": "Way Maker Miracle Worker"}
        ]

        updated = ai_lyric_sync.update_songmap_for_church(songmap_path, timed_lyrics)
        self.assertTrue(updated)

        with open(songmap_path, 'r', encoding='utf-8') as f:
            saved_map = json.load(f)

        # Section 0 lines should now have structured timestamp objects
        lines_v1 = saved_map["sections"][0]["lines"]
        self.assertEqual(lines_v1[0]["text"], "You are here moving in our midst")
        self.assertEqual(lines_v1[0]["timestamp"], "00:02.50")
        self.assertAlmostEqual(lines_v1[0]["timestampSeconds"], 2.5)

        self.assertEqual(lines_v1[1]["text"], "I worship You I worship You")
        self.assertEqual(lines_v1[1]["timestamp"], "00:06.80")

        # timedLyrics should also be populated
        self.assertIn("timedLyrics", saved_map)
        self.assertEqual(len(saved_map["timedLyrics"]), 3)
        self.assertEqual(saved_map["timedLyrics"][0]["time"], "00:02.50")
        self.assertEqual(saved_map["timedLyrics"][0]["text"], "You are here moving in our midst")


if __name__ == '__main__':
    unittest.main()
