/**
 * Timer Modal Component
 * 
 * Modal for creating and editing timers with:
 * - Timer name input
 * - Duration input (hh:mm format)
 * - Display device selection with checkboxes
 */

import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import Modal from '../ui/Modal';
import { VSCodeButton, VSCodeInput } from '../VSCodeUI';
import type { Timer, Display } from '../../types';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (timer: Omit<Timer, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  timer?: Timer | null;
  displays: Display[];
  title?: string;
}

export const TimerModal: React.FC<TimerModalProps> = observer(({
  isOpen,
  onClose,
  onSave,
  timer,
  displays,
  title = 'Create Timer'
}) => {
  const [name, setName] = useState('');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('5');
  const [selectedDisplays, setSelectedDisplays] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or timer changes
  useEffect(() => {
    if (isOpen) {
      if (timer) {
        setName(timer.name);
        const totalMinutes = timer.durationMinutes;
        setHours(Math.floor(totalMinutes / 60).toString());
        setMinutes((totalMinutes % 60).toString());
        setSelectedDisplays(timer.targetDisplays || []);
      } else {
        setName('');
        setHours('0');
        setMinutes('5');
        setSelectedDisplays([]);
      }
      setError(null);
    }
  }, [isOpen, timer]);

  const handleDisplayToggle = (displayId: string) => {
    setSelectedDisplays(prev => 
      prev.includes(displayId) 
        ? prev.filter(id => id !== displayId)
        : [...prev, displayId]
    );
  };

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Timer name is required';
    }

    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;

    if (h < 0 || m < 0) {
      return 'Duration cannot be negative';
    }

    if (h === 0 && m === 0) {
      return 'Duration must be greater than 0';
    }

    if (h > 23 || m > 59) {
      return 'Invalid time format';
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const totalMinutes = h * 60 + m;

    const timerData = {
      name: name.trim(),
      durationMinutes: totalMinutes,
      targetDisplays: selectedDisplays,
    };

    const success = await onSave(timerData);
    setIsSaving(false);

    if (success) {
      onClose();
    } else {
      setError('Failed to save timer. Please try again.');
    }
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value === '' || parseInt(value) <= 23) {
      setHours(value);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value === '' || parseInt(value) <= 59) {
      setMinutes(value);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="medium"
      closeOnOverlayClick={false}
    >
      <div className="space-y-4 p-4">
        {/* Timer Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Timer Name
          </label>
          <VSCodeInput
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Sermon Timer"
            className="w-full"
            disabled={isSaving}
          />
        </div>

        {/* Duration Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Duration
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <VSCodeInput
                type="text"
                value={hours}
                onChange={handleHoursChange}
                placeholder="0"
                className="w-16 text-center"
                disabled={isSaving}
                maxLength={2}
              />
              <span className="text-gray-400">hours</span>
            </div>
            <span className="text-gray-400">:</span>
            <div className="flex items-center space-x-1">
              <VSCodeInput
                type="text"
                value={minutes}
                onChange={handleMinutesChange}
                placeholder="0"
                className="w-16 text-center"
                disabled={isSaving}
                maxLength={2}
              />
              <span className="text-gray-400">minutes</span>
            </div>
          </div>
        </div>

        {/* Display Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Show timer on displays
          </label>
          {displays.length === 0 ? (
            <p className="text-sm text-gray-500">No displays available</p>
          ) : (
            <div className="space-y-2">
              {displays.map((display) => (
                <label
                  key={display.id}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700/50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedDisplays.includes(display.id)}
                    onChange={() => handleDisplayToggle(display.id)}
                    disabled={isSaving}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">
                    {display.name} {display.isPrimary && '(Primary)'}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
          <VSCodeButton
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </VSCodeButton>
          <VSCodeButton
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : timer ? 'Update Timer' : 'Create Timer'}
          </VSCodeButton>
        </div>
      </div>
    </Modal>
  );
});

export default TimerModal;
