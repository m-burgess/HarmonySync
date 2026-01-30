# TypeScript Automation Services - Quick Reference

## 🎯 Usage Examples

### Scheduler Service

```typescript
import { getSchedulerService, ScheduledEvent } from './services/scheduler-service';

const scheduler = getSchedulerService();
await scheduler.initialize();

// Validate an event
const event: ScheduledEvent = {
  event_time: '2024-01-27T14:30:00Z',
  event_type: 'macro',
  target_id: 'macro-123'
};

const validation = scheduler.validateScheduledEvent(event);
if (validation.valid) {
  await scheduler.createEvent(event);
}

// Get upcoming events
const upcoming = await scheduler.getUpcoming(60); // next 60 minutes

// Check if event should execute
if (scheduler.shouldExecuteNow(event)) {
  // Execute event
}
```

### Event Trigger Service

```typescript
import { getEventTriggerService, EventType } from './services/event-trigger-service';

const eventService = getEventTriggerService();
await eventService.initialize();

// Register a trigger
const trigger = await eventService.registerTrigger(
  EventType.SLIDE_CHANGE,
  'my-script-id',
  {
    enabled: true,
    priority: 10,
    condition: 'eventData.slideId === "important-slide"'
  }
);

// Emit an event (triggers all registered scripts)
await eventService.emitTrigger('slideChange', {
  slideId: '123',
  timestamp: Date.now()
});

// Test a trigger
const result = await eventService.testTrigger(trigger.id, {
  slideId: 'test-slide'
});

// Get all triggers
const allTriggers = await eventService.getAllTriggers();

// Disable a trigger
await eventService.disableTrigger(trigger.id);
```

### Macro Service

```typescript
import { getMacroService, MacroAction } from './services/macro-service';

const macroService = getMacroService();
await macroService.initialize();

// Set app handle for execution
macroService.setAppHandle(app);

// Execute a macro
await macroService.executeMacroAction(
  'macro-1',
  'send_midi_note',
  {
    midiNote: 60,
    velocity: 100,
    duration: 500
  }
);

// Validate a macro
const macro = {
  name: 'Start Music',
  action: 'start_preservice_music' as MacroAction
};

const validation = macroService.validateMacro(macro);
if (validation.valid) {
  await macroService.create(macro);
}

// Other actions
await macroService.executeMacroAction('macro-2', 'display_black_screen');
await macroService.executeMacroAction('macro-3', 'clear_displays');
```

### Script Service

```typescript
import { getScriptService, ScriptData } from './services/script-service';

const scriptService = getScriptService();
await scriptService.initialize();

// Create a new script
const scriptData: ScriptData = {
  name: 'Hello World',
  description: 'A simple test script',
  author: 'John Doe',
  code: `
    console.log('Hello from script!');
    return { success: true, message: 'Script executed' };
  `
};

const scriptId = await scriptService.save(scriptData);

// Execute a script
const result = await scriptService.execute(
  scriptId,
  { /* harmony API */ },
  {
    timeout: 5000,
    debug: true
  }
);

if (result.success) {
  console.log('Result:', result.result);
  console.log('Execution time:', result.executionTime, 'ms');
  if (result.consoleOutput) {
    result.consoleOutput.forEach(output => {
      console.log(`[${output.type}]`, output.message);
    });
  }
} else {
  console.error('Error:', result.error?.message);
}

// List all scripts
const scripts = await scriptService.list();

// Get a single script
const script = await scriptService.getScript(scriptId);

// Update a script
await scriptService.updateScript(scriptId, {
  code: 'console.log("Updated!");',
  enabled: false
});

// Delete a script
await scriptService.delete(scriptId);

// Import/Export
await scriptService.exportScript(scriptId, '/path/to/export.js');
const imported = await scriptService.importScript('/path/to/import.js');
```

## 🔧 Type Definitions

### Scheduler Service Types

```typescript
type EventType = 'macro' | 'presentation' | 'media' | 'custom';

interface ScheduledEvent {
  id?: string;
  event_time: string;
  event_type: EventType;
  target_id: string;
  formatted_time?: string;
  formatted_date?: string;
  is_past?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### Event Trigger Service Types

```typescript
enum EventType {
  SLIDE_CHANGE = 'slideChange',
  VIDEO_START = 'videoStart',
  AUDIO_START = 'audioStart',
  // ... 15 total event types
}

interface Trigger {
  id: string;
  eventType: string;
  scriptId: string;
  scriptName: string;
  enabled: boolean;
  priority: number;
  condition: string | null;
  createdAt: string;
  lastExecuted: string | null;
  executionCount: number;
}

interface TriggerOptions {
  enabled?: boolean;
  priority?: number;
  condition?: string;
}

interface ExecutionResult {
  triggerId: string;
  scriptId: string;
  success: boolean;
  result?: any;
  error?: string;
}
```

### Macro Service Types

```typescript
type MacroAction = 
  | 'start_preservice_music'
  | 'stop_preservice_music'
  | 'send_midi_note'
  | 'display_black_screen'
  | 'clear_displays';

interface Macro {
  id?: string;
  name: string;
  action: MacroAction;
  options?: MacroOptions;
}

interface MacroOptions {
  midiNote?: number;
  velocity?: number;
  duration?: number;
}
```

### Script Service Types

```typescript
interface Script {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  code: string;
  filePath: string;
  createdAt: Date;
  modifiedAt: Date;
  enabled: boolean;
}

interface ExecutionOptions {
  timeout?: number;  // default: 10000ms
  debug?: boolean;   // default: false
}

interface ExecutionResult {
  success: boolean;
  result: any;
  error: {
    message: string;
    stack?: string;
  } | null;
  executionTime: number;
  consoleOutput?: ConsoleOutput[];
}

interface HarmonyAPI {
  event?: {
    type: string;
    data: any;
    timestamp: number;
    isTest?: boolean;
  };
  [key: string]: any;
}
```

## 🔄 Service Lifecycle

All services follow the same lifecycle pattern:

```typescript
import { getXxxService } from './services/xxx-service';

// 1. Get singleton instance
const service = getXxxService();

// 2. Initialize (required before use)
await service.initialize();

// 3. Check if initialized
if (service.isInitialized()) {
  // Use service methods
}

// 4. Cleanup when done
service.dispose();
```

## 🛡️ Error Handling

All services use consistent error handling:

```typescript
try {
  await service.someMethod();
} catch (error) {
  // Errors are properly typed and logged
  console.error('Operation failed:', error);
}

// Services also emit error events
service.on('error', ({ operation, error }) => {
  console.error(`Error in ${operation}:`, error);
});
```

## 📝 Logging

All services support configurable logging:

```typescript
const service = getXxxService({
  logLevel: 'debug' // 'debug' | 'info' | 'warn' | 'error'
});

await service.initialize();
// Logs: [ServiceName] Initializing service...
```

## 🔗 Service Integration

### Event Trigger + Script Service

```typescript
const eventService = getEventTriggerService();
const scriptService = getScriptService();

await eventService.initialize();
await scriptService.initialize();

// Create a script
const scriptId = await scriptService.save({
  name: 'Slide Changed Handler',
  code: `
    console.log('Slide changed to:', harmony.event.data.slideId);
    // Perform automation tasks
  `
});

// Register trigger for the script
await eventService.registerTrigger(
  EventType.SLIDE_CHANGE,
  scriptId,
  { enabled: true }
);

// When slide changes, script automatically executes
await eventService.emitTrigger('slideChange', { slideId: '123' });
```

### Scheduler + Macro Service

```typescript
const scheduler = getSchedulerService();
const macroService = getMacroService();

// Schedule a macro to execute at specific time
const event: ScheduledEvent = {
  event_time: '2024-01-27T10:00:00Z',
  event_type: 'macro',
  target_id: 'start-music-macro'
};

if (scheduler.shouldExecuteNow(event)) {
  await macroService.executeMacroAction(
    event.target_id,
    'start_preservice_music'
  );
}
```

## 🚀 Best Practices

1. **Always initialize services** before use
2. **Dispose services** when no longer needed
3. **Use singleton getters** to ensure single instance
4. **Handle errors** with try-catch
5. **Type your data** using provided interfaces
6. **Validate input** before operations
7. **Set appropriate timeouts** for script execution
8. **Use debug mode** during development
9. **Test triggers** before enabling
10. **Monitor execution results** for failures

## 📚 Related Documentation

- [BaseElectronService](./electron/types/services.ts) - Base class reference
- [Service Interfaces](./electron/types/services.ts) - All interface definitions
- [Full Conversion Summary](./TYPESCRIPT_AUTOMATION_SERVICES_COMPLETE.md)
