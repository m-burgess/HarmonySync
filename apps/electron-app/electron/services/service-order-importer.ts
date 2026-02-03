/**
 * Service Order Importer
 * 
 * Handles:
 * - Scanning for zipped service orders
 * - Extracting zip files
 * - Parsing service structure
 * - Creating service order metadata
 * 
 * This replaces the need for a background folder-service
 * All import happens on-demand from the Electron app
 */

import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// ==================== Type Definitions ====================

export interface ServiceItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'song' | 'presentation' | 'video' | 'image';
  sortOrder: number;
  children?: ServiceItem[];
}

export interface ServiceOrderMetadata {
  id: string;
  name: string;
  path: string;
  items: ServiceItem[];
  extractedAt: Date;
  sourceZip?: string;
}

export interface ImportProgress {
  stage: 'scanning' | 'extracting' | 'parsing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
}

// ==================== Service Order Importer ====================

export class ServiceOrderImporter {
  private extractBaseFolder: string;

  constructor() {
    // Base folder for extracted services
    this.extractBaseFolder = path.join(
      os.homedir(),
      '.harmonysync',
      'imported-service-orders'
    );
    
    // Ensure folder exists
    fs.ensureDirSync(this.extractBaseFolder);
  }

  /**
   * Scan a folder for zipped service orders
   * @param folderPath - Path to scan
   * @returns Array of zip file paths
   */
  async scanFolderForZips(folderPath: string): Promise<string[]> {
    try {
      if (!fs.existsSync(folderPath)) {
        console.warn('Watch folder does not exist:', folderPath);
        return [];
      }

      const files = await fs.readdir(folderPath);
      const zipFiles = files
        .filter(f => f.toLowerCase().endsWith('.zip'))
        .map(f => path.join(folderPath, f));

      console.log(`📦 Found ${zipFiles.length} zip file(s) in watch folder`);
      return zipFiles;
    } catch (error) {
      console.error('Error scanning folder:', error);
      return [];
    }
  }

  /**
   * Extract a zip file to temp location
   * @param zipPath - Path to zip file
   * @returns Path to extracted contents
   */
  async extractZip(zipPath: string): Promise<string> {
    const serviceId = uuidv4();
    const extractPath = path.join(this.extractBaseFolder, serviceId);

    console.log(`📂 Extracting zip to: ${extractPath}`);

    try {
      await fs.ensureDir(extractPath);

      // Use adm-zip for extraction
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractPath, true);

      console.log('✅ Extraction complete');
      return extractPath;
    } catch (error) {
      console.error('❌ Extraction failed:', error);
      // Cleanup on failure
      await fs.remove(extractPath);
      throw new Error(`Failed to extract zip file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse a service order structure
   * @param extractPath - Path to extracted service order
   * @returns Service order metadata
   */
  async parseServiceOrder(extractPath: string): Promise<ServiceOrderMetadata> {
    try {
      const fileName = path.basename(extractPath);
      const items = await this.parseItems(extractPath);

      if (items.length === 0) {
        throw new Error('No service items found in extracted folder');
      }

      const metadata: ServiceOrderMetadata = {
        id: path.basename(extractPath), // Using folder name as ID
        name: fileName,
        path: extractPath,
        items: items,
        extractedAt: new Date()
      };

      console.log(`✅ Parsed service order: ${fileName} (${items.length} items)`);
      return metadata;
    } catch (error) {
      console.error('❌ Parsing failed:', error);
      throw new Error(`Failed to parse service order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse items in a service order folder
   * @param folderPath - Path to service order folder
   * @returns Sorted array of service items
   */
  private async parseItems(folderPath: string): Promise<ServiceItem[]> {
    const items: ServiceItem[] = [];

    try {
      // Handle nested folder structure
      let scanPath = folderPath;
      const rootContents = await fs.readdir(folderPath);

      // If single folder, assume that's the service root
      if (rootContents.length === 1) {
        const potentialRoot = path.join(folderPath, rootContents[0]);
        const stat = await fs.stat(potentialRoot);
        if (stat.isDirectory()) {
          scanPath = potentialRoot;
        }
      }

      // Read items
      const entries = await fs.readdir(scanPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const fullPath = path.join(scanPath, entry.name);
        const sortOrder = this.extractSortOrder(entry.name);
        const cleanName = this.cleanItemName(entry.name);
        const itemType = await this.detectItemType(fullPath);

        const item: ServiceItem = {
          id: uuidv4(),
          name: cleanName,
          path: fullPath,
          type: itemType,
          sortOrder: sortOrder
        };

        items.push(item);
      }

      // Sort by numeric order
      items.sort((a, b) => a.sortOrder - b.sortOrder);

      return items;
    } catch (error) {
      console.error('Error parsing items:', error);
      return [];
    }
  }

  /**
   * Extract sort order from folder name
   * Looks for pattern like "01 - Item Name" or "01-Item"
   * @param name - Folder name
   * @returns Numeric sort order (999 if not found)
   */
  private extractSortOrder(name: string): number {
    const match = name.match(/^(\d+)\s*[-–—]\s*/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 999; // Items without numeric prefix
  }

  /**
   * Clean item name by removing numeric prefix
   * @param name - Folder name
   * @returns Cleaned name
   */
  private cleanItemName(name: string): string {
    return name.replace(/^\d+\s*[-–—]\s*/, '').trim();
  }

  /**
   * Detect the type of service item
   * @param folderPath - Path to item folder
   * @returns Detected item type
   */
  private async detectItemType(folderPath: string): Promise<ServiceItem['type']> {
    try {
      const files = await fs.readdir(folderPath);
      
      // Check for various file types
      const audioExts = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];
      const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
      const presentationExts = ['.pptx', '.odp', '.pdf', '.ppt'];
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'];

      let hasAudio = false;
      let hasVideo = false;
      let hasPresentation = false;
      let hasImage = false;

      for (const file of files) {
        const lower = file.toLowerCase();
        if (audioExts.some(ext => lower.endsWith(ext))) hasAudio = true;
        if (videoExts.some(ext => lower.endsWith(ext))) hasVideo = true;
        if (presentationExts.some(ext => lower.endsWith(ext))) hasPresentation = true;
        if (imageExts.some(ext => lower.endsWith(ext))) hasImage = true;
      }

      // Determine primary type
      if (hasAudio) return 'song';
      if (hasPresentation) return 'presentation';
      if (hasVideo) return 'video';
      if (hasImage) return 'image';
      
      return 'folder'; // Default
    } catch {
      return 'folder';
    }
  }

  /**
   * Validate service order structure
   * @param metadata - Service order metadata
   * @returns Validation result
   */
  validateServiceOrder(metadata: ServiceOrderMetadata): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate items count
    if (metadata.items.length === 0) {
      errors.push('No service items found');
    }

    // Check for required first item (announcements)
    const firstItem = metadata.items[0];
    if (firstItem?.name.toLowerCase().includes('announce')) {
      // Expected pattern
    } else {
      warnings.push('First item should be "Announcements"');
    }

    // Check for songs
    const hasSongs = metadata.items.some(item => item.type === 'song');
    if (!hasSongs) {
      warnings.push('No songs found in service order');
    }

    // Check for sermon
    const hasSermon = metadata.items.some(item => 
      item.name.toLowerCase().includes('sermon')
    );
    if (!hasSermon) {
      warnings.push('No sermon found in service order');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Delete an imported service order
   * @param serviceId - Service ID to delete
   */
  async deleteServiceOrder(serviceId: string): Promise<void> {
    const servicePath = path.join(this.extractBaseFolder, serviceId);
    
    try {
      await fs.remove(servicePath);
      console.log(`🗑️  Deleted service order: ${serviceId}`);
    } catch (error) {
      console.error('Error deleting service order:', error);
      throw new Error(`Failed to delete service order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all imported service orders
   * @returns Array of service order metadata
   */
  async listImportedServices(): Promise<ServiceOrderMetadata[]> {
    try {
      if (!fs.existsSync(this.extractBaseFolder)) {
        return [];
      }

      const entries = await fs.readdir(this.extractBaseFolder, { withFileTypes: true });
      const services: ServiceOrderMetadata[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const servicePath = path.join(this.extractBaseFolder, entry.name);
        try {
          const items = await this.parseItems(servicePath);
          if (items.length > 0) {
            services.push({
              id: entry.name,
              name: entry.name,
              path: servicePath,
              items: items,
              extractedAt: new Date() // Approximate
            });
          }
        } catch (error) {
          console.error(`Failed to load service ${entry.name}:`, error);
        }
      }

      return services;
    } catch (error) {
      console.error('Error listing services:', error);
      return [];
    }
  }

  /**
   * Get a specific service order
   * @param serviceId - Service ID
   * @returns Service order metadata or null
   */
  async getServiceOrder(serviceId: string): Promise<ServiceOrderMetadata | null> {
    const servicePath = path.join(this.extractBaseFolder, serviceId);

    try {
      if (!fs.existsSync(servicePath)) {
        return null;
      }

      const items = await this.parseItems(servicePath);
      return {
        id: serviceId,
        name: serviceId,
        path: servicePath,
        items: items,
        extractedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting service:', error);
      return null;
    }
  }

  /**
   * Clean up old extracted services
   * @param maxAge - Max age in milliseconds
   */
  async cleanupOldServices(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const services = await this.listImportedServices();
      let deletedCount = 0;
      const now = Date.now();

      for (const service of services) {
        const age = now - service.extractedAt.getTime();
        if (age > maxAge) {
          await this.deleteServiceOrder(service.id);
          deletedCount++;
        }
      }

      console.log(`🧹 Cleaned up ${deletedCount} old service orders`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up services:', error);
      return 0;
    }
  }
}

export default ServiceOrderImporter;
