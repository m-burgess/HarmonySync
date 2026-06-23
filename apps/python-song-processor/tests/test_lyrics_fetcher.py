from services.lyrics_fetcher import LyricsFetcher

def test_clean_lyrics():
    fetcher = LyricsFetcher()
    
    raw = "Come Alive Lyrics[Verse 1]\nI keep my eyes fixed on You\n[Chorus]\nI come alive\n123Embed"
    cleaned = fetcher._clean_lyrics(raw)
    
    assert cleaned == "[Verse 1]\nI keep my eyes fixed on You\n[Chorus]\nI come alive"
    
    raw2 = "Some Song Lyrics\nLine 1\nLine 2\nYou might also like\nEmbed"
    cleaned2 = fetcher._clean_lyrics(raw2)
    assert cleaned2 == "Line 1\nLine 2"
