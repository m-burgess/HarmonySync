import pytest
from unittest.mock import MagicMock, patch
from services.pdf_parser import PDFParser

def test_pdf_parser_sections():
    # Mocking fitz.open and the document structure
    with patch('fitz.open') as mock_open:
        mock_doc = MagicMock()
        mock_page = MagicMock()
        
        # Simulated PDF text
        pdf_text = """
        [Intro]
        G C D G
        
        [Verse 1]
        G
        Amazing Grace
        C         G
        How sweet the sound
        
        Chorus:
        G      C      G
        I once was lost
        """
        
        mock_page.get_text.return_value = pdf_text
        mock_doc.__iter__.return_value = [mock_page]
        mock_open.return_value = mock_doc
        
        parser = PDFParser("test.pdf")
        sections = parser.parse()
        
        assert len(sections) == 3
        
        assert sections[0]["label"] == "Intro"
        assert "G C D G" in sections[0]["chords"]
        
        assert sections[1]["label"] == "Verse 1"
        assert "G C G" in sections[1]["chords"]
        
        assert sections[2]["label"] == "Chorus"
        assert "G C G" in sections[2]["chords"]

def test_pdf_parser_chord_detection():
    with patch('fitz.open') as mock_open:
        mock_doc = MagicMock()
        mock_page = MagicMock()
        
        # Mixed chords and lyrics
        pdf_text = """
        [Bridge]
        Am7     D7/F#    G
        This is a lyric line
        Cmaj7    Bmin    Em
        And another one
        """
        
        mock_page.get_text.return_value = pdf_text
        mock_doc.__iter__.return_value = [mock_page]
        mock_open.return_value = mock_doc
        
        parser = PDFParser("test.pdf")
        sections = parser.parse()
        
        assert len(sections) == 1
        chords = sections[0]["chords"]
        assert "Am7" in chords
        assert "D7/F#" in chords
        assert "Cmaj7" in chords
        assert "This" not in chords # Heuristic should exclude lyrics
