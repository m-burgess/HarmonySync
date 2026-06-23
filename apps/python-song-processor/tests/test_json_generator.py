import os
import json
import pytest
from services.json_generator import JSONGenerator

def test_json_generator_basic(tmp_path):
    output_path = tmp_path / "song-map.json"
    aligned_lyrics = [
        {"timestamp": "00:00", "text": "Line 1"},
        {"timestamp": "00:10", "text": "Line 2"}
    ]
    sections = [
        {"label": "Verse 1", "chords": "1 4 5"}
    ]
    
    generator = JSONGenerator(
        title="Test Song",
        bpm=120,
        key="C",
        length="3:30",
        aligned_lyrics=aligned_lyrics,
        pdf_sections=sections,
        output_path=str(output_path)
    )
    
    generator.generate()
    
    assert os.path.exists(output_path)
    
    # Parse generated JSON and verify
    with open(output_path, "r", encoding="utf-8") as f:
        song_map = json.load(f)
        
    assert song_map["title"] == "Test Song"
    assert song_map["bpm"] == 120
    assert song_map["originalKey"] == "C"
    
    sections_list = song_map["sections"]
    assert len(sections_list) == 1
    assert sections_list[0]["label"] == "Verse 1"
    assert sections_list[0]["chords"] == "1 4 5"
    assert sections_list[0]["id"] == "verse_1"
    
    lines = sections_list[0]["lines"]
    assert len(lines) == 2
    assert lines[0]["text"] == "Line 1"
    assert lines[0]["timestamp"] == "00:00"

def test_json_generator_with_stems(tmp_path):
    output_path = tmp_path / "song-map.json"
    stem_files = {
        "vocals": "/path/to/vocals.wav",
        "drums": "/path/to/drums.wav"
    }
    
    generator = JSONGenerator(
        title="Stem Song",
        bpm=100,
        key="G",
        length="4:00",
        aligned_lyrics=[],
        pdf_sections=[],
        output_path=str(output_path),
        stem_files=stem_files
    )
    
    generator.generate()
    
    with open(output_path, "r", encoding="utf-8") as f:
        song_map = json.load(f)
        
    stems = song_map.get("stems")
    assert stems is not None
    assert len(stems) == 2
    
    stem_names = [s["name"] for s in stems]
    assert "vocals" in stem_names
    assert "drums" in stem_names
    
    vocal_stem = [s for s in stems if s["name"] == "vocals"][0]
    assert vocal_stem["file"] == "vocals.wav"
