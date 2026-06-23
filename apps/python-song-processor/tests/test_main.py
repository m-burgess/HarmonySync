import pytest
from click.testing import CliRunner
from unittest.mock import patch, MagicMock
from main import process_song

def test_cli_help():
    runner = CliRunner()
    result = runner.invoke(process_song, ['--help'])
    assert result.exit_code == 0
    assert 'Processes an audio file' in result.output

def test_cli_basic_flow():
    runner = CliRunner()
    
    # We need to mock the services used in main.py
    with patch('main.PDFParser') as mock_pdf_parser, \
         patch('main.AudioAnalyzer') as mock_audio_analyzer, \
         patch('main.JSONGenerator') as mock_json_generator, \
         patch('main.librosa.get_duration') as mock_duration, \
         patch('os.path.exists') as mock_exists:
        
        mock_exists.return_value = True
        mock_duration.return_value = 180.0
        
        # Mock analyzer results
        analyzer_instance = mock_audio_analyzer.return_value
        analyzer_instance.analyze_bpm_and_key.return_value = (120, "C")
        analyzer_instance.align_lyrics.return_value = []
        
        # Create a dummy audio file for CliRunner (or just mock exists)
        with runner.isolated_filesystem():
            with open('test.wav', 'w') as f:
                f.write('dummy')
            
            result = runner.invoke(process_song, ['--audio', 'test.wav'])
            
            assert result.exit_code == 0
            assert 'Successfully generated song-map.json!' in result.output
            
            # Verify services were called
            mock_audio_analyzer.assert_called_once()
            mock_json_generator.assert_called_once()
