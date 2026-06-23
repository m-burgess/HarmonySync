import pytest
import os
from unittest.mock import MagicMock, patch, mock_open
import numpy as np
from services.audio_analyzer import AudioAnalyzer

@pytest.fixture
def mock_model():
    with patch('stable_whisper.load_model') as mock_load:
        model = MagicMock()
        mock_load.return_value = model
        AudioAnalyzer._model_cache = None # Reset cache for each test
        yield model
        AudioAnalyzer._model_cache = None

def test_analyze_bpm_and_key(mock_model):
    with patch('librosa.load') as mock_load, \
         patch('librosa.beat.beat_track') as mock_beat, \
         patch('librosa.feature.chroma_cqt') as mock_chroma, \
         patch('librosa.get_duration') as mock_duration:
        
        mock_load.return_value = (np.zeros(100), 22050)
        mock_beat.return_value = (np.array([120.0]), np.array([1, 2, 3]))
        
        # Mock chroma to peak at index 0 (Key of C)
        chroma_data = np.zeros((12, 10))
        chroma_data[0, :] = 1.0
        mock_chroma.return_value = chroma_data
        
        mock_duration.return_value = 180.0
        
        analyzer = AudioAnalyzer("test.wav", "lyrics.txt")
        bpm, key = analyzer.analyze_bpm_and_key()
        
        assert bpm == 120
        assert key == "C"

def test_align_lyrics(mock_model):
    lyrics_content = "[Verse 1]\nLine 1\nLine 2"

    with patch("builtins.open", mock_open(read_data=lyrics_content)):
        # Mock model alignment result
        mock_result = MagicMock()
        mock_segment1 = MagicMock(start=5.0, end=7.0, text="Line 1")
        mock_segment2 = MagicMock(start=15.0, end=17.0, text="Line 2")
        mock_result.segments = [mock_segment1, mock_segment2]
        mock_model.align.return_value = mock_result

        analyzer = AudioAnalyzer("test.wav", "lyrics.txt")
        sections, aligned = analyzer.parse_and_align_lyrics()
    
    assert len(aligned) == 2
    assert aligned[0]["timestamp"] == "00:05"
    assert aligned[0]["text"] == "Line 1"
    assert aligned[1]["timestamp"] == "00:15"
    assert aligned[1]["text"] == "Line 2"

def test_generate_stems_and_cues(mock_model):
    # This test involves a lot of side effects (Demucs, pydub, pyttsx3, sf)
    # We'll mock the major components to verify the workflow
    with patch('services.audio_analyzer.demucs_main') as mock_demucs, \
         patch('services.audio_analyzer.AudioSegment') as mock_audio_segment, \
         patch('services.audio_analyzer.pyttsx3') as mock_pyttsx3, \
         patch('services.audio_analyzer.sf') as mock_sf, \
         patch('services.audio_analyzer.librosa') as mock_librosa, \
         patch('os.path.exists') as mock_exists, \
         patch('os.remove') as mock_remove, \
         patch('os.path.abspath') as mock_abspath:
        
        mock_abspath.side_effect = lambda x: x
        mock_exists.return_value = True
        mock_librosa.get_duration.return_value = 180.0
        mock_librosa.clicks.return_value = np.zeros(100)
        
        # Mock AudioSegment operations
        mock_audio = MagicMock()
        mock_audio_segment.from_wav.return_value = mock_audio
        mock_audio_segment.silent.return_value = mock_audio
        mock_audio.__add__.return_value = mock_audio
        mock_audio.overlay.return_value = mock_audio
        
        # Mock TTS
        mock_engine = MagicMock()
        mock_pyttsx3.init.return_value = mock_engine
        
        analyzer = AudioAnalyzer("test.wav", "lyrics.txt")
        analyzer.bpm = 120
        analyzer.estimated_key = "C"
        analyzer.beat_times = np.array([0, 0.5, 1.0])
        analyzer.original_duration = 180.0
        
        sections = [{"name": "Verse 1", "chords": "1"}]
        aligned_lyrics = [{"raw_time": 10.0, "timestamp": "00:10", "text": "Verse 1"}]
        
        stems, new_lyrics, new_sections = analyzer.generate_stems_and_cues(sections, aligned_lyrics)
        
        assert mock_demucs.called
        assert 'vocals' in stems
        assert 'click' in stems
        assert 'cues' in stems
        
        # Verify timestamp shift (8 beats @ 120bpm = 4 seconds)
        assert new_lyrics[0]["timestamp"] == "00:14"
