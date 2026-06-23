import os
import json

class JSONGenerator:
    def __init__(self, title, bpm, key, length, aligned_lyrics, pdf_sections, output_path, stem_files=None):
        self.title = title
        self.bpm = int(bpm) if str(bpm).isdigit() else 0
        self.key = key
        self.length = length
        self.aligned_lyrics = aligned_lyrics
        self.pdf_sections = pdf_sections
        self.output_path = output_path
        self.stem_files = stem_files

    def generate(self):
        # Convert stem_files if available
        stems = []
        if self.stem_files:
            for name, path in self.stem_files.items():
                stems.append({
                    "name": name,
                    "file": os.path.basename(path)
                })

        # Group lyrics into sections based on PDF sections or fallback structure
        total_lines = len(self.aligned_lyrics)
        num_sections = len(self.pdf_sections) if self.pdf_sections else 1
        lines_per_section = max(1, total_lines // num_sections)

        sections = []
        for i, section_data in enumerate(self.pdf_sections):
            label = section_data.get("label") or section_data.get("name") or f"Part {i+1}"
            
            if "lyrics" in section_data:
                section_lyrics = section_data["lyrics"]
            else:
                start_idx = i * lines_per_section
                end_idx = start_idx + lines_per_section if i < num_sections - 1 else total_lines
                section_lyrics = self.aligned_lyrics[start_idx:end_idx]
            lines_list = []
            raw_lines_text = []
            for line in section_lyrics:
                lines_list.append({
                    "timestamp": line["timestamp"],
                    "text": line["text"]
                })
                raw_lines_text.append(line["text"])

            # Generate standard ID (lowercase, snake_case)
            base_id = label.lower().replace(" ", "_")
            section_id = f"{base_id}_{i}"

            sections.append({
                "id": section_id,
                "label": label,
                "chords": section_data.get("chords", ""),
                "lyrics": "\n".join(raw_lines_text),
                "lines": lines_list
            })

        # If no PDF sections were found, create a default part
        if not self.pdf_sections:
            lines_list = []
            raw_lines_text = []
            for line in self.aligned_lyrics:
                lines_list.append({
                    "timestamp": line["timestamp"],
                    "text": line["text"]
                })
                raw_lines_text.append(line["text"])

            sections.append({
                "id": "verse_1",
                "label": "Verse 1",
                "chords": "",
                "lyrics": "\n".join(raw_lines_text),
                "lines": lines_list
            })

        song_map = {
            "title": self.title,
            "bpm": self.bpm,
            "timing": "4/4",
            "length": self.length,
            "originalKey": self.key,
            "midiNotes": [],
            "lyricsUrl": "",
            "sections": sections
        }

        # Include stems in metadata if present
        if stems:
            song_map["stems"] = stems

        with open(self.output_path, 'w', encoding='utf-8') as f:
            json.dump(song_map, f, indent=2, ensure_ascii=False)

        return self.output_path
