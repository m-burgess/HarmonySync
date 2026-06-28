import * as path from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { dialog, BrowserWindow, app } from 'electron';

export class PythonProcessorService {
  private getMainWindow: () => BrowserWindow | null;

  constructor(getMainWindow: () => BrowserWindow | null = () => null) {
    this.getMainWindow = getMainWindow;
  }

  setMainWindowGetter(getter: () => BrowserWindow | null) {
    this.getMainWindow = getter;
  }

  /**
   * Prompts the user to select a folder if one is not provided, then runs the Python processor.
   */
  async processSongFolder(folderPath?: string, separateStems: boolean = false): Promise<{ success: boolean; error?: string; output?: string }> {
    try {
      let targetFolder = folderPath;
      if (!targetFolder) {
        const win = this.getMainWindow();
        const result = win
          ? await dialog.showOpenDialog(win, {
              title: 'Select Song Folder to Process',
              properties: ['openDirectory']
            })
          : await dialog.showOpenDialog({
              title: 'Select Song Folder to Process',
              properties: ['openDirectory']
            });

        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
          return { success: false, error: 'User canceled folder selection' };
        }
        targetFolder = result.filePaths[0];
      }

      console.log(`[PythonProcessor] Processing parent folder: ${targetFolder}`);

      // Read all items in the target directory
      const items = await fs.readdir(targetFolder, { withFileTypes: true });
      const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg'];
      
      const hasAudioFile = items.some(item => !item.isDirectory() && audioExtensions.some(ext => item.name.toLowerCase().endsWith(ext)));
      
      let foldersToProcess: string[] = [];
      if (hasAudioFile) {
        foldersToProcess.push(targetFolder);
      } else {
        foldersToProcess = items.filter(item => item.isDirectory()).map(item => path.join(targetFolder, item.name));
      }
      
      let processedCount = 0;

      // Resolve the bundled python executable and script
      const isPackaged = app.isPackaged;
      const pythonDir = isPackaged 
        ? path.join(process.resourcesPath, 'python-song-processor')
        : path.join(__dirname, '../../../../python-song-processor');
        
      const pythonExecutable = path.join(pythonDir, 'venv', 'bin', 'python');
      const mainScript = path.join(pythonDir, 'main.py');

      if (!fs.existsSync(pythonExecutable)) {
        return {
          success: false,
          error: `Python virtual environment not found at ${pythonExecutable}. Please run ./build.sh in python-song-processor.`
        };
      }

      // Process each folder sequentially
      for (const subDir of foldersToProcess) {
        const files = await fs.readdir(subDir);

        let audioPath = '';
        let guidePath = '';
        let lyricsPath = '';
        let pdfPath = '';

        // First pass: look specifically for reference.mp3 and chords.pdf
        const hasReference = files.some(f => f.toLowerCase() === 'reference.mp3' || f.toLowerCase() === 'reference.wav');
        const hasGuide = files.some(f => f.toLowerCase() === 'guide.mp3' || f.toLowerCase() === 'guide.wav');
        const hasChordsPdf = files.some(f => f.toLowerCase() === 'chords.pdf');

        for (const file of files) {
          const lowerFile = file.toLowerCase();
          
          if (hasReference) {
            if (lowerFile === 'reference.mp3' || lowerFile === 'reference.wav') {
              audioPath = path.join(subDir, file);
            }
          } else if (audioExtensions.some(ext => lowerFile.endsWith(ext)) && !audioPath && !lowerFile.includes('guide')) {
            // Fallback to first audio file if no reference.mp3 exists
            audioPath = path.join(subDir, file);
          }
          
          if (hasGuide) {
            if (lowerFile === 'guide.mp3' || lowerFile === 'guide.wav') {
              guidePath = path.join(subDir, file);
            }
          } else if (audioExtensions.some(ext => lowerFile.endsWith(ext)) && lowerFile.includes('guide') && !guidePath) {
            guidePath = path.join(subDir, file);
          }
          
          if (lowerFile === 'lyrics.txt' || lowerFile === 'lyrics.pdf') {
            lyricsPath = path.join(subDir, file);
          }
          
          if (hasChordsPdf) {
            if (lowerFile === 'chords.pdf') {
              pdfPath = path.join(subDir, file);
            }
          } else if (lowerFile.endsWith('.pdf') && !pdfPath && lowerFile !== 'lyrics.pdf') {
            pdfPath = path.join(subDir, file);
          }
        }

        // If a folder has audio, we can process it (Zero-Config Magic Ingestion)
        if (audioPath) {
          console.log(`[PythonProcessor] Found song materials in: ${subDir}. Processing...`);
          const outputPath = path.join(subDir, 'song-map.json');
          
          try {
            await new Promise<void>((resolve, reject) => {
              const args = [
                mainScript,
                '--audio', audioPath,
                '--output', outputPath
              ];

              if (guidePath) {
                args.push('--guide', guidePath);
              }
              if (lyricsPath) {
                args.push('--lyrics', lyricsPath);
              }
              if (pdfPath) {
                args.push('--pdf', pdfPath);
              }
              
              if (separateStems) {
                args.push('--separate-stems');
              }
              if (!hasReference) {
                args.push('--skip-alignment');
              }

              console.log(`[PythonProcessor] Spawning: ${pythonExecutable} ${args.join(' ')}`);
              const pyProcess = spawn(pythonExecutable, args);

              pyProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                console.log(`[PythonProcessor] ${output}`);
                
                const lines = output.split('\n');
                for (const line of lines) {
                  if (line.includes('[PROGRESS]')) {
                    try {
                      const jsonStr = line.substring(line.indexOf('{'));
                      const progressData = JSON.parse(jsonStr);
                      const win = this.getMainWindow();
                      if (win && !win.isDestroyed()) {
                        win.webContents.send('python:process-progress', progressData);
                      }
                    } catch (e) {
                      console.error('Failed to parse progress JSON', e);
                    }
                  }
                }
              });

              pyProcess.stderr.on('data', (data) => {
                const error = data.toString().trim();
                console.error(`[PythonProcessor Error] ${error}`);
              });

              pyProcess.on('error', (err) => {
                console.error(`[PythonProcessor] Failed to start process:`, err);
                reject(err);
              });

              pyProcess.on('close', (code) => {
                if (code === 0) {
                  console.log(`[PythonProcessor] Process completed successfully for: ${subDir}`);
                  processedCount++;
                  resolve();
                } else {
                  console.error(`[PythonProcessor] Process exited with code ${code} for: ${subDir}`);
                  reject(new Error(`Process exited with code ${code}`));
                }
              });
            });
          } catch (err) {
            console.error(`[PythonProcessor] Skipping ${subDir} due to an error:`, err);
            // Continue to the next folder instead of aborting the entire batch process
          }
        } else {
           console.log(`[PythonProcessor] Skipping ${subDir} (missing required song materials)`);
        }
      }

      return { success: true, output: `Successfully processed ${processedCount} song folder(s).` };

    } catch (error) {
      console.error('[PythonProcessor] Error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const pythonProcessorService = new PythonProcessorService();
