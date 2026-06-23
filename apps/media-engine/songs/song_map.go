package songs

import (
	"encoding/json"
	"encoding/xml"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
)

type LyricLine struct {
	Timestamp string `xml:"timestamp,attr" json:"timestamp"`
	Text      string `xml:",chardata" json:"text"`
}

type SongSection struct {
	ID     string      `xml:"-" json:"id"` // Generated in Go or TS
	Label  string      `xml:"name,attr" json:"label"`
	Chords string      `xml:"chords" json:"chords"`
	Lyrics string      `xml:"-" json:"lyrics"` // Combined lines
	Lines  []LyricLine `xml:"lyrics>line" json:"lines"`
}

type SongMap struct {
	XMLName     xml.Name      `xml:"song" json:"-"`
	Title       string        `xml:"title" json:"title"`
	BPM         int           `xml:"bpm" json:"bpm"`
	Timing      string        `xml:"timing" json:"timing"`
	Length      string        `xml:"length" json:"length"`
	OriginalKey string        `xml:"originalKey" json:"originalKey"`
	MIDINotes   []string      `xml:"midiNotes>note" json:"midiNotes"`
	LyricsURL   string        `xml:"lyricsUrl" json:"lyricsUrl"`
	Sections    []SongSection `xml:"part" json:"sections"`
}

// ParseSongMap parses the Song-Map file (XML or JSON) at the given path
func ParseSongMap(filePath string) (*SongMap, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	byteValue, err := ioutil.ReadAll(file)
	if err != nil {
		return nil, err
	}

	var song SongMap
	ext := strings.ToLower(filepath.Ext(filePath))

	if ext == ".json" {
		err = json.Unmarshal(byteValue, &song)
		if err != nil {
			return nil, err
		}
	} else {
		err = xml.Unmarshal(byteValue, &song)
		if err != nil {
			return nil, err
		}
	}

	// Post-process to combine lines into lyrics field and generate IDs if missing
	for i := range song.Sections {
		if song.Sections[i].ID == "" {
			song.Sections[i].ID = strings.ReplaceAll(song.Sections[i].Label, " ", "_")
		}
		
		if song.Sections[i].Lyrics == "" {
			var lyricsBuilder strings.Builder
			for j, line := range song.Sections[i].Lines {
				lyricsBuilder.WriteString(line.Text)
				if j < len(song.Sections[i].Lines)-1 {
					lyricsBuilder.WriteString("\n")
				}
			}
			song.Sections[i].Lyrics = lyricsBuilder.String()
		}
	}

	return &song, nil
}
