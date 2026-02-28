import { useState, useEffect } from 'react';
import { core } from '../../electron-adapter';

/**
 * LyricsFetcher Component
 *
 * Provides UI for fetching lyrics from Genius API and saving to song folders
 */
type SongItem = { name?: string; path?: string };

interface LyricsFetcherProps {
  songItem?: SongItem | null;
  // Accept any callback shape to maintain compatibility with various parent handlers
  onLyricsFetched?: (song: any) => void;
}

const LyricsFetcher = ({ songItem, onLyricsFetched }: LyricsFetcherProps) => {
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [showForm, setShowForm] = useState(false);
  const [songTitle, setSongTitle] = useState(songItem?.name || '');
  const [artistName, setArtistName] = useState('');

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      const k = e as KeyboardEvent;
      if (k.key === 'Escape' && showForm && !isFetching) {
        closeForm();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showForm, isFetching]);

  const closeForm = () => {
    setShowForm(false);
    setSongTitle(songItem?.name || '');
    setArtistName('');
    // Notify parent to clear selection
    if (onLyricsFetched) {
      onLyricsFetched(null);
    }
  };

  const handleFetchLyrics = async () => {
    if (!songTitle.trim()) {
      alert('Please enter a song title.');
      return;
    }

    if (!songItem?.path) {
      alert('No song folder selected.');
      return;
    }

    setIsFetching(true);

    try {
      console.log(`Fetching lyrics for "${songTitle}" by "${artistName || 'Unknown'}"...`);
      
      // Call the backend command to fetch and save lyrics
      const savedPath = await core.invoke('fetch_and_save_lyrics', {
        songTitle: songTitle.trim(),
        artist: artistName.trim() || null,
        folderPath: songItem.path
      });

      alert(`Lyrics successfully fetched and saved to:\n${savedPath}`);

      // Notify parent component that lyrics were fetched
      if (onLyricsFetched) {
        onLyricsFetched(songItem);
      }

      // Reset form
      setShowForm(false);
      setSongTitle(songItem?.name || '');
      setArtistName('');

    } catch (error) {
      console.error('Failed to fetch lyrics:', error);
      alert(`Failed to fetch lyrics: ${(error as any).message || String(error)}`);
    } finally {
      setIsFetching(false);
    }
  };

  // Show the form immediately when component mounts
  useEffect(() => {
    setShowForm(true);
  }, []);

  // If form is not shown, don't render anything
  if (!showForm) {
    return null;
  }

  // Form for entering song details with backdrop
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!isFetching) closeForm();
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999
        }}
      />
      
      {/* Modal */}
      <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'var(--bg-stage)',
        border: '1px solid var(--border-surface)',
        borderRadius: '8px',
        padding: '24px',
        minWidth: '400px',
        maxWidth: '90vw',
        zIndex: 1000,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
      }}
    >
      <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
        Fetch Lyrics from Genius
      </h3>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Song Title *
        </label>
        <input
          type="text"
          value={songTitle}
          onChange={(e) => setSongTitle(e.target.value)}
          placeholder="Enter song title"
          disabled={isFetching}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid var(--border-surface)',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Artist Name (optional)
        </label>
        <input
          type="text"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          placeholder="Enter artist name"
          disabled={isFetching}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid var(--border-surface)',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isFetching) closeForm();
          }}
          disabled={isFetching}
          style={{
            padding: '8px 16px',
            border: '1px solid var(--border-surface)',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            cursor: isFetching ? 'not-allowed' : 'pointer',
            opacity: isFetching ? 0.5 : 1
          }}
        >
          Cancel
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFetchLyrics();
          }}
          disabled={isFetching || !songTitle.trim()}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#3b82f6',
            color: 'white',
            cursor: isFetching || !songTitle.trim() ? 'not-allowed' : 'pointer',
            opacity: isFetching || !songTitle.trim() ? 0.5 : 1
          }}
        >
          {isFetching ? 'Fetching...' : 'Fetch Lyrics'}
        </button>
      </div>

      {isFetching && (
        <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Fetching lyrics from Genius...
        </div>
      )}
    </div>
    </>
  );
};

export default LyricsFetcher;
