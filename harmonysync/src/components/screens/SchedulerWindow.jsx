import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CalendarIcon } from '@heroicons/react/24/solid';
import { core } from '../../electron-adapter';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import AddEventModal from '../modals/AddEventModal.tsx';
import commonMacros from '../../data/common_macros.json';

const SchedulerWindow = () => {
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load scheduled events from JSON storage
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const events = await core.invoke('scheduler:getAllEvents');
        setScheduledEvents(events || []);
      } catch (error) {
        console.error('Failed to load scheduled events:', error);
        setScheduledEvents([]);
      }
    };
    
    loadEvents();
  }, []);

  // Save scheduled events to JSON storage
  const saveEvents = async (events) => {
    setScheduledEvents(events);
    // Note: Individual operations (create/update/delete) handle persistence
  };

  const handleAddEvent = async (eventData) => {
    try {
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

  const deleteEvent = async (eventId) => {
    try {
      await core.invoke('scheduler:delete', eventId);
      const updatedEvents = scheduledEvents.filter(e => e.id !== eventId);
      setScheduledEvents(updatedEvents);
    } catch (error) {
      console.error('Failed to delete scheduled event:', error);
      alert('Failed to delete scheduled event. Please try again.');
    }
  };

  const toggleEventEnabled = async (eventId) => {
    try {
      const event = scheduledEvents.find(e => e.id === eventId);
      if (!event) return;
      
      const updatedEvent = { ...event, enabled: !event.enabled };
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

  return (
    <div className="h-screen w-screen vscode-ui-font bg-gray-900 text-gray-300 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <h2 className="text-xl font-semibold text-white">Scheduler</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-900">
        {/* Add Event Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Scheduled Events</h3>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Event</span>
          </Button>
        </div>

        {/* Scheduled Events List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 shadow-lg">
          {scheduledEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-2">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              </div>
              <p className="text-gray-400 text-lg mb-2">No scheduled events yet</p>
              <p className="text-gray-500 text-sm">Click "Add Event" to create your first scheduled macro</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledEvents.map(event => (
                <div
                  key={event.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                    event.enabled 
                      ? 'bg-gray-700 border-gray-600 hover:bg-gray-650 hover:border-gray-500' 
                      : 'bg-gray-800 border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={event.enabled}
                      onChange={() => toggleEventEnabled(event.id)}
                      className="w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500 focus:ring-2 transition-colors"
                      title={event.enabled ? 'Disable event' : 'Enable event'}
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium text-base mb-1">{event.name}</div>
                      <div className="text-sm text-gray-400 flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                          ⚡ Macro
                        </span>
                        <span>•</span>
                        <span>{formatRecurrence(event)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="text-red-400 hover:text-red-300 transition-colors p-2 rounded hover:bg-red-900 hover:bg-opacity-20"
                    title="Delete event"
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
