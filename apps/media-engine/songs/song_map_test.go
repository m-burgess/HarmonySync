package songs

import (
	"encoding/xml"
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
