import { Injectable, inject } from '@angular/core';
import { ElectronService } from './electron.service';
import { FileSelectionResult, FolderSelectionResult } from '../models/file.models';
import { from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class FileService {
    private readonly electron = inject(ElectronService);

    /**
     * Open folder selection dialog
     * @param title - Dialog title
     */
    selectFolder(title: string = 'Select Folder'): Observable<FolderSelectionResult> {
        return from(this.electron.invoke('dialog:openDirectory', { title })).pipe(
            map(res => (res as FolderSelectionResult) || { canceled: true, filePaths: [] }),
            catchError(err => {
                console.error('FileService.selectFolder failed:', err);
                return of({ canceled: true, filePaths: [] } as FolderSelectionResult);
            })
        );
    }

    /**
     * Open file selection dialog
     * @param title - Dialog title
     * @param filters - File type filters
     */
    selectFile(
        title: string = 'Select File',
        filters: Array<{ name: string; extensions: string[] }> = []
    ): Observable<FileSelectionResult> {
        return from(this.electron.invoke('dialog:openFile', { title, filters })).pipe(
            map(res => (res as FileSelectionResult) || { canceled: true, filePaths: [] }),
            catchError(err => {
                console.error('FileService.selectFile failed:', err);
                return of({ canceled: true, filePaths: [] } as FileSelectionResult);
            })
        );
    }

    /**
     * Read text file contents
     * @param filePath - File path
     */
    readTextFile(filePath: string): Observable<string> {
        return from(this.electron.invoke('fs:readFile', filePath, 'utf8')).pipe(
            map(res => res as string),
            catchError(err => {
                console.error('FileService.readTextFile failed:', err);
                return of('');
            })
        );
    }

    /**
     * Write text file contents
     * @param filePath - File path
     * @param content - Text contents
     */
    writeTextFile(filePath: string, content: string): Observable<void> {
        return from(this.electron.invoke('fs:writeFile', filePath, content, 'utf8')).pipe(
            map(() => void 0),
            catchError(err => {
                console.error('FileService.writeTextFile failed:', err);
                return of(void 0);
            })
        );
    }

    /**
     * Check if file or folder exists
     * @param filePath - File or folder path
     */
    exists(filePath: string): Observable<boolean> {
        return from(this.electron.invoke('fs:exists', filePath)).pipe(
            map(res => res as boolean),
            catchError(() => of(false))
        );
    }

    /**
     * Get audio files from a folder
     * @param folderPath - Folder path
     */
    getAudioFiles(folderPath: string): Observable<string[]> {
        return from(this.electron.invoke('fs:getAudioFiles', folderPath)).pipe(
            map(res => res as string[]),
            catchError(() => of([]))
        );
    }

    /**
     * Get slide files from a folder
     * @param folderPath - Folder path
     */
    getSlideFiles(folderPath: string): Observable<string[]> {
        return from(this.electron.invoke('fs:getSlideFiles', folderPath)).pipe(
            map(res => res as string[]),
            catchError(() => of([]))
        );
    }

    /**
     * Get folder selection dialog for multiple folders
     * @param title - Dialog title
     */
    selectFolders(title: string = 'Select Folders'): Observable<string[] | null> {
        return from(this.electron.invoke('dialog:selectFolders', { title })).pipe(
            map(res => {
                const result = res as FolderSelectionResult;
                return result?.canceled ? null : (result?.filePaths || null);
            }),
            catchError(err => {
                console.error('FileService.selectFolders failed:', err);
                return of(null);
            })
        );
    }

    /**
     * Read directory contents
     * @param folderPath - Folder path
     */
    readDir(folderPath: string): Observable<string[]> {
        return from(this.electron.invoke('fs:readDir', folderPath)).pipe(
            map(res => res as string[]),
            catchError(err => {
                console.error('FileService.readDir failed:', err);
                return of([]);
            })
        );
    }
}
