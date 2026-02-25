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
    <div class="fixed inset-0 bg-[#0a0a0a]/90 backdrop-blur-md z-50 flex flex-col animate-in fade-in duration-300">
        <!-- Header -->
        <div class="h-12 bg-[#1e1e1e] border-b border-[#333333] flex items-center justify-between px-6 shadow-lg">
            <div class="flex items-center space-x-3">
                <ng-icon name="heroCodeBracket" class="text-[#007acc] text-xl"></ng-icon>
                <h2 class="text-xs font-bold uppercase tracking-widest text-[#e1e1e1]">HarmonyScript Engine</h2>
            </div>
            
            <div class="flex items-center space-x-2">
                <button (click)="handleNewScript()" class="editor-btn">
                    <ng-icon name="heroDocumentPlus" class="mr-1.5"></ng-icon> New
                </button>
                <button (click)="handleSaveScript()" class="editor-btn">
                    <ng-icon name="heroCheck" class="mr-1.5"></ng-icon> Save
                </button>
                <button (click)="handleExecuteScript()" [disabled]="isExecuting" class="editor-btn bg-green-600 hover:bg-green-700 border-green-500">
                    <ng-icon [name]="isExecuting ? 'heroArrowPath' : 'heroPlay'" class="mr-1.5" [class.animate-spin]="isExecuting"></ng-icon> 
                    {{ isExecuting ? 'Running...' : 'Test Run' }}
                </button>
                <div class="w-px h-4 bg-[#333] mx-2"></div>
                <button (click)="close()" class="text-[#858585] hover:text-white p-1.5 hover:bg-[#333] rounded transition-all">
                    <ng-icon name="heroXMark" class="text-lg"></ng-icon>
                </button>
            </div>
        </div>

        <div class="flex-1 flex overflow-hidden">
            <!-- Sidebar: Script List -->
            <div class="w-64 bg-[#1e1e1e] border-r border-[#333333] flex flex-col">
                <div class="p-3 border-b border-[#333333] flex items-center justify-between">
                    <span class="text-[10px] font-bold text-[#858585] uppercase tracking-tighter">Scripts Library</span>
                    <button (click)="handleImportScript()" title="Import Script" class="text-[#858585] hover:text-white">
                        <ng-icon name="heroArrowDownTray"></ng-icon>
                    </button>
                </div>
                <div class="flex-1 overflow-auto custom-scrollbar p-2 space-y-1">
                    @for (script of scripts(); track script.id) {
                        <div (click)="handleLoadScript(script.id)" 
                             [class.bg-[#37373d]]="currentScript?.id === script.id"
                             class="group p-2.5 rounded hover:bg-[#2a2d2e] cursor-pointer transition-all border border-transparent hover:border-[#3c3c3c]">
                            <div class="text-[11px] font-bold text-[#cccccc] group-hover:text-white">{{ script.name }}</div>
                            <div class="text-[9px] text-[#858585] truncate">{{ script.description || 'No description' }}</div>
                        </div>
                    }
                </div>
            </div>

            <!-- Main: Editor -->
            <div class="flex-1 flex flex-col bg-[#1e1e1e]">
                <!-- Metadata Inputs -->
                <div class="p-4 bg-[#252526] border-b border-[#333333] flex gap-4">
                    <div class="flex-1 space-y-1">
                        <label class="text-[9px] font-bold text-[#858585] uppercase">Script Name</label>
                        <input type="text" [(ngModel)]="scriptName" 
                               class="w-full bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-3 py-1.5 rounded outline-none focus:border-[#007acc]">
                    </div>
                    <div class="flex-1 space-y-1">
                        <label class="text-[9px] font-bold text-[#858585] uppercase">Author</label>
                        <input type="text" [(ngModel)]="scriptAuthor" 
                               class="w-full bg-[#3c3c3c] border border-[#444444] text-[#e1e1e1] text-xs px-3 py-1.5 rounded outline-none focus:border-[#007acc]">
                    </div>
                </div>

                <!-- Monaco Instance -->
                <div class="flex-1 relative">
                    <ngx-monaco-editor class="absolute inset-0"
                                      [options]="editorOptions" 
                                      [(ngModel)]="code">
                    </ngx-monaco-editor>
                </div>

                <!-- Status Console -->
                @if (executionResult || validationResult) {
                    <div class="h-40 bg-[#111] border-t border-[#333] overflow-auto p-4 font-mono text-[11px]">
                        @if (validationResult) {
                            <div [class.text-green-400]="validationResult.valid" [class.text-red-400]="!validationResult.valid">
                                [VALIDATION] {{ validationResult.valid ? '✓ Passed' : '✗ Failed: ' + validationResult.errors[0]?.message }}
                            </div>
                        }
                        @if (executionResult) {
                            <div [class.text-green-400]="executionResult.success" [class.text-red-400]="!executionResult.success" class="mt-2">
                                [EXECUTION] {{ executionResult.success ? '✓ Completed' : '✗ Error: ' + executionResult.error?.message }}
                                @if (executionResult.result) {
                                    <pre class="mt-1 text-[#aaa]">{{ executionResult.result | json }}</pre>
                                }
                            </div>
                        }
                    </div>
                }
            </div>

            <!-- Sidebar: API Reference -->
            @if (showApiDocs) {
                <div class="w-72 bg-[#1e1e1e] border-l border-[#333333] overflow-auto custom-scrollbar p-6">
                    <h3 class="text-xs font-bold text-[#007acc] uppercase mb-4">API Documentation</h3>
                    <div class="space-y-6">
                        <section>
                            <h4 class="text-[10px] font-bold text-[#cccccc] mb-2 uppercase">harmony.display</h4>
                            <ul class="text-[10px] text-[#858585] space-y-2">
                                <li><code class="text-amber-500">showSlide(content)</code><br>Renders lyrics or content</li>
                                <li><code class="text-amber-500">clearAll()</code><br>Clears all active projections</li>
                            </ul>
                        </section>
                        <section>
                            <h4 class="text-[10px] font-bold text-[#cccccc] mb-2 uppercase">harmony.midi</h4>
                            <ul class="text-[10px] text-[#858585] space-y-2">
                                <li><code class="text-amber-500">sendNote(note, vel)</code><br>Triggers external hardware</li>
                            </ul>
                        </section>
                    </div>
                </div>
            }
        </div>
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
