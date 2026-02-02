import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { core } from '../../electron-adapter';

/**
 * Script Editor Component
 * Monaco-based editor for creating and editing user scripts
 */
const ScriptEditor = () => {
  type Script = { id: string; name: string; description?: string; author?: string; code?: string };
  const [scripts, setScripts] = useState<Script[]>([]);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [code, setCode] = useState<string>('');
  const [scriptName, setScriptName] = useState<string>('');
  const [scriptDescription, setScriptDescription] = useState<string>('');
  const [scriptAuthor, setScriptAuthor] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [showApiDocs, setShowApiDocs] = useState<boolean>(false);

  // Load scripts on mount
  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      const result = await core.invoke('script:getAll') as Script[] | undefined;
      setScripts(result || []);
    } catch (error) {
      console.error('Failed to load scripts:', error);
    }
  };

  const handleNewScript = () => {
    setCurrentScript(null);
    setCode(`/**
 * @name New Script
 * @description Enter script description
 * @author Your Name
 * @version 1.0.0
 * @enabled true
 */

// Your script code here
// Available API: harmony.display, harmony.audio, harmony.video, harmony.window, harmony.midi, etc.

async function main() {
  // Example: Show a message
  await harmony.display.showSlide({
    text: "Hello from script!",
    background: "#1a1a2e"
  });
  
  console.log("Script executed successfully!");
}

// Run the main function
main();`);
    setScriptName('New Script');
    setScriptDescription('');
    setScriptAuthor('');
    setValidationResult(null);
    setExecutionResult(null);
  };

  const handleLoadScript = async (scriptId: any) => {
    try {
      const script = await core.invoke('script:get', scriptId) as Script;
      setCurrentScript(script);
      setCode(script.code || '');
      setScriptName(script.name || '');
      setScriptDescription(script.description || '');
      setScriptAuthor(script.author || '');
      setValidationResult(null);
      setExecutionResult(null);
    } catch (error) {
      console.error('Failed to load script:', error);
      alert(`Failed to load script: ${(error as Error).message}`);
    }
  };

  const handleSaveScript = async () => {
    try {
      const scriptData = {
        name: scriptName,
        description: scriptDescription,
        author: scriptAuthor,
        code: code
      };

      if (currentScript) {
        // Update existing script
        await core.invoke('script:update', currentScript.id, scriptData);
        alert('Script updated successfully!');
      } else {
        // Create new script
        const newScript = await core.invoke('script:create', scriptData) as Script;
        setCurrentScript(newScript);
        alert('Script created successfully!');
      }

      await loadScripts();
    } catch (error) {
      console.error('Failed to save script:', error);
      alert(`Failed to save script: ${(error as any).message}`);
    }
  };

  const handleValidateScript = async () => {
    try {
      const result = await core.invoke('script:validate', code) as any;
      setValidationResult(result);
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({ valid: false, errors: [{ message: (error as Error).message }] });
    }
  };

  const handleExecuteScript = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      // Validate first
      const validation = await core.invoke('script:validate', code) as any;
      if (!validation.valid) {
        setExecutionResult({
          success: false,
          error: { message: `Validation failed: ${validation.errors[0].message}` }
        });
        setIsExecuting(false);
        return;
      }

      // Execute script
      const result = await core.invoke('script:execute', code, { timeout: 10000 }) as any;
      setExecutionResult(result);
    } catch (error) {
      console.error('Execution error:', error);
      setExecutionResult({
        success: false,
        error: { message: (error as Error).message }
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDeleteScript = async () => {
    if (!currentScript) return;

    if (!confirm(`Delete script "${currentScript.name}"?`)) return;

    try {
      await core.invoke('script:delete', currentScript.id);
      alert('Script deleted successfully!');
      handleNewScript();
      await loadScripts();
    } catch (error) {
      console.error('Failed to delete script:', error);
      alert(`Failed to delete script: ${(error as Error).message}`);
    }
  };

  const handleExportScript = async () => {
    if (!currentScript) return;

    try {
      const exportPath = await core.invoke('dialog:saveFile', {
        title: 'Export Script',
        defaultPath: `${currentScript.id}.js`,
        filters: [{ name: 'JavaScript', extensions: ['js'] }]
      });

      if (exportPath) {
        await core.invoke('script:export', currentScript.id, exportPath);
        alert('Script exported successfully!');
      }
    } catch (error) {
      console.error('Failed to export script:', error);
      alert(`Failed to export script: ${(error as Error).message}`);
    }
  };

  const handleImportScript = async () => {
    try {
      const importPath = await core.invoke('dialog:openFile', {
        title: 'Import Script',
        filters: [{ name: 'JavaScript', extensions: ['js'] }]
      });

        if (importPath && (importPath as string[]).length > 0) {
        const script = await core.invoke('script:import', (importPath as string[])[0]) as any;
        alert('Script imported successfully!');
        await loadScripts();
        await handleLoadScript(script.id);
      }
    } catch (error) {
      console.error('Failed to import script:', error);
      alert(`Failed to import script: ${(error as Error).message}`);
    }
  };

  return (
    <div className="script-editor-container">
      <div className="script-editor-header">
        <h2>Script Editor</h2>
        <div className="script-editor-actions">
          <button onClick={handleNewScript}>New Script</button>
          <button onClick={handleSaveScript}>Save</button>
          <button onClick={handleValidateScript}>Validate</button>
          <button onClick={handleExecuteScript} disabled={isExecuting}>
            {isExecuting ? 'Executing...' : 'Test Run'}
          </button>
          <button onClick={handleImportScript}>Import</button>
          {currentScript && <button onClick={handleExportScript}>Export</button>}
          {currentScript && <button onClick={handleDeleteScript} className="danger">Delete</button>}
          <button onClick={() => setShowApiDocs(!showApiDocs)}>
            {showApiDocs ? 'Hide' : 'Show'} API Docs
          </button>
        </div>
      </div>

      <div className="script-editor-content">
        <div className="script-editor-sidebar">
          <h3>Scripts</h3>
          <div className="script-list">
            {scripts.map(script => (
              <div
                key={script.id}
                className={`script-item ${currentScript?.id === script.id ? 'active' : ''}`}
                onClick={() => handleLoadScript(script.id)}
              >
                <div className="script-item-name">{script.name}</div>
                <div className="script-item-description">{script.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="script-editor-main">
          <div className="script-editor-metadata">
            <input
              type="text"
              placeholder="Script Name"
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              className="script-name-input"
            />
            <input
              type="text"
              placeholder="Description"
              value={scriptDescription}
              onChange={(e) => setScriptDescription(e.target.value)}
              className="script-description-input"
            />
            <input
              type="text"
              placeholder="Author"
              value={scriptAuthor}
              onChange={(e) => setScriptAuthor(e.target.value)}
              className="script-author-input"
            />
          </div>

          <div className="script-editor-monaco">
            <Editor
              height="500px"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={(value: string | undefined) => setCode(value || '')}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2
              }}
            />
          </div>

          {validationResult && (
            <div className={`validation-result ${validationResult.valid ? 'success' : 'error'}`}>
              {validationResult.valid ? (
                <p>✓ Script is valid!</p>
              ) : (
                <div>
                  <p>✗ Validation Errors:</p>
                  <ul>
                    {validationResult.errors.map((error: any, index: number) => (
                      <li key={index}>
                        Line {error.line}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {executionResult && (
            <div className={`execution-result ${executionResult.success ? 'success' : 'error'}`}>
              {executionResult.success ? (
                <div>
                  <p>✓ Script executed successfully!</p>
                  {executionResult.result && (
                    <pre>{JSON.stringify(executionResult.result, null, 2)}</pre>
                  )}
                </div>
              ) : (
                <div>
                  <p>✗ Execution Error:</p>
                  <p>{executionResult.error.message}</p>
                  {executionResult.error.stack && (
                    <pre>{executionResult.error.stack}</pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {showApiDocs && (
          <div className="script-editor-api-docs">
            <h3>HarmonySync API</h3>
            <div className="api-docs-content">
              <h4>harmony.display</h4>
              <ul>
                <li><code>showSlide(content)</code> - Show slide on displays</li>
                <li><code>showVideo(videoPath, options)</code> - Show video</li>
                <li><code>blackScreen()</code> - Show black screen</li>
                <li><code>clearAll()</code> - Clear all displays</li>
                <li><code>updateLowerThirds(text)</code> - Update lower thirds</li>
              </ul>

              <h4>harmony.window</h4>
              <ul>
                <li><code>show(windowName)</code> - Show window ('audience', 'confidence', 'lowerThirds')</li>
                <li><code>hide(windowName)</code> - Hide window</li>
                <li><code>toggle(windowName)</code> - Toggle window</li>
              </ul>

              <h4>harmony.midi</h4>
              <ul>
                <li><code>sendNote(note, velocity, duration)</code> - Send MIDI note (0-127)</li>
                <li><code>sendCC(controller, value)</code> - Send control change</li>
              </ul>

              <h4>harmony.utils</h4>
              <ul>
                <li><code>wait(ms)</code> - Wait for specified milliseconds</li>
                <li><code>now()</code> - Get current timestamp</li>
              </ul>

              <p><em>Full API documentation available in SCRIPTING_API.md</em></p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .script-editor-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #1a1a2e;
          color: #eee;
        }

        .script-editor-header {
          padding: 1rem;
          background: #16213e;
          border-bottom: 1px solid #0f3460;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .script-editor-header h2 {
          margin: 0;
          color: #00d4ff;
        }

        .script-editor-actions {
          display: flex;
          gap: 0.5rem;
        }

        .script-editor-actions button {
          padding: 0.5rem 1rem;
          background: #0f3460;
          color: #eee;
          border: 1px solid #00d4ff;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .script-editor-actions button:hover {
          background: #00d4ff;
          color: #16213e;
        }

        .script-editor-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .script-editor-actions button.danger {
          border-color: #ff6b6b;
        }

        .script-editor-actions button.danger:hover {
          background: #ff6b6b;
          color: #fff;
        }

        .script-editor-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .script-editor-sidebar {
          width: 250px;
          background: #16213e;
          border-right: 1px solid #0f3460;
          overflow-y: auto;
        }

        .script-editor-sidebar h3 {
          padding: 1rem;
          margin: 0;
          color: #00d4ff;
          border-bottom: 1px solid #0f3460;
        }

        .script-list {
          padding: 0.5rem;
        }

        .script-item {
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          background: #1a1a2e;
          border: 1px solid #0f3460;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .script-item:hover {
          border-color: #00d4ff;
          background: #0f3460;
        }

        .script-item.active {
          border-color: #00d4ff;
          background: #0f3460;
        }

        .script-item-name {
          font-weight: bold;
          margin-bottom: 0.25rem;
        }

        .script-item-description {
          font-size: 0.875rem;
          color: #aaa;
        }

        .script-editor-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .script-editor-metadata {
          padding: 1rem;
          background: #16213e;
          border-bottom: 1px solid #0f3460;
          display: flex;
          gap: 0.5rem;
        }

        .script-editor-metadata input {
          flex: 1;
          padding: 0.5rem;
          background: #1a1a2e;
          color: #eee;
          border: 1px solid #0f3460;
          border-radius: 4px;
        }

        .script-editor-monaco {
          flex: 1;
        }

        .validation-result,
        .execution-result {
          padding: 1rem;
          margin: 1rem;
          border-radius: 4px;
        }

        .validation-result.success,
        .execution-result.success {
          background: #2d4a2d;
          border: 1px solid #4caf50;
        }

        .validation-result.error,
        .execution-result.error {
          background: #4a2d2d;
          border: 1px solid #ff6b6b;
        }

        .execution-result pre {
          background: #1a1a2e;
          padding: 0.5rem;
          border-radius: 4px;
          overflow-x: auto;
        }

        .script-editor-api-docs {
          width: 300px;
          background: #16213e;
          border-left: 1px solid #0f3460;
          overflow-y: auto;
          padding: 1rem;
        }

        .script-editor-api-docs h3 {
          color: #00d4ff;
          margin-top: 0;
        }

        .script-editor-api-docs h4 {
          color: #00d4ff;
          margin: 1rem 0 0.5rem;
        }

        .script-editor-api-docs ul {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem;
        }

        .script-editor-api-docs li {
          padding: 0.25rem 0;
          font-size: 0.875rem;
        }

        .script-editor-api-docs code {
          color: #ffd93d;
          font-family: 'Monaco', 'Courier New', monospace;
        }
      `}</style>
    </div>
  );
};

export default ScriptEditor;
