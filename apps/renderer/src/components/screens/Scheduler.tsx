import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import { core, preserviceWindow } from '../../electron-adapter';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import commonMacros from '../../data/common_macros.json';
import '../../styles/components/SettingsModal.css';

type RecurrenceType = 'one-time' | 'daily' | 'weekly' | 'monthly';

type ScheduledEvent = {
  id: number;
  name?: string;
  type?: string;
  macroId?: string;
  macroName?: string;
  day?: string;
  date?: string;
  time?: string;
  recurring?: boolean;
  enabled?: boolean;
  recurrenceType?: RecurrenceType;
  actionType?: 'macro' | 'script';
  scriptId?: string;
  [key: string]: unknown;
};

interface SchedulerProps {
  isOpen: boolean;
  onClose: () => void;
}

const Scheduler = ({ isOpen, onClose }: SchedulerProps) => {
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [selectedMacro, setSelectedMacro] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<'macro' | 'script'>('macro');
  const [selectedDay, setSelectedDay] = useState<string>('Saturday');
  const [selectedTime, setSelectedTime] = useState<string>('16:30');
  const [isRecurring, setIsRecurring] = useState<boolean>(true);

  const daysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  // Load scheduled events from JSON storage
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const events = (await core.invoke('scheduler:getAllEvents')) as ScheduledEvent[] | undefined;
        setScheduledEvents(events || []);
      } catch (error) {
        console.error('Failed to load scheduled events:', error);
        setScheduledEvents([]);
      }
    };
    
    if (isOpen) {
      loadEvents();
    }
  }, [isOpen]);

  // Save scheduled events to JSON storage
  // Local state persistence handled by individual operations

  const addScheduledEvent = async () => {
    if (!selectedMacro) {
      alert('Please select a macro');
      return;
    }

    try {
      const macro = commonMacros.find(m => m.id === selectedMacro);
      const newEvent: ScheduledEvent = {
        id: Date.now(),
        type: 'macro',
        macroId: selectedMacro,
        macroName: macro?.name,
        day: selectedDay,
        time: selectedTime,
        recurring: isRecurring,
        enabled: true
      };

      // Save to JSON storage
      await core.invoke('scheduler:create', newEvent);

      // Update local state
      const updatedEvents = [...scheduledEvents, newEvent];
      setScheduledEvents(updatedEvents);
    } catch (error) {
      console.error('Failed to create scheduled event:', error);
      alert('Failed to create scheduled event. Please try again.');
    }
  };

  const deleteEvent = async (eventId: number) => {
    try {
      await core.invoke('scheduler:delete', { id: eventId });
      const updatedEvents = scheduledEvents.filter(e => e.id !== eventId);
      setScheduledEvents(updatedEvents);
    } catch (error) {
      console.error('Failed to delete scheduled event:', error);
      alert('Failed to delete scheduled event. Please try again.');
    }
  };

  const toggleEventEnabled = async (eventId: number) => {
    try {
      const event = scheduledEvents.find(e => e.id === eventId);
      if (!event) return;
      
      const updatedEvent = { ...event, enabled: !event.enabled } as ScheduledEvent;
      await core.invoke('scheduler:update', updatedEvent);
      
      const updatedEvents = scheduledEvents.map(e =>
        e.id === eventId ? updatedEvent : e
      );
      setScheduledEvents(updatedEvents);
    } catch (error) {
      console.error('Failed to update scheduled event:', error);
      alert('Failed to update scheduled event. Please try again.');
    }
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
          executeMacro(event.macroId as string);
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkSchedule, 60000);
    checkSchedule(); // Check immediately

    return () => clearInterval(interval);
  }, [scheduledEvents, isOpen]);

  const executeMacro = async (macroId: string) => {
    const macro = commonMacros.find(m => m.id === macroId);
    if (!macro) return;

    console.log(`Executing scheduled macro: ${macro.name}`);
    
    try {
      // Handle preservice music macros locally to avoid unnecessary backend round-trips
      if (macro.action === 'start_preservice_music') {
        await preserviceWindow.open();
        console.log(`Opened preservice music window for macro: ${macro.name}`);
        return;
      }

      if (macro.action === 'stop_preservice_music') {
        await preserviceWindow.close();
        console.log(`Closed preservice music window for macro: ${macro.name}`);
        return;
      }
      // Handle preservice macros locally
      if (macro.action === 'start_preservice_music') {
        await preserviceWindow.open();
        return;
      }

      if (macro.action === 'stop_preservice_music') {
        await preserviceWindow.close();
        return;
      }

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
                setSelectedEventType(e.target.value as 'macro' | 'script');
                setSelectedMacro('');
              }}
            >
              <option value="macro">Macro</option>
            </select>
          </div>

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
                        {event.macroName}
                      </div>
                      <div className="scheduler-event-details">
                        ⚡ Macro • {event.recurring ? 'Every' : ''} {event.day} at {event.time}
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
                        title={`${event.macroName} at ${event.time}`}
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
