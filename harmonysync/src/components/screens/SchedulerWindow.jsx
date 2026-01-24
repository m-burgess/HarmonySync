import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import { core } from '../../electron-adapter';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import AddEventModal from '../modals/AddEventModal.jsx';
import commonMacros from '../../data/common_macros.json';

const SchedulerWindow = () => {
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load scheduled events from localStorage
  useEffect(() => {
    const savedEvents = localStorage.getItem('scheduled_events');
    if (savedEvents) {
      setScheduledEvents(JSON.parse(savedEvents));
    }
  }, []);

  // Save scheduled events to localStorage
  const saveEvents = (events) => {
    localStorage.setItem('scheduled_events', JSON.stringify(events));
    setScheduledEvents(events);
  };

  const handleAddEvent = (eventData) => {
    // Get macro or script name
    let actionName = '';
    if (eventData.actionType === 'macro') {
      const macro = commonMacros.find(m => m.id === eventData.macroId);
      actionName = macro ? macro.name : 'Unknown Macro';
    } else if (eventData.actionType === 'script') {
      actionName = 'Custom Script';
    }

    const newEvent = {
      id: Date.now(),
      name: eventData.name,
      date: eventData.date,
      time: eventData.time,
      recurrenceType: eventData.recurrenceType,
      actionType: eventData.actionType,
      macroId: eventData.macroId,
      scriptId: eventData.scriptId,
      actionName: actionName,
      enabled: true
    };

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
    const checkSchedule = () => {
      const now = new Date();

      scheduledEvents.forEach(event => {
        if (!event.enabled) return;

        if (shouldEventExecute(event, now)) {
          if (event.actionType === 'macro' && event.macroId) {
            executeMacro(event.macroId);
          } else if (event.actionType === 'script' && event.scriptId) {
            executeScript(event.scriptId);
          }
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkSchedule, 60000);
    checkSchedule(); // Check immediately

    return () => clearInterval(interval);
  }, [scheduledEvents]);

  // Check if event should execute at current time
  const shouldEventExecute = (event, now) => {
    const eventDate = new Date(event.date + 'T' + event.time);
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check if time matches
    if (event.time !== currentTime) return false;

    switch (event.recurrenceType) {
      case 'one-time':
        // Execute only if date matches exactly
        const eventDateOnly = event.date;
        const nowDateOnly = now.toISOString().split('T')[0];
        return eventDateOnly === nowDateOnly;

      case 'daily':
        // Execute every day at the specified time
        return true;

      case 'weekly':
        // Execute if the day of week matches
        const eventDay = new Date(event.date).getDay();
        const currentDay = now.getDay();
        return eventDay === currentDay;

      case 'monthly':
        // Execute if the day of month matches
        const eventDayOfMonth = new Date(event.date).getDate();
        const currentDayOfMonth = now.getDate();
        return eventDayOfMonth === currentDayOfMonth;

      default:
        return false;
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

  const executeScript = async (scriptId) => {
    console.log(`Executing scheduled script: ${scriptId}`);
    
    try {
      await core.invoke('script:execute', scriptId, {});
      console.log(`Successfully executed script: ${scriptId}`);
    } catch (error) {
      console.error(`Failed to execute script ${scriptId}:`, error);
    }
  };

  // Format recurrence type for display
  const formatRecurrence = (event) => {
    const eventDate = new Date(event.date);
    const dateStr = eventDate.toLocaleDateString();
    
    switch (event.recurrenceType) {
      case 'one-time':
        return `Once on ${dateStr}`;
      case 'daily':
        return `Daily at ${event.time}`;
      case 'weekly':
        const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
        return `Every ${dayName} at ${event.time}`;
      case 'monthly':
        const dayOfMonth = eventDate.getDate();
        return `Monthly on day ${dayOfMonth} at ${event.time}`;
      default:
        return dateStr;
    }
  };

  const handleClose = async () => {
    // TODO: Implement window closing for Electron
    // In Electron, window.close() is handled differently
    console.warn('Window close needs to be implemented for Electron');
    window.close(); // Use browser window.close() for now
  };

  return (
    <div className="h-screen w-screen bg-gray-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white">Scheduler</h2>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Add Event Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Scheduled Events</h3>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Event</span>
          </Button>
        </div>

        {/* Scheduled Events List */}
        <div className="bg-gray-700 rounded-lg p-4">
          {scheduledEvents.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No scheduled events. Click "Add Event" to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {scheduledEvents.map(event => (
                <div
                  key={event.id}
                  className={`flex items-center justify-between p-3 rounded ${
                    event.enabled ? 'bg-gray-600' : 'bg-gray-700 opacity-50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={event.enabled}
                      onChange={() => toggleEventEnabled(event.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-white font-medium">{event.name}</div>
                      <div className="text-sm text-gray-400">
                        {event.actionName} • {formatRecurrence(event)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddEvent}
      />
    </div>
  );
};

export default SchedulerWindow;
