/**
 * Timer Panel Component
 * 
 * Panel that displays the list of timers with controls:
 * - List of all timers
 * - Timer controls (start, pause, stop, reset, delete)
 * - Create timer button
 * - Edit timer button
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  ArrowPathIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { VSCodeButton } from '../VSCodeUI';
import type { Timer } from '../../types';

interface TimerPanelProps {
  timers: Timer[];
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onStop: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (timer: Timer) => void;
  onCreate: () => void;
}

export const TimerPanel: React.FC<TimerPanelProps> = observer(({
  timers,
  onStart,
  onPause,
  onStop,
  onReset,
  onDelete,
  onEdit,
  onCreate
}) => {
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: Timer['status']): string => {
    switch (status) {
      case 'running':
        return 'text-green-400';
      case 'paused':
        return 'text-yellow-400';
      case 'stopped':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-200">Timers</h2>
          <VSCodeButton
            variant="primary"
            onClick={onCreate}
            icon={<PlusIcon className="w-4 h-4" />}
            title="Create new timer"
          >
            New Timer
          </VSCodeButton>
        </div>
      </div>

      {/* Timer List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {timers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No timers yet</p>
            <p className="text-sm mt-2">Click "New Timer" to create one</p>
          </div>
        ) : (
          timers.map((timer) => (
            <div
              key={timer.id}
              className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              {/* Timer Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-200 mb-1">
                    {timer.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {Math.floor(timer.durationMinutes / 60)}h {timer.durationMinutes % 60}m
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <VSCodeButton
                    variant="icon"
                    onClick={() => onEdit(timer)}
                    title="Edit timer"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </VSCodeButton>
                  <VSCodeButton
                    variant="icon"
                    onClick={() => {
                      if (confirm(`Delete timer "${timer.name}"?`)) {
                        onDelete(timer.id);
                      }
                    }}
                    title="Delete timer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </VSCodeButton>
                </div>
              </div>

              {/* Timer Display */}
              <div className="mb-3">
                <div className="text-3xl font-mono text-center py-2">
                  <span className={getStatusColor(timer.status)}>
                    {formatTime(timer.remainingMs || timer.durationMinutes * 60 * 1000)}
                  </span>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center justify-center space-x-2">
                {timer.status === 'running' ? (
                  <VSCodeButton
                    variant="secondary"
                    onClick={() => onPause(timer.id)}
                    icon={<PauseIcon className="w-4 h-4" />}
                    title="Pause timer"
                  >
                    Pause
                  </VSCodeButton>
                ) : (
                  <VSCodeButton
                    variant="primary"
                    onClick={() => onStart(timer.id)}
                    icon={<PlayIcon className="w-4 h-4" />}
                    title="Start timer"
                  >
                    Start
                  </VSCodeButton>
                )}
                
                <VSCodeButton
                  variant="secondary"
                  onClick={() => onStop(timer.id)}
                  icon={<StopIcon className="w-4 h-4" />}
                  title="Stop timer"
                  disabled={timer.status === 'stopped'}
                >
                  Stop
                </VSCodeButton>

                <VSCodeButton
                  variant="secondary"
                  onClick={() => onReset(timer.id)}
                  icon={<ArrowPathIcon className="w-4 h-4" />}
                  title="Reset timer"
                >
                  Reset
                </VSCodeButton>
              </div>

              {/* Display Info */}
              {timer.targetDisplays && timer.targetDisplays.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    Displays: {timer.targetDisplays.length} selected
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default TimerPanel;
