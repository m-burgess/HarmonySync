import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../../core/electron.service';
import { Slide } from '../../../models/slide.models';

export interface SlideImportProgress {
    message: string;
    current?: number;
    total?: number;
}

export interface SlideImportOptions {
    dpi: number;
    format: 'png' | 'jpeg';
    deleteZip?: boolean;
    importSlidesOnly?: boolean;
}

@Component({
    selector: 'app-slide-import-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './slide-import-modal.component.html',
    styleUrl: './slide-import-modal.component.scss'
})
export class SlideImportModalComponent implements OnInit, OnDestroy {
    @Input() isOpen = false;
    @Output() onClose = new EventEmitter<void>();
    @Output() onSlidesImported = new EventEmitter<Slide[]>();

    importType: 'pdf' | 'powerpoint' | 'folder' | 'zip' = 'pdf';
    selectedPath: string | null = null;
    isImporting = false;
    progress: SlideImportProgress | null = null;
    error: string | null = null;

    importOptions: SlideImportOptions = {
        dpi: 150,
        format: 'png',
        deleteZip: true,
        importSlidesOnly: false
    };

    private unlisteners: (() => void)[] = [];

    constructor(private electronService: ElectronService) { }

    ngOnInit() {
        const unlisten = this.electronService.on('slides-import-progress', (data: any) => {
            this.progress = data;
        });
        if (unlisten) this.unlisteners.push(unlisten);
    }

    ngOnDestroy() {
        this.unlisteners.forEach(u => u());
    }

    setImportType(type: 'pdf' | 'powerpoint' | 'folder' | 'zip') {
        this.importType = type;
        this.selectedPath = null;
        this.error = null;
    }

    async browse() {
        try {
            let result;
            if (this.importType === 'folder') {
                result = await this.electronService.invoke('open-directory', { multiple: false });
            } else {
                let filters = [];
                if (this.importType === 'pdf') filters = [{ name: 'PDF Files', extensions: ['pdf'] }];
                else if (this.importType === 'zip') filters = [{ name: 'Zip Files', extensions: ['zip'] }];
                else filters = [{ name: 'PowerPoint Files', extensions: ['pptx', 'ppt'] }];

                result = await this.electronService.invoke('open-file', filters);
            }

            if (result) {
                this.selectedPath = Array.isArray(result) ? result[0] : result;
                this.error = null;
            }
        } catch (err: any) {
            this.error = `Failed to select path: ${err.message || err}`;
        }
    }

    async handleImport() {
        if (!this.selectedPath) return;

        this.isImporting = true;
        this.error = null;
        this.progress = null;

        try {
            let slides: any[] = [];

            if (this.importType === 'folder') {
                slides = await this.electronService.invoke('import-slides-from-folder', this.selectedPath, this.importOptions);
            } else if (this.importType === 'pdf') {
                slides = await this.electronService.invoke('import-pdf-slides', this.selectedPath, this.importOptions);
            } else if (this.importType === 'powerpoint') {
                slides = await this.electronService.invoke('import-powerpoint-slides', this.selectedPath, this.importOptions);
            } else if (this.importType === 'zip') {
                const result = await this.electronService.invoke('import-slides-from-zip', this.selectedPath, this.importOptions);
                slides = result.slides || [];
                // Handle full service import if needed
            }

            if (slides && slides.length > 0) {
                this.onSlidesImported.emit(slides);
                this.close();
            } else {
                this.error = 'No slides were imported.';
            }
        } catch (err: any) {
            this.error = `Import failed: ${err.message || err}`;
        } finally {
            this.isImporting = false;
            this.progress = null;
        }
    }

    close() {
        if (this.isImporting) return;
        this.onClose.emit();
    }
}
