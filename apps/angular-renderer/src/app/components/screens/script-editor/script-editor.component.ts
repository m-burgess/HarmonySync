import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
    heroDocumentPlus,
    heroCheck,
    heroPlay,
    heroTrash,
    heroArrowUpTray,
    heroArrowDownTray,
    heroInformationCircle,
    heroXMark,
    heroCodeBracket
} from '@ng-icons/heroicons/outline';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { ElectronService } from '../../../core/electron.service';

interface Script {
    id: string;
    name: string;
    description?: string;
    author?: string;
    code?: string;
}

@Component({
    selector: 'app-script-editor',
    standalone: true,
    imports: [CommonModule, FormsModule, NgIconComponent, MonacoEditorModule],
    template: `
    <div class="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] select-none font-sans overflow-hidden">
        <!-- Header -->
        <div class="p-4 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between shadow-sm z-20">
            <div class="flex items-center space-x-2">
                <ng-icon name="heroCodeBracket" class="text-[#007acc] text-lg"></ng-icon>
                <h2 class="text-xs font-bold uppercase tracking-wider text-[#e1e1e1]">HarmonyScript</h2>
            </div>
            <div class="flex items-center space-x-2">
                <button (click)="handleSaveScript()" class="p-1.5 hover:bg-[#37373d] rounded text-[#858585] hover:text-white transition-all" title="Save Script">
                    <ng-icon name="heroCheck"></ng-icon>
                </button>
            </div>
        </div>

        <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Script Selection -->
            <div class="p-3 bg-[#252526] border-b border-[#333333]">
                <div class="flex flex-col space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] font-bold text-[#858585] uppercase">Active Script</span>
                        <div class="flex space-x-1">
                            <button (click)="handleNewScript()" class="text-[9px] text-blue-500 hover:underline">New</button>
                            <span class="text-[9px] text-gray-600">|</span>
                            <button (click)="handleImportScript()" class="text-[9px] text-blue-500 hover:underline">Import</button>
                        </div>
                    </div>
                    <select (change)="handleLoadScript($any($event.target).value)" 
                            class="w-full bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-2 py-1.5 rounded outline-none focus:border-[#007acc]">
                        <option value="">-- Select Script --</option>
                        @for (script of scripts(); track script.id) {
                            <option [value]="script.id" [selected]="currentScript?.id === script.id">{{ script.name }}</option>
                        }
                    </select>
                </div>
            </div>

            <!-- Editor Area -->
            <div class="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
                <!-- Metadata Controls (Compact) -->
                <div class="p-3 border-b border-[#333333] grid grid-cols-2 gap-3">
                    <div class="space-y-1">
                        <label class="text-[8px] font-bold text-[#858585] uppercase">Name</label>
                        <input type="text" [(ngModel)]="scriptName" 
                               class="w-full bg-[#2d2d2d] border border-[#444] text-[#e1e1e1] text-[10px] px-2 py-1 rounded outline-none">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[8px] font-bold text-[#858585] uppercase">Author</label>
                        <input type="text" [(ngModel)]="scriptAuthor" 
                               class="w-full bg-[#2d2d2d] border border-[#444] text-[#e1e1e1] text-[10px] px-2 py-1 rounded outline-none">
                    </div>
                </div>

                <!-- Monaco Editor (Flexible height) -->
                <div class="flex-1 relative border-b border-[#333333]">
                    <ngx-monaco-editor class="absolute inset-0"
                                      [options]="editorOptions" 
                                      [(ngModel)]="code">
                    </ngx-monaco-editor>
                </div>

                <!-- Actions & Output -->
                <div class="p-3 bg-[#111111] space-y-3">
                    <button (click)="handleExecuteScript()" [disabled]="isExecuting" 
                            class="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-[10px] font-bold py-2 rounded transition-all flex items-center justify-center">
                        <ng-icon [name]="isExecuting ? 'heroArrowPath' : 'heroPlay'" class="mr-2" [class.animate-spin]="isExecuting"></ng-icon> 
                        {{ isExecuting ? 'Running...' : 'Trigger Script' }}
                    </button>

                    @if (executionResult || validationResult) {
                        <div class="bg-black/40 p-2 rounded border border-white/5 font-mono text-[9px] max-h-32 overflow-auto custom-scrollbar">
                            @if (validationResult && !validationResult.valid) {
                                <div class="text-red-400 mb-1">✗ Validation: {{ validationResult.errors[0]?.message }}</div>
                            }
                            @if (executionResult) {
                                <div [class.text-green-400]="executionResult.success" [class.text-red-400]="!executionResult.success">
                                    {{ executionResult.success ? '✓ Success' : '✗ Error: ' + executionResult.error?.message }}
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>
        </div>

        <!-- Toggle Docs -->
        <div class="p-2 border-t border-[#333] flex justify-center">
            <button (click)="showApiDocs = !showApiDocs" class="text-[9px] text-[#858585] hover:text-white uppercase tracking-widest font-bold">
                {{ showApiDocs ? 'Hide docs' : 'Show docs' }}
            </button>
        </div>

        @if (showApiDocs) {
            <div class="h-40 bg-[#252526] border-t border-[#333] overflow-auto custom-scrollbar p-3 animate-in slide-in-from-bottom duration-200">
                <h3 class="text-[9px] font-bold text-[#007acc] uppercase mb-2">Harmony API</h3>
                <div class="space-y-3 text-[9px]">
                    <div>
                        <code class="text-amber-500">harmony.display.showSlide(content)</code>
                        <p class="text-[#858585] mt-0.5">Renders lyrics or content</p>
                    </div>
                    <div>
                        <code class="text-amber-500">harmony.midi.sendNote(note, vel)</code>
                        <p class="text-[#858585] mt-0.5">Triggers hardware</p>
                    </div>
                </div>
            </div>
        }
    </div>
  `,
    styles: [`
    .editor-btn {
        @apply flex items-center px-3 py-1.5 bg-[#333] hover:bg-[#444] text-[10px] font-bold text-[#cccccc] hover:text-white rounded border border-white/5 transition-all active:scale-95 disabled:opacity-50;
    }
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 10px;
    }
    `],
    providers: [
        provideIcons({
            heroDocumentPlus,
            heroCheck,
            heroPlay,
            heroTrash,
            heroArrowUpTray,
            heroArrowDownTray,
            heroInformationCircle,
            heroXMark,
            heroCodeBracket
        })
    ]
})
export class ScriptEditorComponent implements OnInit {
    private readonly electron = inject(ElectronService);

    scripts = signal<Script[]>([]);
    currentScript: Script | null = null;
    code = '';
    scriptName = '';
    scriptDescription = '';
    scriptAuthor = '';

    validationResult: any = null;
    executionResult: any = null;
    isExecuting = false;
    showApiDocs = true;

    editorOptions = {
        theme: 'vs-dark',
        language: 'javascript',
        minimap: { enabled: true },
        fontSize: 13,
        lineNumbers: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 10 }
    };

    ngOnInit() {
        this.loadScripts();
    }

    async loadScripts() {
        try {
            const result = await this.electron.invoke('script:getAll');
            this.scripts.set(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error('Failed to load scripts:', error);
        }
    }

    handleNewScript() {
        this.currentScript = null;
        this.code = `/**
 * @name New Script
 * @description Quick automation 
 * @author HarmonySync
 */

async function main() {
  // Use harmony.display, harmony.audio, etc.
  console.log("Script starting...");
  
  await harmony.display.showSlide({
    text: "Automation Active",
    background: "#007acc"
  });
}

main();`;
        this.scriptName = 'New Script';
        this.scriptAuthor = 'HarmonySync';
        this.validationResult = null;
        this.executionResult = null;
    }

    async handleLoadScript(id: string) {
        try {
            const script = await this.electron.invoke('script:get', id) as Script;
            this.currentScript = script;
            this.code = script.code || '';
            this.scriptName = script.name || '';
            this.scriptAuthor = script.author || '';
            this.validationResult = null;
            this.executionResult = null;
        } catch (error) {
            console.error('Failed to load script:', error);
        }
    }

    async handleSaveScript() {
        try {
            const data = {
                name: this.scriptName,
                author: this.scriptAuthor,
                code: this.code,
                description: this.scriptDescription
            };

            if (this.currentScript) {
                await this.electron.invoke('script:update', this.currentScript.id, data);
            } else {
                const newScript = await this.electron.invoke('script:create', data) as Script;
                this.currentScript = newScript;
            }
            await this.loadScripts();
            alert('Script saved successfully');
        } catch (error) {
            console.error('Failed to save script:', error);
        }
    }

    async handleExecuteScript() {
        this.isExecuting = true;
        this.executionResult = null;
        try {
            const validation = await this.electron.invoke('script:validate', this.code) as any;
            this.validationResult = validation;

            if (!validation.valid) {
                this.isExecuting = false;
                return;
            }

            const result = await this.electron.invoke('script:execute', this.code, { timeout: 10000 }) as any;
            this.executionResult = result;
        } catch (error) {
            this.executionResult = { success: false, error: { message: (error as Error).message } };
        } finally {
            this.isExecuting = false;
        }
    }

    async handleImportScript() {
        try {
            const importPath = await this.electron.invoke('dialog:openFile', {
                title: 'Import Script',
                filters: [{ name: 'JavaScript', extensions: ['js'] }]
            });

            if (importPath && (importPath as string[]).length > 0) {
                await this.electron.invoke('script:import', (importPath as string[])[0]);
                await this.loadScripts();
            }
        } catch (error) {
            console.error('Import failed:', error);
        }
    }

    close() {
        this.electron.send('close-script-editor');
    }
}
