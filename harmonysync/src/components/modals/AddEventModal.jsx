import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { core } from '../../electron-adapter';
import commonMacros from '../../data/common_macros.json';
import '../../styles/components/SettingsModal.css';

const AddEventModal = ({ isOpen, onClose, onSave }) => {
  const [eventName, setEventName] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('16:30');
  const [recurrenceType, setRecurrenceType] = useState('one-time');
  const [actionType, setActionType] = useState('macro');
  const [selectedMacro, setSelectedMacro] = useState('');
  const [selectedScript, setSelectedScript] = useState('');
  const [scripts, setScripts] = useState([]);

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
        const allScripts = await core.invoke('script:getAll');
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
    const eventData = {
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
    setSelectedMacro('');
    setSelectedScript('');
    onClose();
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
              onChange={(e) => setEventName(e.target.value)}
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
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Time Picker */}
          <div className="setting-row">
            <label>Time</label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
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
                  onChange={(e) => setRecurrenceType(e.target.value)}
                />
                One Time
              </label>
              <label className="checkbox-label">
                <input
                  type="radio"
                  name="recurrence"
                  value="daily"
                  checked={recurrenceType === 'daily'}
                  onChange={(e) => setRecurrenceType(e.target.value)}
                />
                Repeat Daily
              </label>
              <label className="checkbox-label">
                <input
                  type="radio"
                  name="recurrence"
                  value="weekly"
                  checked={recurrenceType === 'weekly'}
                  onChange={(e) => setRecurrenceType(e.target.value)}
                />
                Repeat Weekly
              </label>
              <label className="checkbox-label">
                <input
                  type="radio"
                  name="recurrence"
                  value="monthly"
                  checked={recurrenceType === 'monthly'}
                  onChange={(e) => setRecurrenceType(e.target.value)}
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
              onChange={(e) => {
                setActionType(e.target.value);
                setSelectedMacro('');
                setSelectedScript('');
              }}
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
                value={selectedMacro}
                onChange={(e) => setSelectedMacro(e.target.value)}
              >
                <option value="">-- Select a macro --</option>
                <optgroup label="Pre-service Music">
                  {commonMacros
                    .filter(m => m.action.includes('preservice'))
                    .map(macro => (
                      <option key={macro.id} value={macro.id}>
                        {macro.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="MIDI Notes">
                  {commonMacros
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
                value={selectedScript}
                onChange={(e) => setSelectedScript(e.target.value)}
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
