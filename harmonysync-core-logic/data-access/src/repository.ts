/**
 * Generic Repository Implementation
 * 
 * Provides CRUD operations for any entity type
 */

import { IRepository, IStorageProvider } from './interfaces';
import { v4 as uuidv4 } from 'uuid';

export class Repository<T extends { id: string }> implements IRepository<T> {
  private collection: string;
  private storage: IStorageProvider;

  constructor(collection: string, storage: IStorageProvider) {
    this.collection = collection;
    this.storage = storage;
  }

  async getById(id: string): Promise<T | null> {
    const items = await this.storage.read<T>(this.collection);
    return items.find(item => item.id === id) || null;
  }

  async getAll(): Promise<T[]> {
    return this.storage.read<T>(this.collection);
  }

  async query(predicate: (item: T) => boolean): Promise<T[]> {
    const items = await this.storage.read<T>(this.collection);
    return items.filter(predicate);
  }

  async create(data: Omit<T, 'id'> & { id?: string }): Promise<string> {
    const items = await this.storage.read<T>(this.collection);
    
    const id = data.id || uuidv4();
    const newItem = { ...data, id } as T;
    
    // Check for duplicate ID
    if (items.some(item => item.id === id)) {
      throw new Error(`Entity with id ${id} already exists in ${this.collection}`);
    }
    
    items.push(newItem);
    await this.storage.write(this.collection, items);
    
    return id;
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const items = await this.storage.read<T>(this.collection);
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Entity with id ${id} not found in ${this.collection}`);
    }
    
    items[index] = { ...items[index], ...data, id }; // Ensure ID doesn't change
    await this.storage.write(this.collection, items);
  }

  async delete(id: string): Promise<boolean> {
    const items = await this.storage.read<T>(this.collection);
    const initialLength = items.length;
    const filtered = items.filter(item => item.id !== id);
    
    if (filtered.length === initialLength) {
      return false; // Item not found
    }
    
    await this.storage.write(this.collection, filtered);
    return true;
  }

  async exists(id: string): Promise<boolean> {
    const item = await this.getById(id);
    return item !== null;
  }

  async count(predicate?: (item: T) => boolean): Promise<number> {
    const items = await this.storage.read<T>(this.collection);
    if (predicate) {
      return items.filter(predicate).length;
    }
    return items.length;
  }
}
