import os
import psutil
import time
from services.pdf_parser import PDFParser
from services.audio_analyzer import AudioAnalyzer
from services.xml_generator import XMLGenerator
from unittest.mock import MagicMock, patch
import numpy as np

def get_memory_usage():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024  # MB

def run_memory_test():
    print("Starting Memory Test...")
    initial_mem = get_memory_usage()
    print(f"Initial Memory: {initial_mem:.2f} MB")

    # Mock heavy dependencies to focus on our service logic memory
    with patch('stable_whisper.load_model') as mock_load, \
         patch('services.audio_analyzer.demucs_main'), \
         patch('services.audio_analyzer.AudioSegment'), \
         patch('services.audio_analyzer.pyttsx3'), \
         patch('services.audio_analyzer.sf'), \
         patch('services.audio_analyzer.librosa'), \
         patch('fitz.open') as mock_fitz_open:

        # Setup mocks
        mock_model = MagicMock()
        mock_load.return_value = mock_model
        
        mock_doc = MagicMock()
        mock_page = MagicMock()
        mock_page.get_text.return_value = "[Intro]\nG C D G\n" * 100 # Large-ish text
        mock_doc.__iter__.return_value = [mock_page] * 50 # 50 pages
        mock_fitz_open.return_value = mock_doc

        print("Running processing loop to check for leaks...")
        for i in range(500):
            # PDF Parsing
            parser = PDFParser("test.pdf")
            sections = parser.parse()
            
            # Audio Analysis
            analyzer = AudioAnalyzer("test.wav", "lyrics.txt")
            analyzer.bpm = 120
            analyzer.estimated_key = "C"
            analyzer.beat_times = np.array([0, 0.5, 1.0])
            analyzer.original_duration = 180.0
            
            # XML Generation
            generator = XMLGenerator("Test", 120, "C", "3:00", [], sections, "test.xml")
            generator.generate()
            
            # Reset mocks to avoid call history accumulation
            mock_load.reset_mock()
            mock_fitz_open.reset_mock()
            mock_doc.reset_mock()
            mock_page.reset_mock()
            
            if (i + 1) % 50 == 0:
                current_mem = get_memory_usage()
                print(f"Iteration {i+1}: {current_mem:.2f} MB (Delta: {current_mem - initial_mem:.2f} MB)")

    final_mem = get_memory_usage()
    print(f"Final Memory: {final_mem:.2f} MB")
    print(f"Total Growth: {final_mem - initial_mem:.2f} MB")

    if final_mem - initial_mem > 10: # Threshold of 10MB for 100 iterations of mocked logic
        print("POTENTIAL MEMORY LEAK DETECTED!")
    else:
        print("Memory usage remains stable.")

if __name__ == "__main__":
    # Ensure psutil is installed
    try:
        import psutil
    except ImportError:
        import subprocess
        import sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil"])
        import psutil
        
    run_memory_test()
