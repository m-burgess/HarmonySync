import React, { useState, useEffect, ChangeEvent } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { core } from '../../electron-adapter';
import commonMacros from '../../data/common_macros.json';
import '../../styles/components/SettingsModal.css';

// Type definitions
interface Script {
  id: string;
  name: string;
  language?: string;
  content?: string;
}

interface Macro {
  id: string;
  name: string;
  action: string;
  midiNote?: number;
  noteName?: string;
  description?: string;
}

type RecurrenceType = 'one-time' | 'daily' | 'weekly' | 'monthly';
type ActionType = 'macro' | 'script';

interface EventData {
  name: string;
  date: string;
  time: string;
  recurrenceType: RecurrenceType;
  actionType: ActionType;
  macroId: string | null;
  scriptId: string | null;
}

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: EventData) => void;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isOpen, onClose, onSave }) => {
  const [eventName, setEventName] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('16:30');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('one-time');
  const [actionType, setActionType] = useState<ActionType>('macro');
  const [selectedMacro, setSelectedMacro] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);

  // Type the imported JSON as an array of Macros
  const typedCommonMacros = commonMacros as Macro[];

  // Initialize with today's date
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      setSelectedDate(dateStr);
    }
  }, [isOpen]);

  // Load scripts when modal opens
  useEffect(() => {
    const loadScripts = async () => {
      try {
        const allScripts = await core.invoke('script:getAll') as Script[];
        setScripts(allScripts);
      } catch (error) {
        console.error('Failed to load scripts:', error);
        setScripts([]);
      }
    };
    
    if (isOpen) {
      loadScripts();
    }
  }, [isOpen]);

  const handleSave = () => {
    // Validation
    if (!eventName.trim()) {
      alert('Please enter an event name');
      return;
    }

    if (!selectedDate) {
      alert('Please select a date');
      return;
    }

    if (actionType === 'macro' && !selectedMacro) {
      alert('Please select a macro');
      return;
    }

    if (actionType === 'script' && !selectedScript) {
      alert('Please select a script');
      return;
    }

    // Prepare event data
    const eventData: EventData = {
      name: eventName.trim(),
      date: selectedDate,
      time: selectedTime,
      recurrenceType,
      actionType,
      macroId: actionType === 'macro' ? selectedMacro : null,
      scriptId: actionType === 'script' ? selectedScript : null
    };

    onSave(eventData);
    handleClose();
  };

  const handleClose = () => {
    // Reset form
    setEventName('');
    setSelectedDate('');
    setSelectedTime('16:30');
    setRecurrenceType('one-time');
    setActionType('macro');
    setSelectedMacro(null);
    setSelectedScript(null);
    onClose();
  };

  const handleEventNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEventName(e.target.value);
  };

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedTime(e.target.value);
  };

  const handleRecurrenceChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRecurrenceType(e.target.value as RecurrenceType);
  };

  const handleActionTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setActionType(e.target.value as ActionType);
    setSelectedMacro(null);
    setSelectedScript(null);
  };

  const handleMacroChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedMacro(e.target.value || null);
  };

  const handleScriptChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedScript(e.target.value || null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Scheduled Event"
      size="medium"
      closeOnOverlayClick={false}
      closeOnEscape={true}
    >
      <div className="settings-sections">
        <div className="settings-section">
          {/* Event Name */}
          <div className="setting-row">
            <label>Event Name</label>
            <input
              type="text"
              value={eventName}
              onChange={handleEventNameChange}
              placeholder="Enter event name"
              autoFocus
            />
          </div>

          {/* Date Picker */}
          <div className="setting-row">
            <label>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>

          {/* Time Picker */}
          <div className="setting-row">
            <label>Time</label>
            <input
              type="time"
              value={selectedTime}
              onChange={handleTimeChange}
            />
          </div>

          {/* Recurrence Type */}
          <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <label style={{ marginBottom: '8px' }}>Recurrence</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="checkbox-label">
                <input
                  type="radio"
                  name="recurrence"
                  value="one-time"
                  checked={recurrenceType === 'one-time'}
                  onChange={handleRecurrenceChange}
                />
                One Time
              </label>
              <label className="checkbox-label">
                <input
                  type="radio"
                  name="recurrence"
                  value="daily"
                  checked={recurrenceType === 'daily'}
                  onChange={handleRecurrenceChange}
                />
                Repeat Daily
              </label>
              <label className="checkbox-label">
                <input
                  type="radio"
                  name="recurrence"
                  value="weekly"
                  checked={recurrenceType === 'weekly'}
                  onChange={handleRecurrenceChange}
                />
                Repeat Weekly
              </label>
              <label className="checkbox-label">
                <input
                  type="radio"
                  name="recurrence"
                  value="monthly"
                  checked={recurrenceType === 'monthly'}
                  onChange={handleRecurrenceChange}
                />
                Repeat Monthly
              </label>
            </div>
          </div>

          {/* Action Type */}
          <div className="setting-row">
            <label>Action Type</label>
            <select
              value={actionType}
              onChange={handleActionTypeChange}
            >
              <option value="macro">Macro</option>
              <option value="script">Custom Script</option>
            </select>
          </div>

          {/* Macro Selection */}
          {actionType === 'macro' && (
            <div className="setting-row">
              <label>Select Macro</label>
              <select
                value={selectedMacro || ''}
                onChange={handleMacroChange}
              >
                <option value="">-- Select a macro --</option>
                <optgroup label="Pre-service Music">
                  {typedCommonMacros
                    .filter(m => m.action.includes('preservice'))
                    .map(macro => (
                      <option key={macro.id} value={macro.id}>
                        {macro.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="MIDI Notes">
                  {typedCommonMacros
                    .filter(m => m.action === 'send_midi_note')
                    .map(macro => (
                      <option key={macro.id} value={macro.id}>
                        {macro.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* Script Selection */}
          {actionType === 'script' && (
            <div className="setting-row">
              <label>Select Script</label>
              <select
                value={selectedScript || ''}
                onChange={handleScriptChange}
              >
                <option value="">-- Select a script --</option>
                {scripts.map(script => (
                  <option key={script.id} value={script.id}>
                    {script.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Footer with action buttons */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Add Event
        </Button>
      </div>
    </Modal>
  );
};

export default AddEventModal;
