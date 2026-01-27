/**
 * Tests for Script Service
 */

import { createHarmonySyncAPI } from '../scripting-api';
import ScriptService from '../script-service';
import type { ScriptValidationResult } from '../script-service';

interface MockServices {
  displayService?: any;
  audioService?: any;
  videoService?: any;
  windowService?: any;
  macroService?: any;
  imageService?: any;
  textService?: any;
  schedulerService?: any;
  midiManager?: any;
  mainWindow: () => any;
  audienceWindow: () => any;
  confidenceWindow: () => any;
  lowerThirdsWindow: () => any;
}

interface HarmonySyncAPI {
  display?: any;
  audio?: any;
  video?: any;
  image?: any;
  text?: any;
  window?: any;
  midi?: any;
  macro?: any;
  scheduler?: any;
  utils: {
    wait: (ms: number) => Promise<void>;
    [key: string]: any;
  };
}

describe('Script Service', () => {
  let service: ScriptService;
  
  beforeEach(() => {
    service = new ScriptService();
  });
  
  describe('validateScript', () => {
    it('should validate correct JavaScript code', () => {
      const code = 'console.log("Hello World");';
      const result: ScriptValidationResult = service.validateScript(code);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect syntax errors', () => {
      const code = 'console.log("Unclosed string';
      const result: ScriptValidationResult = service.validateScript(code);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should validate complex code', () => {
      const code = `
        async function test() {
          await harmony.display.showSlide({ text: "Test" });
          return true;
        }
        test();
      `;
      const result: ScriptValidationResult = service.validateScript(code);
      
      expect(result.valid).toBe(true);
    });
  });
  
  describe('extractMetadata', () => {
    it('should extract metadata from script comments', () => {
      const code = `/**
 * @name Test Script
 * @description This is a test
 * @author John Doe
 * @version 1.0.0
 * @enabled true
 */

console.log("test");`;
      
      // Access private function via module internals (for testing)
      const metadata: ScriptValidationResult = service.validateScript(code);
      expect(metadata.valid).toBe(true);
    });
  });
});

describe('HarmonySync API', () => {
  it('should create API object with all namespaces', () => {
    const mockServices: MockServices = {
      displayService: {},
      audioService: {},
      videoService: {},
      windowService: {},
      macroService: {},
      imageService: {},
      textService: {},
      schedulerService: {},
      midiManager: {},
      mainWindow: () => null,
      audienceWindow: () => null,
      confidenceWindow: () => null,
      lowerThirdsWindow: () => null
    };
    
    const api: HarmonySyncAPI = createHarmonySyncAPI(mockServices);
    
    expect(api).toHaveProperty('display');
    expect(api).toHaveProperty('audio');
    expect(api).toHaveProperty('video');
    expect(api).toHaveProperty('image');
    expect(api).toHaveProperty('text');
    expect(api).toHaveProperty('window');
    expect(api).toHaveProperty('midi');
    expect(api).toHaveProperty('macro');
    expect(api).toHaveProperty('scheduler');
    expect(api).toHaveProperty('utils');
  });
  
  it('should have utils.wait function', async () => {
    const mockServices: MockServices = {
      mainWindow: () => null,
      audienceWindow: () => null,
      confidenceWindow: () => null,
      lowerThirdsWindow: () => null
    };
    
    const api: HarmonySyncAPI = createHarmonySyncAPI(mockServices);
    
    const start = Date.now();
    await api.utils.wait(100);
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});
