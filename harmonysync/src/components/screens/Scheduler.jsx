import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import { core } from '../../electron-adapter';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import commonMacros from '../../data/common_macros.json';
import '../../styles/components/SettingsModal.css';

const Scheduler = ({ isOpen, onClose }) => {
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [selectedMacro, setSelectedMacro] = useState('');
  const [selectedDay, setSelectedDay] = useState('Saturday');
  const [selectedTime, setSelectedTime] = useState('16:30');
  const [isRecurring, setIsRecurring] = useState(true);
  const [dmxScenes, setDmxScenes] = useState([]);
  const [selectedEventType, setSelectedEventType] = useState('macro');

  const daysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  // Load scheduled events from localStorage
  useEffect(() => {
    const savedEvents = localStorage.getItem('scheduled_events');
    if (savedEvents) {
      setScheduledEvents(JSON.parse(savedEvents));
    }
  }, []);

  // Load DMX scenes
  useEffect(() => {
    const loadDmxScenes = async () => {
      try {
        const scenes = await core.invoke('get_dmx_scenes');
        setDmxScenes(scenes);
      } catch (error) {
        console.error('Failed to load DMX scenes:', error);
      }
    };
    
    if (isOpen) {
      loadDmxScenes();
    }
  }, [isOpen]);

  // Save scheduled events to localStorage
  const saveEvents = (events) => {
    localStorage.setItem('scheduled_events', JSON.stringify(events));
    setScheduledEvents(events);
  };

  const addScheduledEvent = () => {
    if (selectedEventType === 'macro' && !selectedMacro) {
      alert('Please select a macro');
      return;
    }
    if (selectedEventType === 'dmx_scene' && !selectedMacro) {
      alert('Please select a DMX scene');
      return;
    }

    let newEvent;
    if (selectedEventType === 'macro') {
      const macro = commonMacros.find(m => m.id === selectedMacro);
      newEvent = {
        id: Date.now(),
        type: 'macro',
        macroId: selectedMacro,
        macroName: macro.name,
        day: selectedDay,
        time: selectedTime,
        recurring: isRecurring,
        enabled: true
      };
    } else {
      const scene = dmxScenes.find(s => s.id === selectedMacro);
      newEvent = {
        id: Date.now(),
        type: 'dmx_scene',
        sceneId: selectedMacro,
        sceneName: scene.name,
        day: selectedDay,
        time: selectedTime,
        recurring: isRecurring,
        enabled: true
      };
    }

    const updatedEvents = [...scheduledEvents, newEvent];
    saveEvents(updatedEvents);
  };

  const deleteEvent = (eventId) => {
    const updatedEvents = scheduledEvents.filter(e => e.id !== eventId);
    saveEvents(updatedEvents);
  };

  const toggleEventEnabled = (eventId) => {
    const updatedEvents = scheduledEvents.map(e =>
      e.id === eventId ? { ...e, enabled: !e.enabled } : e
    );
    saveEvents(updatedEvents);
  };

  // Check and execute scheduled events
  useEffect(() => {
    if (!isOpen) return;

    const checkSchedule = () => {
      const now = new Date();
      const currentDay = daysOfWeek[now.getDay()];
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      scheduledEvents.forEach(event => {
        if (event.enabled && event.day === currentDay && event.time === currentTime) {
          if (event.type === 'dmx_scene') {
            executeDmxScene(event.sceneId);
          } else {
            executeMacro(event.macroId);
          }
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkSchedule, 60000);
    checkSchedule(); // Check immediately

    return () => clearInterval(interval);
  }, [scheduledEvents, isOpen]);

  const executeDmxScene = async (sceneId) => {
    console.log(`Executing scheduled DMX scene: ${sceneId}`);
    
    try {
      await core.invoke('recall_dmx_scene', { sceneId });
      console.log(`Successfully recalled DMX scene: ${sceneId}`);
    } catch (error) {
      console.error(`Failed to recall DMX scene ${sceneId}:`, error);
    }
  };

  const executeMacro = async (macroId) => {
    const macro = commonMacros.find(m => m.id === macroId);
    if (!macro) return;

    console.log(`Executing scheduled macro: ${macro.name}`);
    
    try {
      // Call backend command to execute macro
      await core.invoke('execute_macro', {
        macroId: macro.id,
        macroAction: macro.action,
        midiNote: macro.midiNote
      });
      
      console.log(`Successfully executed macro: ${macro.name}`);
    } catch (error) {
      console.error(`Failed to execute macro ${macro.name}:`, error);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scheduler"
      size="large"
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      <div className="settings-sections">
        {/* Add New Event Section */}
        <div className="settings-section">
          <h3>Schedule New Event</h3>
          
          <div className="setting-row">
            <label>Event Type</label>
            <select
              value={selectedEventType}
              onChange={(e) => {
                setSelectedEventType(e.target.value);
                setSelectedMacro('');
              }}
            >
              <option value="macro">Macro</option>
              <option value="dmx_scene">DMX Scene</option>
            </select>
          </div>

          <div className="setting-row">
            <label>{selectedEventType === 'macro' ? 'Select Macro' : 'Select DMX Scene'}</label>
            <select
              value={selectedMacro}
              onChange={(e) => setSelectedMacro(e.target.value)}
            >
              <option value="">-- Select {selectedEventType === 'macro' ? 'a macro' : 'a DMX scene'} --</option>
              {selectedEventType === 'macro' ? (
                <>
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
                </>
              ) : (
                dmxScenes.map(scene => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="setting-row">
            <label>Day of Week</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            >
              {daysOfWeek.map(day => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-row">
            <label>Time</label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            />
          </div>

          <div className="setting-row">
            <label htmlFor="recurring-checkbox" className="checkbox-label">
              <input
                id="recurring-checkbox"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              Recurring weekly
            </label>
          </div>

          <div className="scheduler-add-button">
            <Button
              onClick={addScheduledEvent}
              variant="primary"
            >
              <PlusIcon className="w-5 h-5" style={{ display: 'inline-block', marginRight: '4px' }} />
              Add Scheduled Event
            </Button>
          </div>
        </div>

        {/* Scheduled Events List */}
        <div className="settings-section">
          <h3>Scheduled Events</h3>
          
          {scheduledEvents.length === 0 ? (
            <p className="settings-info-text" style={{ textAlign: 'center', padding: '32px 0' }}>
              No scheduled events. Add one above to get started.
            </p>
          ) : (
            <div className="scheduler-events-list">
              {scheduledEvents.map(event => (
                <div
                  key={event.id}
                  className={`scheduler-event-item ${event.enabled ? 'enabled' : 'disabled'}`}
                >
                  <div className="scheduler-event-content">
                    <input
                      type="checkbox"
                      checked={event.enabled}
                      onChange={() => toggleEventEnabled(event.id)}
                      className="scheduler-event-checkbox"
                    />
                    <div>
                      <div className="scheduler-event-name">
                        {event.type === 'dmx_scene' ? event.sceneName : event.macroName}
                      </div>
                      <div className="scheduler-event-details">
                        {event.type === 'dmx_scene' ? '💡 DMX Scene' : '⚡ Macro'} • {event.recurring ? 'Every' : ''} {event.day} at {event.time}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="scheduler-event-delete"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar View */}
        <div className="settings-section">
          <h3>Weekly Overview</h3>
          <div className="scheduler-calendar">
            {daysOfWeek.map(day => {
              const dayEvents = scheduledEvents.filter(e => e.day === day && e.enabled);
              return (
                <div key={day} className="scheduler-calendar-day">
                  <div className="scheduler-calendar-day-header">
                    {day.substring(0, 3)}
                  </div>
                  <div className="scheduler-calendar-day-events">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        className="scheduler-calendar-event"
                        title={`${event.type === 'dmx_scene' ? event.sceneName : event.macroName} at ${event.time}`}
                      >
                        {event.time}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default Scheduler;
