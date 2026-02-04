/**
 * JSON File Storage Provider
 * 
 * Implements storage using JSON files on disk
 */

import { promises as fs } from 'fs';
import path from 'path';
import { IStorageProvider } from './interfaces';

export class JsonStorageProvider implements IStorageProvider {
  private basePath: string;
  private initialized: boolean = false;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure base directory exists
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      this.initialized = true;
    } catch (error: any) {
      throw new Error(`Failed to initialize JSON storage: ${error.message}`);
    }
  }

  async read<T = any>(collection: string): Promise<T[]> {
    await this.ensureInitialized();
    
    const filePath = this.getCollectionPath(collection);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty array
        return [];
      }
      throw new Error(`Failed to read collection ${collection}: ${error.message}`);
    }
  }

  async write<T = any>(collection: string, data: T[]): Promise<void> {
    await this.ensureInitialized();
    
    const filePath = this.getCollectionPath(collection);
    
    try {
      const json = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, json, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to write collection ${collection}: ${error.message}`);
    }
  }

  async exists(collection: string): Promise<boolean> {
    await this.ensureInitialized();
    
    const filePath = this.getCollectionPath(collection);
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteCollection(collection: string): Promise<void> {
    await this.ensureInitialized();
    
    const filePath = this.getCollectionPath(collection);
    
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to delete collection ${collection}: ${error.message}`);
      }
    }
  }

  async listCollections(): Promise<string[]> {
    await this.ensureInitialized();
    
    try {
      const files = await fs.readdir(this.basePath);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error: any) {
      throw new Error(`Failed to list collections: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    // No cleanup needed for JSON file storage
    this.initialized = false;
  }

  private getCollectionPath(collection: string): string {
    return path.join(this.basePath, `${collection}.json`);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}
