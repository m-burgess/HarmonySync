import fitz  # PyMuPDF
import re

class PDFParser:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path

    def parse(self):
        """
        Extract text from PDF and attempt to find sections and chords.
        Returns a list of dictionaries with section info.
        """
        doc = fitz.open(self.pdf_path)
        try:
            text = ""
            for page in doc:
                text += page.get_text() + "\n"
        finally:
            doc.close()

        # A very basic heuristic: we look for [Section] tags or common section names
        # and gather the lines that follow as chords/lyrics.
        sections = []
        lines = text.split('\n')
        
        current_section = None
        current_chords = []

        # Common section keywords if brackets aren't used
        section_keywords = ["intro", "verse", "chorus", "bridge", "interlude", "ending", "outro"]

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Check if line is a section header like [Verse 1] or Chorus:
            lower_line = line.lower()
            is_section = False
            
            if line.startswith('[') and line.endswith(']'):
                is_section = True
                section_name = line[1:-1]
            else:
                for keyword in section_keywords:
                    if lower_line.startswith(keyword):
                        is_section = True
                        section_name = line
                        break

            if is_section:
                # Save previous section
                if current_section:
                    sections.append({
                        "label": current_section,
                        "chords": " ".join(current_chords)
                    })
                current_section = section_name.strip(":")
                current_chords = []
            else:
                # If it's not a section header, it might be a chord line or lyrics.
                # A heuristic to determine if a line is mostly chords:
                # Chords typically have uppercase letters, m, #, b, /, numbers
                words = line.split()
                if not words:
                    continue
                
                # Check if majority of words look like chords
                chord_pattern = re.compile(r'^[A-G][#b]?(m|maj|min|dim|aug|sus)?[0-9]?(/[A-G][#b]?)?$')
                chord_count = sum(1 for w in words if chord_pattern.match(w))
                
                if len(words) > 0 and chord_count / len(words) >= 0.5:
                    current_chords.extend(words)

        # Append last section
        if current_section:
            sections.append({
                "label": current_section,
                "chords": " ".join(current_chords)
            })

        return sections
