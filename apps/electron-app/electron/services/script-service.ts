/**
 * Script Service
 * Handles user-created JavaScript scripts with TypeScript OOP design
 * Provides sandboxed execution for custom automation and macros
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import { VM } from 'vm2';
import { BaseElectronService, IScriptService, ServiceConfig } from '@harmonysync/core';

// ==================== Type Definitions ====================

/**
 * Script metadata extracted from comments
 */
export interface ScriptMetadata {
  name: string | null;
  description: string | null;
  author: string | null;
  version: string | null;
  enabled: boolean;
}

/**
 * Script structure
 */
export interface Script {
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

/**
 * Script creation data
 */
export interface ScriptData {
  name: string;
  description?: string;
  author?: string;
  code: string;
}

/**
 * Script update data
 */
export interface ScriptUpdates {
  name?: string;
  description?: string;
  author?: string;
  version?: string;
  code?: string;
  enabled?: boolean;
}

/**
 * Script validation result
 */
export interface ScriptValidationResult {
  valid: boolean;
  errors: Array<{
    message: string;
    line: number;
    column: number;
  }>;
}

/**
 * Script execution options
 */
export interface ExecutionOptions {
  timeout?: number;
  debug?: boolean;
}

/**
 * Console output entry
 */
export interface ConsoleOutput {
  type: 'log' | 'error' | 'warn';
  message: string;
  timestamp: number;
}

/**
 * Script execution result
 */
export interface ExecutionResult {
  success: boolean;
  result: any;
  error: {
    message: string;
    stack?: string;
  } | null;
  executionTime: number;
  consoleOutput?: ConsoleOutput[];
}

/**
 * Harmony API interface for scripts
 */
export interface HarmonyAPI {
  event?: {
    type: string;
    data: any;
    timestamp: number;
    isTest?: boolean;
  };
  [key: string]: any;
}

// ==================== Script Service Class ====================

/**
 * Script Service Implementation
 * Manages user scripts with sandboxed execution using VM2
 */
export class ScriptService extends BaseElectronService implements IScriptService {
  protected readonly serviceName = 'ScriptService';
  
  private scriptsDir: string;
  
  constructor(config?: ServiceConfig) {
    super(config);
    this.scriptsDir = path.join(app.getPath('userData'), 'scripts');
  }

  /**
   * Initialize the script service
   */
  protected override async onInitialize(): Promise<void> {
    await this.initializeScriptStorage();
    this.log('info', 'Script service initialized');
  }

  /**
   * Clean up resources
   */
  protected override onDispose(): void {
    this.log('info', 'Script service disposed');
  }

  // ==================== Storage Methods ====================

  /**
   * Initialize script storage directory
   */
  private async initializeScriptStorage(): Promise<void> {
    try {
      await fs.ensureDir(this.scriptsDir);
      this.log('debug', `Script storage initialized at: ${this.scriptsDir}`);
    } catch (error) {
      this.handleError('initializeScriptStorage', error);
    }
  }

  // ==================== Public API Methods ====================

  /**
   * Get all scripts
   * @returns Promise resolving to array of script objects
   */
  public async list(): Promise<Script[]> {
    try {
      await fs.ensureDir(this.scriptsDir);
      
      const files = await fs.readdir(this.scriptsDir);
      const scriptFiles = files.filter(f => f.endsWith('.js'));
      
      const scripts: Script[] = [];
      for (const file of scriptFiles) {
        const scriptPath = path.join(this.scriptsDir, file);
        const content = await fs.readFile(scriptPath, 'utf8');
        const stats = await fs.stat(scriptPath);
        
        // Extract metadata from script comments if present
        const metadata = this.extractMetadata(content);
        
        scripts.push({
          id: path.basename(file, '.js'),
          name: metadata.name || path.basename(file, '.js'),
          description: metadata.description || '',
          author: metadata.author || 'Unknown',
          version: metadata.version || '1.0.0',
          code: content,
          filePath: scriptPath,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          enabled: metadata.enabled !== false
        });
      }
      
      this.log('debug', `Found ${scripts.length} scripts`);
      return scripts;
    } catch (error) {
      this.handleError('list', error);
    }
  }

  /**
   * Get a single script by ID
   * @param scriptId - Script ID
   * @returns Promise resolving to script object
   */
  public async getScript(scriptId: string): Promise<Script> {
    try {
      const scriptPath = path.join(this.scriptsDir, `${scriptId}.js`);
      
      if (!await fs.pathExists(scriptPath)) {
        throw new Error(`Script not found: ${scriptId}`);
      }
      
      const content = await fs.readFile(scriptPath, 'utf8');
      const stats = await fs.stat(scriptPath);
      const metadata = this.extractMetadata(content);
      
      return {
        id: scriptId,
        name: metadata.name || scriptId,
        description: metadata.description || '',
        author: metadata.author || 'Unknown',
        version: metadata.version || '1.0.0',
        code: content,
        filePath: scriptPath,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        enabled: metadata.enabled !== false
      };
    } catch (error) {
      this.handleError('getScript', error);
    }
  }

  /**
   * Create a new script
   * @param scriptData - Script data
   * @returns Promise resolving to created script object
   */
  public async save(scriptData: ScriptData): Promise<string> {
    try {
      const { name, description, author, code } = scriptData;
      
      if (!name || !code) {
        throw new Error('Script name and code are required');
      }
      
      // Generate ID from name
      const scriptId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const scriptPath = path.join(this.scriptsDir, `${scriptId}.js`);
      
      // Check if script already exists
      if (await fs.pathExists(scriptPath)) {
        throw new Error(`Script with ID "${scriptId}" already exists`);
      }
      
      // Add metadata header to script
      const scriptContent = this.createScriptContent(
        name,
        description || 'No description',
        author || 'Unknown',
        '1.0.0',
        true,
        code
      );
      
      await fs.writeFile(scriptPath, scriptContent, 'utf8');
      
      this.log('info', `Script created: ${scriptId}`);
      return scriptId;
    } catch (error) {
      this.handleError('save', error);
    }
  }

  /**
   * Update an existing script
   * @param scriptId - Script ID
   * @param updates - Script updates
   * @returns Promise resolving to updated script object
   */
  public async updateScript(scriptId: string, updates: ScriptUpdates): Promise<Script> {
    try {
      const scriptPath = path.join(this.scriptsDir, `${scriptId}.js`);
      
      if (!await fs.pathExists(scriptPath)) {
        throw new Error(`Script not found: ${scriptId}`);
      }
      
      const currentScript = await this.getScript(scriptId);
      
      // Merge updates
      const updatedMetadata = {
        name: updates.name || currentScript.name,
        description: updates.description || currentScript.description,
        author: updates.author || currentScript.author,
        version: updates.version || currentScript.version,
        enabled: updates.enabled !== undefined ? updates.enabled : currentScript.enabled
      };
      
      const updatedCode = updates.code || currentScript.code;
      
      // Recreate script with updated metadata
      const scriptContent = this.createScriptContent(
        updatedMetadata.name,
        updatedMetadata.description,
        updatedMetadata.author,
        updatedMetadata.version,
        updatedMetadata.enabled,
        updatedCode
      );
      
      await fs.writeFile(scriptPath, scriptContent, 'utf8');
      
      this.log('info', `Script updated: ${scriptId}`);
      return await this.getScript(scriptId);
    } catch (error) {
      this.handleError('updateScript', error);
    }
  }

  /**
   * Delete a script
   * @param scriptId - Script ID
   * @returns Promise resolving to void
   */
  public async delete(scriptId: string): Promise<void> {
    try {
      const scriptPath = path.join(this.scriptsDir, `${scriptId}.js`);
      
      if (!await fs.pathExists(scriptPath)) {
        throw new Error(`Script not found: ${scriptId}`);
      }
      
      await fs.remove(scriptPath);
      this.log('info', `Script deleted: ${scriptId}`);
    } catch (error) {
      this.handleError('delete', error);
    }
  }

  // ==================== Validation Methods ====================

  /**
   * Validate script syntax
   * @param code - Script code
   * @returns Validation result
   */
  public validateScript(code: string): ScriptValidationResult {
    try {
      // Basic syntax check using Function constructor
      new Function(code);
      
      return {
        valid: true,
        errors: []
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [{
          message: error.message || 'Unknown error',
          line: error.lineNumber || 0,
          column: error.columnNumber || 0
        }]
      };
    }
  }

  // ==================== Execution Methods ====================

  /**
   * Execute a script in a sandboxed environment
   * @param scriptId - Script ID or direct code
   * @param params - HarmonySync API object and parameters
   * @param options - Execution options
   * @returns Promise resolving to script execution result
   */
  public async execute(
    scriptId: string,
    params?: any,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    return this.executeScript(scriptId, params, options);
  }

  /**
   * Execute a script in a sandboxed environment (main implementation)
   * @param scriptId - Script ID or direct code
   * @param harmonyAPI - HarmonySync API object
   * @param options - Execution options
   * @returns Promise resolving to script execution result
   */
  public async executeScript(
    scriptId: string,
    harmonyAPI?: HarmonyAPI,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const timeout = options.timeout || 10000; // 10 seconds default
    const debugMode = options.debug || false;
    
    try {
      let code: string;
      
      if (scriptId.includes('\n') || scriptId.includes('{')) {
        // Direct code execution
        code = scriptId;
      } else {
        // Load script from file
        const script = await this.getScript(scriptId);
        
        if (!script.enabled) {
          throw new Error(`Script "${scriptId}" is disabled`);
        }
        
        code = script.code;
      }
      
      // Validate before execution
      const validation = this.validateScript(code);
      if (!validation.valid) {
        throw new Error(`Script validation failed: ${validation.errors[0].message}`);
      }
      
      // Console output capture for debug mode
      const consoleOutput: ConsoleOutput[] = [];
      
      // Create sandboxed VM
      const vm = new VM({
        timeout: timeout,
        sandbox: {
          harmony: harmonyAPI || {},
          console: this.createConsoleSandbox(consoleOutput, debugMode)
        }
      });
      
      const startTime = Date.now();
      
      const result = await vm.run(code);
      const executionTime = Date.now() - startTime;
      
      this.log('debug', `Script executed successfully in ${executionTime}ms`);
      
      return {
        success: true,
        result: result,
        error: null,
        executionTime: executionTime,
        consoleOutput: debugMode ? consoleOutput : undefined
      };
    } catch (error: any) {
      const executionTime = Date.now();
      this.log('error', 'Script execution error:', error);
      
      return {
        success: false,
        result: null,
        error: {
          message: error.message || 'Unknown error',
          stack: error.stack
        },
        executionTime: executionTime,
        consoleOutput: options.debug ? [] : undefined
      };
    }
  }

  /**
   * Create console sandbox for script execution
   * @param consoleOutput - Array to capture console output
   * @param debugMode - Whether debug mode is enabled
   * @returns Console object for sandbox
   */
  private createConsoleSandbox(consoleOutput: ConsoleOutput[], debugMode: boolean): any {
    return {
      log: (...args: any[]) => {
        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        console.log('[Script]', ...args);
        if (debugMode) {
          consoleOutput.push({ type: 'log', message, timestamp: Date.now() });
        }
      },
      error: (...args: any[]) => {
        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        console.error('[Script]', ...args);
        if (debugMode) {
          consoleOutput.push({ type: 'error', message, timestamp: Date.now() });
        }
      },
      warn: (...args: any[]) => {
        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        console.warn('[Script]', ...args);
        if (debugMode) {
          consoleOutput.push({ type: 'warn', message, timestamp: Date.now() });
        }
      }
    };
  }

  // ==================== Import/Export Methods ====================

  /**
   * Export a script to a file
   * @param scriptId - Script ID
   * @param exportPath - Export file path
   * @returns Promise resolving to exported file path
   */
  public async exportScript(scriptId: string, exportPath: string): Promise<string> {
    try {
      const script = await this.getScript(scriptId);
      
      const destinationPath = exportPath.endsWith('.js') 
        ? exportPath 
        : path.join(exportPath, `${scriptId}.js`);
      
      await fs.copy(script.filePath, destinationPath);
      
      this.log('info', `Script exported: ${scriptId} -> ${destinationPath}`);
      return destinationPath;
    } catch (error) {
      this.handleError('exportScript', error);
    }
  }

  /**
   * Import a script from a file
   * @param importPath - Import file path
   * @returns Promise resolving to imported script object
   */
  public async importScript(importPath: string): Promise<Script> {
    try {
      if (!await fs.pathExists(importPath)) {
        throw new Error(`Import file not found: ${importPath}`);
      }
      
      const code = await fs.readFile(importPath, 'utf8');
      const metadata = this.extractMetadata(code);
      
      const scriptData: ScriptData = {
        name: metadata.name || path.basename(importPath, '.js'),
        description: metadata.description || '',
        author: metadata.author || 'Unknown',
        code: code
      };
      
      const scriptId = await this.save(scriptData);
      this.log('info', `Script imported: ${scriptId}`);
      
      return await this.getScript(scriptId);
    } catch (error) {
      this.handleError('importScript', error);
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Extract metadata from script comments
   * @param code - Script code
   * @returns Metadata object
   */
  private extractMetadata(code: string): ScriptMetadata {
    const metadata: ScriptMetadata = {
      name: null,
      description: null,
      author: null,
      version: null,
      enabled: true
    };
    
    // Match JSDoc-style comments
    const commentMatch = code.match(/\/\*\*[\s\S]*?\*\//);
    if (!commentMatch) return metadata;
    
    const comment = commentMatch[0];
    
    // Extract fields
    const nameMatch = comment.match(/@name\s+(.+)/);
    if (nameMatch) metadata.name = nameMatch[1].trim();
    
    const descMatch = comment.match(/@description\s+(.+)/);
    if (descMatch) metadata.description = descMatch[1].trim();
    
    const authorMatch = comment.match(/@author\s+(.+)/);
    if (authorMatch) metadata.author = authorMatch[1].trim();
    
    const versionMatch = comment.match(/@version\s+(.+)/);
    if (versionMatch) metadata.version = versionMatch[1].trim();
    
    const enabledMatch = comment.match(/@enabled\s+(.+)/);
    if (enabledMatch) metadata.enabled = enabledMatch[1].trim() === 'true';
    
    return metadata;
  }

  /**
   * Create script content with metadata header
   * @param name - Script name
   * @param description - Script description
   * @param author - Script author
   * @param version - Script version
   * @param enabled - Whether script is enabled
   * @param code - Script code
   * @returns Complete script content
   */
  private createScriptContent(
    name: string,
    description: string,
    author: string,
    version: string,
    enabled: boolean,
    code: string
  ): string {
    return `/**
 * @name ${name}
 * @description ${description}
 * @author ${author}
 * @version ${version}
 * @enabled ${enabled}
 */

${code}`;
  }
}

// ==================== Singleton Export ====================

let scriptServiceInstance: ScriptService | null = null;

/**
 * Get or create the script service singleton
 */
export function getScriptService(config?: ServiceConfig): ScriptService {
  if (!scriptServiceInstance) {
    scriptServiceInstance = new ScriptService(config);
  }
  return scriptServiceInstance;
}

// Export for backward compatibility
export default ScriptService;
