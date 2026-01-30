# Automatic Lyrics Fetching Feature

## Overview

HarmonySync now includes automatic lyrics fetching from the Genius API, making it easy to populate `lyrics.txt` files for your song folders without manual typing or copy-pasting.

## How It Works

### Architecture

The feature consists of three main components:

1. **Backend Service (`lyrics-fetcher.js`)**:
   - Integrates with Genius API for song search
   - Scrapes lyrics from Genius web pages
   - Formats lyrics with section headers (Verse, Chorus, etc.)
   - Saves lyrics to song folders as `lyrics.txt`

2. **IPC Commands**:
   - `fetch_lyrics_from_genius`: Searches and fetches lyrics
   - `save_lyrics_to_file`: Saves lyrics to a specified folder
   - `fetch_and_save_lyrics`: Combined workflow command

3. **Frontend UI (`LyricsFetcher.jsx`)**:
   - Modal dialog for entering song and artist information
   - Integrated into the SetlistManager component
   - Shows download icon for songs without lyrics
   - Auto-refreshes after successful fetch

### User Workflow

1. **Add a Song Folder** to your setlist (must contain an `ogg/` subdirectory with audio tracks)
2. **Click the Download Icon** (📥) next to any song that doesn't have lyrics
3. **Enter Song Details** in the modal:
   - Song title (pre-filled with folder name)
   - Artist name (optional but recommended for better results)
4. **Click "Fetch Lyrics"** and wait for the process to complete
5. **Lyrics are automatically saved** to `{song_folder}/lyrics.txt`
6. **Edit icon appears** (✏️) once lyrics are available

## Features

### Genius API Integration

- **Free to use**: No API key required for basic searches
- **Comprehensive database**: Access to millions of songs
- **Accurate lyrics**: Community-verified and professionally sourced

### Intelligent Formatting

- **Section detection**: Automatically identifies [Verse], [Chorus], [Bridge], etc.
- **Clean output**: Removes HTML tags and formatting artifacts
- **Ready for slides**: Lyrics are formatted for immediate use in presentations

### User-Friendly Interface

- **Modal dialog**: Clean, focused interface for lyrics fetching
- **Pre-filled data**: Song title automatically populated from folder name
- **Visual feedback**: Loading states and success/error messages
- **Keyboard shortcuts**: Press Escape to close the modal

## Technical Details

### API Usage

The feature uses the Genius API's public search endpoint:
- No authentication required for searches
- Rate limits apply (typically 1000 requests per day)
- Web scraping used to extract lyrics (API doesn't provide lyrics directly)

### Data Storage

Lyrics are saved as plain text files:
- Location: `{song_folder}/lyrics.txt`
- Format: UTF-8 text
- Structure: Formatted with section headers and line breaks

### Error Handling

The system handles various error scenarios:
- **No results found**: Clear message if song isn't in Genius database
- **Network errors**: Timeout and connectivity issues reported
- **File system errors**: Permission and disk space problems handled
- **Invalid input**: Validation for empty or malformed song titles

## Best Practices

### For Best Results

1. **Include artist name**: Helps disambiguate common song titles
2. **Check folder name**: Ensure the folder name closely matches the song title
3. **Review lyrics**: After fetching, review the lyrics for accuracy
4. **Edit if needed**: Use the edit button (✏️) to make corrections

### Performance Tips

- **Fetch in bulk**: Add multiple songs to setlist before fetching
- **Offline preparation**: Fetch lyrics ahead of time, not during service
- **Network required**: Ensure internet connectivity for fetching

## Troubleshooting

### "No results found on Genius"

- **Solution**: Try different search terms or add artist name
- **Alternative**: Manually create `lyrics.txt` file

### "Failed to fetch lyrics"

- **Check internet connection**: Ensure you're online
- **Verify song exists**: Search for the song on genius.com
- **Try again**: Temporary network issues may resolve

### Lyrics are incomplete or wrong

- **Use edit function**: Click ✏️ to manually edit the lyrics
- **Check source**: Compare with genius.com to verify
- **Report issue**: If consistently wrong, check Genius directly

## Future Enhancements

Potential improvements for future versions:

1. **Multiple sources**: Add ChartLyrics, Musixmatch, or other providers
2. **API authentication**: Support Genius API tokens for higher rate limits
3. **Batch fetching**: Fetch lyrics for entire setlist at once
4. **Lyrics caching**: Store fetched lyrics in a local database
5. **Quality scoring**: Compare multiple sources for best accuracy
6. **Planning Center integration**: Fetch song lists from services
7. **Spell checking**: Automated correction of common typos

## Privacy & Security

- **No data collection**: Lyrics fetching doesn't store or transmit personal data
- **Direct API calls**: Communication goes directly to Genius, not through third parties
- **Local storage only**: Fetched lyrics are saved locally in song folders
- **Open source**: Code is auditable and transparent

## License & Attribution

- **Genius API**: Used under Genius Terms of Service
- **Lyrics copyright**: Belongs to original song publishers and writers
- **Fair use**: For personal worship and presentation use only

## Support

For issues, questions, or feature requests:
- GitHub Issues: Report bugs or request features
- Discussions: Ask questions and share tips
- Pull Requests: Contribute improvements

---

**Note**: This feature requires an internet connection to fetch lyrics. Always review fetched lyrics for accuracy before using them in a service.
