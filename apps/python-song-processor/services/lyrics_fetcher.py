import os
import re
import click
import lyricsgenius

class LyricsFetcher:
    def __init__(self):
        self.token = os.environ.get("GENIUS_ACCESS_TOKEN")
        if self.token:
            # We turn off verbose output and avoid timeouts if possible
            self.genius = lyricsgenius.Genius(self.token, verbose=False, retries=3)
        else:
            self.genius = None

    def fetch_lyrics(self, query):
        """
        Fetches lyrics from Genius for a given query (e.g. 'Come Alive Honor & Glory').
        Returns the raw lyrics string if found, else None.
        """
        if not self.genius:
            click.secho("[Genius] GENIUS_ACCESS_TOKEN not set. Skipping automatic lyrics fetch.", fg="yellow")
            return None
            
        try:
            click.echo(f"[Genius] Searching for: '{query}'")
            song = self.genius.search_song(query)
            if song:
                click.secho(f"[Genius] Found lyrics: {song.title} by {song.artist}", fg="green")
                return self._clean_lyrics(song.lyrics)
            else:
                click.secho("[Genius] No lyrics found.", fg="yellow")
                return None
        except Exception as e:
            click.secho(f"[Genius] Error fetching lyrics: {e}", fg="red")
            return None

    def _clean_lyrics(self, raw_lyrics):
        """
        Cleans up Genius formatting artifacts (like 'Embed' at the end or Contributors at the top).
        """
        # Genius lyrics often start with "<Song Title> Lyrics[Verse 1]"
        # We want to strip out the first line up to "Lyrics" if it's jumbled
        lines = raw_lyrics.split('\n')
        
        # Remove top boilerplate
        if len(lines) > 0 and 'Lyrics' in lines[0]:
            parts = lines[0].split('Lyrics', 1)
            if len(parts) > 1 and parts[1].strip().startswith('['):
                lines[0] = parts[1].strip()
            else:
                lines = lines[1:]

        # Remove bottom boilerplate (e.g. "123Embed" or "You might also like")
        cleaned_lines = []
        for line in lines:
            if 'Embed' in line and line.endswith('Embed'):
                # Strip trailing 'Embed' and numbers
                line = re.sub(r'\d*Embed$', '', line)
            if 'You might also like' in line:
                continue
            
            line = line.strip()
            if line:
                cleaned_lines.append(line)

        return "\n".join(cleaned_lines)
