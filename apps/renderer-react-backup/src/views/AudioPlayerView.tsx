/**
 * AudioPlayerView - Example MVVM View Component
 * 
 * This is a simple example showing how to build a View component using MVVM.
 * 
 * Key principles demonstrated:
 * 1. Component wrapped with observer() to react to ViewModel changes
 * 2. ViewModel accessed via getViewModel() from DI container
 * 3. Component reads from ViewModel observables
 * 4. Component calls ViewModel actions (no business logic here)
 * 5. Pure presentation - all business logic in ViewModel
 * 6. No direct IPC calls
 * 7. Simple and testable
 */
import React, { type ChangeEvent } from 'react';
import { observer } from 'mobx-react-lite';
import { getViewModel } from '../viewmodels';
import type { IAudioViewModel } from '../types/viewmodels';

const AudioPlayerView: React.FC = observer(() => {
  const audioVM = getViewModel('audioViewModel') as IAudioViewModel;

  return (
    <div className="audio-player-view">
      <h2>Audio Player (MVVM Example)</h2>

      {/* Loading indicator */}
      {audioVM.isLoading && <div className="loading">Loading...</div>}

      {/* Error display */}
      {audioVM.error && (
        <div className="error" style={{ color: 'red' }}>
          Error: {audioVM.error}
        </div>
      )}

      {/* Playback controls */}
      <div className="playback-controls">
        <button
          onClick={() => audioVM.play()}
          disabled={audioVM.isPlaying || !audioVM.hasTracksLoaded}
        >
          Play
        </button>
        <button
          onClick={() => audioVM.pause()}
          disabled={!audioVM.isPlaying}
        >
          Pause
        </button>
        <button
          onClick={() => audioVM.stop()}
          disabled={!audioVM.isPlaying && !audioVM.isPaused}
        >
          Stop
        </button>
      </div>

      {/* Position display */}
      {audioVM.hasTracksLoaded && (
        <div className="position-display">
          <div>{audioVM.formattedPosition} / {audioVM.formattedDuration}</div>
          <div className="progress-bar">
            <div
              className="progress"
              style={{ width: `${audioVM.progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Track list */}
      {audioVM.hasTracksLoaded && (
        <div className="track-list">
          <h3>Tracks ({audioVM.tracks.length})</h3>
          {audioVM.tracks.map((track, index) => (
            <div key={index} className="track-control">
              <span className="track-name">{track.name}</span>
              
              {/* Volume control */}
              <label>
                Volume:
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => audioVM.setTrackVolume(index, parseFloat(e.target.value))}
                />
                <span>{Math.round(track.volume * 100)}%</span>
              </label>

              {/* Pan control */}
              <div className="pan-buttons">
                <button
                  className={track.pan === -1 ? 'active' : ''}
                  onClick={() => audioVM.setTrackPan(index, -1)}
                >
                  L
                </button>
                <button
                  className={track.pan === 0 ? 'active' : ''}
                  onClick={() => audioVM.setTrackPan(index, 0)}
                >
                  C
                </button>
                <button
                  className={track.pan === 1 ? 'active' : ''}
                  onClick={() => audioVM.setTrackPan(index, 1)}
                >
                  R
                </button>
              </div>

              {/* Mute button */}
              <button
                className={track.muted ? 'muted' : ''}
                onClick={() => audioVM.toggleTrackMute(index)}
              >
                {track.muted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Load tracks button (for testing) */}
      {!audioVM.hasTracksLoaded && (
        <div className="load-section">
          <button onClick={() => {
            // In real app, would open folder picker via FileService
            // For now, just demonstrates the pattern
            console.log('Load tracks clicked - would call audioVM.loadTracks(path)');
          }}>
            Load Tracks
          </button>
        </div>
      )}
    </div>
  );
});

export default AudioPlayerView;
