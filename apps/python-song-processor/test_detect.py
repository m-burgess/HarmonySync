import sys
sys.path.append("/home/mike-burgess/RustPresenter/apps/python-song-processor")
from services.audio_analyzer import AudioAnalyzer

analyzer = AudioAnalyzer("/home/mike-burgess/Downloads/Come Alive - A/Honor & Glory - Come Alive  (Official Live Video).mp3", "")
analyzer.estimated_key = "A"
analyzer.estimated_bpm = 152
print("Detecting chords...")
chords = analyzer.detect_chords()
print("Resulting chords:", chords)
