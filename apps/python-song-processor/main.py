import click
import os
import librosa
from services.pdf_parser import PDFParser
from services.audio_analyzer import AudioAnalyzer
from services.json_generator import JSONGenerator

import json

def report_progress(step, total, message):
    percent = int((step / total) * 100)
    print(f'[PROGRESS] {json.dumps({"step": step, "total": total, "message": message, "percent": percent})}')

@click.command()
@click.option('--audio', required=True, type=click.Path(exists=True), help='Path to reference audio file')
@click.option('--guide', required=False, type=click.Path(exists=True), help='Path to guide audio file for syncing reference')
@click.option('--lyrics', required=False, type=click.Path(exists=True), help='Path to lyrics.txt file (Optional)')
@click.option('--pdf', required=False, type=click.Path(exists=True), help='Path to PDF chord chart (Optional)')
@click.option('--output', default='song-map.json', type=click.Path(), help='Output path for song-map.json')
@click.option('--separate-stems', is_flag=True, help='Use AI to separate audio into 6 stems and generate click/cues')
@click.option('--skip-alignment', is_flag=True, help='Skip lyric alignment using Whisper')
def process_song(audio, guide, lyrics, pdf, output, separate_stems, skip_alignment):
    """
    Processes an audio file, lyrics text file, and PDF chord chart
    to generate a song-map.json file for HarmonySync.
    """
    click.echo(f"Processing song...")
    click.echo(f"Audio: {audio}")
    
    total_steps = 5

    # 1. Parse PDF for chords and sections
    report_progress(1, total_steps, "Parsing PDF...")
    sections = []
    if pdf:
        parser = PDFParser(pdf)
        sections = parser.parse()
    else:
        click.echo("1. No PDF provided. Structural sections will be procedurally generated.")

    # 2. Analyze Audio for BPM, Key, and Duration
    report_progress(2, total_steps, "Analyzing Audio (BPM & Key)...")
    analyzer = AudioAnalyzer(audio, lyrics, guide)
    bpm, key = analyzer.analyze_bpm_and_key()
    
    # Override key if there's an indicator in the folder title
    title_for_key = os.path.basename(os.path.dirname(os.path.abspath(audio)))
    if title_for_key != '.' and ' - ' in title_for_key:
        potential_key = title_for_key.split(' - ')[-1].strip()
        valid_keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm']
        if potential_key in valid_keys:
            key = potential_key
            analyzer.estimated_key = key # Override in analyzer for chord detection

    click.echo(f"Estimated BPM: {bpm}, Key: {key}")

    # Get duration
    import librosa
    duration_secs = librosa.get_duration(path=audio)
    minutes = int(duration_secs // 60)
    seconds = int(duration_secs % 60)
    length_str = f"{minutes}:{seconds:02d}"

    # Check if we should automatically fetch lyrics from Genius
    fetched_lyrics_path = None
    if not lyrics and not pdf and not separate_stems:
        from services.lyrics_fetcher import LyricsFetcher
        fetcher = LyricsFetcher()
        # Guess song name from audio filename
        base_name = os.path.basename(audio)
        query = os.path.splitext(base_name)[0].replace('-', ' ').replace('_', ' ')
        
        fetched_text = fetcher.fetch_lyrics(query)
        if fetched_text:
            # Save to a temporary file
            fetched_lyrics_path = "/tmp/fetched_lyrics.txt"
            with open(fetched_lyrics_path, "w", encoding="utf-8") as f:
                f.write(fetched_text)
            lyrics = fetched_lyrics_path
            analyzer.lyrics_path = fetched_lyrics_path

    # 3. Align or Transcribe lyrics
    report_progress(3, total_steps, "Aligning Lyrics...")
    aligned_lyrics = []
    
    if not separate_stems:
        if lyrics:
            sections, aligned_lyrics = analyzer.parse_and_align_lyrics(skip_alignment=skip_alignment)
        else:
            if skip_alignment:
                aligned_lyrics = []
            else:
                aligned_lyrics = analyzer.transcribe_lyrics()
            sections = []

        # Check if sections already have chords parsed from lyrics
        has_chords = sections and all('chords' in sec for sec in sections if sec.get('label') != 'Intro')

        if not sections:
            chords = analyzer.detect_chords()
            sections = analyzer.build_sections_from_lyrics(aligned_lyrics, chords)
        elif lyrics and not has_chords:
            chords = analyzer.detect_chords()
            sections = analyzer.assign_chords_to_sections(sections, chords)
        elif has_chords:
            click.echo("[Chords] Skipping Madmom detection; chords were parsed directly from text!")

    stem_files = None
    if separate_stems:
        report_progress(4, total_steps, "AI Stem Separation (This will take a few minutes)...")
        stem_files, aligned_lyrics, sections = analyzer.generate_stems_and_cues(sections, aligned_lyrics)
    else:
        report_progress(4, total_steps, "Skipping AI Stem Separation.")

    # 5. Generate JSON
    report_progress(5, total_steps, f"Generating {output}...")
    title = os.path.basename(os.path.dirname(os.path.abspath(audio))) # Use folder name as title fallback
    if title == '.':
        title = "Untitled Song"

    generator = JSONGenerator(title, bpm, key, length_str, aligned_lyrics, sections, output, stem_files)
    generator.generate()
    
    report_progress(5, total_steps, "Done!")
    click.echo(f"Successfully generated {output}!")

import multiprocessing

if __name__ == '__main__':
    multiprocessing.freeze_support()
    process_song()
