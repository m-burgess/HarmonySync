/**
 * File selection result
 */
export interface FileSelectionResult {
    canceled: boolean;
    filePaths: string[];
}

/**
 * Folder selection result
 */
export interface FolderSelectionResult {
    canceled: boolean;
    filePaths: string[];
}
