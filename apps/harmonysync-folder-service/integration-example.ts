/**
 * Electron IPC Handlers for Folder Service Integration
 * 
 * This file demonstrates how to integrate the folder-service
 * with the main Electron application.
 * 
 * Add these handlers to your electron/main.ts or electron/ipc-handlers.ts
 */

import { ipcMain } from 'electron';
import { FolderServiceClient, ExtractedService } from '../harmonysync-folder-service/client';

// Initialize the folder service client
const folderServiceClient = new FolderServiceClient();

// ==================== Service Lifecycle ====================

/**
 * Initialize folder service connection
 * Call this during app startup
 */
export async function initializeFolderService(): Promise<void> {
  try {
    await folderServiceClient.connect();
    console.log('✅ Folder service connected');

    // Set up event listeners
    setupFolderServiceListeners();
  } catch (error) {
    console.error('❌ Failed to connect to folder service:', error);
    // Service might not be running, which is okay
  }
}

/**
 * Set up folder service event listeners
 */
function setupFolderServiceListeners(): void {
  // When a new service is detected
  folderServiceClient.on('service-detected', (data) => {
    console.log('📦 New service detected:', data.path);
    // Notify renderer process
    // BrowserWindow.webContents.send('folder-service:detected', data);
  });

  // When a service is extracted
  folderServiceClient.on('service-extracted', (service) => {
    console.log('✅ Service extracted:', service.name);
    // Notify renderer process
    // BrowserWindow.webContents.send('folder-service:extracted', service);
  });

  // When a service import is requested
  folderServiceClient.on('service-import-request', (service) => {
    console.log('📥 Import requested:', service.name);
    handleServiceImport(service);
  });

  // When an error occurs
  folderServiceClient.on('service-error', (data) => {
    console.error('❌ Folder service error:', data);
    // Notify renderer process
    // BrowserWindow.webContents.send('folder-service:error', data);
  });
}

/**
 * Handle importing a service into the main application
 */
async function handleServiceImport(service: ExtractedService): Promise<void> {
  try {
    console.log(`📥 Importing service: ${service.name}`);
    
    // Convert extracted service to ServiceOrder format
    const serviceOrderItems = service.items.map(item => ({
      id: item.id,
      name: item.name,
      path: item.path,
      type: item.type,
      sortOrder: item.sortOrder
    }));

    // Here you would call your existing service order loading logic
    // For example:
    // await serviceOrderService.loadServiceOrder(service.path);
    // or
    // eventEmitter.emit('service-order:imported', { serviceOrder: serviceOrderItems });
    
    console.log(`✅ Service imported with ${serviceOrderItems.length} items`);
    
    // Notify renderer to update UI
    // BrowserWindow.webContents.send('service-order:imported', {
    //   serviceOrder: serviceOrderItems
    // });
    
  } catch (error) {
    console.error('❌ Error importing service:', error);
  }
}

// ==================== IPC Handlers ====================

/**
 * Register all folder service IPC handlers
 */
export function registerFolderServiceHandlers(): void {
  
  // Get folder service health
  ipcMain.handle('folder-service:health', async () => {
    try {
      return await folderServiceClient.getHealth();
    } catch (error) {
      throw new Error(`Failed to get health: ${error}`);
    }
  });

  // Get configuration
  ipcMain.handle('folder-service:get-config', async () => {
    try {
      return await folderServiceClient.getConfig();
    } catch (error) {
      throw new Error(`Failed to get config: ${error}`);
    }
  });

  // Update configuration
  ipcMain.handle('folder-service:update-config', async (_event, config) => {
    try {
      return await folderServiceClient.updateConfig(config);
    } catch (error) {
      throw new Error(`Failed to update config: ${error}`);
    }
  });

  // List all extracted services
  ipcMain.handle('folder-service:list-services', async () => {
    try {
      return await folderServiceClient.listServices();
    } catch (error) {
      throw new Error(`Failed to list services: ${error}`);
    }
  });

  // Get service details
  ipcMain.handle('folder-service:get-service', async (_event, serviceId: string) => {
    try {
      return await folderServiceClient.getService(serviceId);
    } catch (error) {
      throw new Error(`Failed to get service: ${error}`);
    }
  });

  // Import a service
  ipcMain.handle('folder-service:import-service', async (_event, serviceId: string) => {
    try {
      return await folderServiceClient.importService(serviceId);
    } catch (error) {
      throw new Error(`Failed to import service: ${error}`);
    }
  });

  // Delete a service
  ipcMain.handle('folder-service:delete-service', async (_event, serviceId: string) => {
    try {
      return await folderServiceClient.deleteService(serviceId);
    } catch (error) {
      throw new Error(`Failed to delete service: ${error}`);
    }
  });

  // Check if connected
  ipcMain.handle('folder-service:is-connected', async () => {
    return folderServiceClient.isConnected();
  });
}

// ==================== Cleanup ====================

/**
 * Clean up folder service connection
 * Call this during app shutdown
 */
export function cleanupFolderService(): void {
  folderServiceClient.disconnect();
  console.log('🛑 Folder service disconnected');
}

// ==================== Usage Example ====================

/*
In your main electron/main.ts file:

import { app, BrowserWindow } from 'electron';
import { 
  initializeFolderService, 
  registerFolderServiceHandlers,
  cleanupFolderService 
} from './folder-service-integration';

app.whenReady().then(async () => {
  // Register IPC handlers
  registerFolderServiceHandlers();
  
  // Initialize folder service
  await initializeFolderService();
  
  // Create window, etc.
  createWindow();
});

app.on('before-quit', () => {
  cleanupFolderService();
});

*/
