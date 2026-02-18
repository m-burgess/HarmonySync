import React, { useState, useEffect, useRef } from 'react';
import { event } from '../../electron-adapter';
import './LyricsColumn.css';

/**
 * Interface for component props
 */
interface LyricsColumnProps {
  lyrics: string | null;
  onSelectionChange?: (data: SelectionChangeData) => void;
}

/**
 * Interface for parsed line objects
 */
interface ParsedLine {
  type: 'section' | 'lyric';
  text: string;
  originalIndex: number;
  section?: string; // Only present for lyric type
}

/**
 * Interface for selection change callback data
 */
interface SelectionChangeData {
  lines: string[];
  section: string;
  index: number;
}



/**
 * LyricsColumn Component
 * 
 * Displays the entire song lyrics in a scrollable column.
 * Users can click to select 2 lines at a time, which are then displayed to the audience.
 * Features:
 * - Click to select 2 consecutive lines
 * - Hover effect on 2-line pairs
 * - Keyboard navigation (up/down arrows) to move selection
 * - Auto-scroll to keep selection visible
 * - Section labels clearly visible
 */
const LyricsColumn: React.FC<LyricsColumnProps> = ({ lyrics, onSelectionChange }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0); // Index of first line in 2-line selection
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Parse lyrics into an array of lines with section metadata
  const parsedLines = React.useMemo<ParsedLine[]>(() => {
    if (!lyrics) return [];

    const lines: ParsedLine[] = [];
    let currentSection = 'Intro';

    const rawLines = lyrics.split(/\r?\n/);

    rawLines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check for section marker
      const sectionMatch = trimmed.match(/^\[(.*)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        lines.push({
          type: 'section',
          text: currentSection,
          originalIndex: idx
        });
      } else if (trimmed.length > 0) {
        lines.push({
          type: 'lyric',
          text: trimmed,
          section: currentSection,
          originalIndex: idx
        });
      }
    });

    return lines;
  }, [lyrics]);

  // Get only lyric lines (not section headers) for selection
  // Type guard ensures that all lyric lines have a required 'section' property
  // (currentSection is always initialized to 'Intro', so section is never undefined for lyric lines)
  const lyricLines = parsedLines.filter((line): line is ParsedLine & { section: string } =>
    line.type === 'lyric' && line.section !== undefined
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = Math.min(prev + 2, Math.max(0, lyricLines.length - 2));
          return newIndex;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 2));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lyricLines.length]);

  // Emit selected lines to audience display
  useEffect(() => {
    if (lyricLines.length > 0 && selectedIndex < lyricLines.length) {
      const line1 = lyricLines[selectedIndex];
      const line2 = lyricLines[selectedIndex + 1];

      const selectedText = [
        line1?.text || '',
        line2?.text || ''
      ].filter(t => t.length > 0);

      // Emit to audience screen (simple string array)
      event.emit('display-lyrics', { lines: selectedText });

      // Emit to confidence monitor (simple object with current/next text)
      // Next lines logic
      const nextLines = selectedIndex + 2 < lyricLines.length
        ? [
          lyricLines[selectedIndex + 2]?.text || '',
          lyricLines[selectedIndex + 3]?.text || ''
        ].filter(t => t.length > 0)
        : [];

      event.emit('display-confidence-lyrics', {
        current: selectedText,
        next: nextLines,
        section: line1.section // Keeping section for confidence monitor context
      });

      // Also emit to lower thirds
      // Also emit to lower thirds
      const lowerThirdsText = selectedText.join('\n');
      event.emit('set-lower-thirds-text', {
        line1: '',
        line2: lowerThirdsText
      });

      // Notify parent component
      if (onSelectionChange) {
        onSelectionChange({
          lines: selectedText,
          section: line1.section,
          index: selectedIndex
        });
      }
    }
  }, [selectedIndex, lyricLines, onSelectionChange]);

  // Auto-scroll to keep selection visible
  useEffect(() => {
    if (selectedRef.current && columnRef.current) {
      const container = columnRef.current;
      const element = selectedRef.current;

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Check if element is out of view
      if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedIndex]);

  // Handle click on a 2-line pair
  const handleLineClick = (lyricIndex: number): void => {
    // Ensure we select pairs (round down to even number)
    const pairIndex = Math.floor(lyricIndex / 2) * 2;
    setSelectedIndex(pairIndex);
  };

  // Handle hover on a 2-line pair
  const handleLineHover = (lyricIndex: number): void => {
    const pairIndex = Math.floor(lyricIndex / 2) * 2;
    setHoveredIndex(pairIndex);
  };

  if (!lyrics || parsedLines.length === 0) {
    return (
      <div className="lyrics-column-empty">
        <p>No lyrics loaded</p>
        <p className="lyrics-column-hint">Select a song with lyrics to begin</p>
      </div>
    );
  }

  // Track lyric line index for selection
  let lyricLineIndex = 0;

  return (
    <div className="lyrics-column" ref={columnRef}>
      <div className="lyrics-column-header">
        <h3>Song Lyrics</h3>
        <p className="lyrics-column-instructions">
          Click or use ↑↓ arrows to select 2 lines
        </p>
      </div>

      <div className="lyrics-column-content">
        {parsedLines.map((line, idx) => {
          if (line.type === 'section') {
            return (
              <div key={`section-${idx}`} className="lyrics-section-label">
                [{line.text}]
              </div>
            );
          }

          // This is a lyric line
          const currentLyricIndex = lyricLineIndex;
          lyricLineIndex++;

          // Determine if this line is part of a selected or hovered pair
          const isInSelectedPair =
            currentLyricIndex === selectedIndex ||
            currentLyricIndex === selectedIndex + 1;

          const isInHoveredPair =
            hoveredIndex !== null && (
              currentLyricIndex === hoveredIndex ||
              currentLyricIndex === hoveredIndex + 1
            );

          const isFirstInPair = currentLyricIndex % 2 === 0;

          const lineClasses = [
            'lyrics-line',
            isInSelectedPair && 'lyrics-line-selected',
            isInHoveredPair && !isInSelectedPair && 'lyrics-line-hovered',
            isFirstInPair && 'lyrics-line-pair-start'
          ].filter(Boolean).join(' ');

          return (
            <div
              key={`lyric-${idx}`}
              className={lineClasses}
              onClick={() => handleLineClick(currentLyricIndex)}
              onMouseEnter={() => handleLineHover(currentLyricIndex)}
              onMouseLeave={() => setHoveredIndex(null)}
              ref={isInSelectedPair && currentLyricIndex === selectedIndex ? selectedRef : null}
            >
              {line.text}
            </div>
          );
        })}
      </div>

      <div className="lyrics-column-footer">
        <span className="lyrics-column-counter">
          Showing lines {selectedIndex + 1}-{Math.min(selectedIndex + 2, lyricLines.length)} of {lyricLines.length}
        </span>
      </div>
    </div>
  );
};

export default LyricsColumn;
