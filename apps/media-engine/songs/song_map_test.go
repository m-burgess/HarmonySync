package songs

import (
	"encoding/xml"
	"os"
	"testing"
)

func TestParseSongMapXML(t *testing.T) {
	xmlData := `
<song>
  <title>My Jesus</title>
  <bpm>78</bpm>
  <timing>4/4</timing>
  <length>3:00</length>
  <part name="Verse 1">
    <chords>1-6m-5-4</chords>
    <lyrics>
      <line timestamp="00:00">Line 1</line>
      <line timestamp="00:10">Line 2</line>
    </lyrics>
  </part>
</song>`

	var song SongMap
	err := xml.Unmarshal([]byte(xmlData), &song)
	if err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	if song.Title != "My Jesus" {
		t.Errorf("Expected title 'My Jesus', got '%s'", song.Title)
	}

	if len(song.Sections) != 1 {
		t.Fatalf("Expected 1 section, got %d", len(song.Sections))
	}

	section := song.Sections[0]
	if section.Label != "Verse 1" {
		t.Errorf("Expected section label 'Verse 1', got '%s'", section.Label)
	}

	if len(section.Lines) != 2 {
		t.Errorf("Expected 2 lyric lines, got %d", len(section.Lines))
	}

	if section.Lines[0].Timestamp != "00:00" {
		t.Errorf("Expected first timestamp '00:00', got '%s'", section.Lines[0].Timestamp)
	}
}

func TestParseSongMapJSON(t *testing.T) {
	jsonData := `{
		"title": "My Jesus JSON",
		"bpm": 78,
		"timing": "4/4",
		"length": "3:00",
		"originalKey": "G",
		"sections": [
			{
				"id": "verse_1",
				"label": "Verse 1",
				"chords": "1-6m-5-4",
				"lines": [
					{"timestamp": "00:00", "text": "Line 1"},
					{"timestamp": "00:10", "text": "Line 2"}
				]
			}
		]
	}`

	tempFile, err := os.CreateTemp("", "song-map-*.json")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tempFile.Name())

	if _, err := tempFile.Write([]byte(jsonData)); err != nil {
		t.Fatalf("Failed to write to temp file: %v", err)
	}
	tempFile.Close()

	song, err := ParseSongMap(tempFile.Name())
	if err != nil {
		t.Fatalf("Failed to ParseSongMap: %v", err)
	}

	if song.Title != "My Jesus JSON" {
		t.Errorf("Expected title 'My Jesus JSON', got '%s'", song.Title)
	}

	if song.OriginalKey != "G" {
		t.Errorf("Expected originalKey 'G', got '%s'", song.OriginalKey)
	}

	if len(song.Sections) != 1 {
		t.Fatalf("Expected 1 section, got %d", len(song.Sections))
	}

	section := song.Sections[0]
	if section.Label != "Verse 1" {
		t.Errorf("Expected section label 'Verse 1', got '%s'", section.Label)
	}

	if section.Lyrics != "Line 1\nLine 2" {
		t.Errorf("Expected combined lyrics 'Line 1\nLine 2', got '%s'", section.Lyrics)
	}
}
