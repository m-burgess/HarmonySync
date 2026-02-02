/**
 * Folder Service Client
 * Client library for Electron app to communicate with the folder-service microservice
 */

import { io, Socket } from 'socket.io-client';
import axios, { AxiosInstance } from 'axios';

// ==================== Type Definitions ====================

export interface FolderServiceConfig {
  watchFolder: string | null;
  extractFolder: string;
  autoDelete: boolean;
  port: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'song' | 'presentation';
  sortOrder: number;
  children?: ServiceItem[];
}

export interface ExtractedService {
  id: string;
  name: string;
  path: string;
  items: ServiceItem[];
  extractedAt: Date;
  sourceZip: string;
}

export interface ServiceSummary {
  id: string;
  name: string;
  path: string;
  itemCount: number;
  extractedAt: Date;
}

// ==================== Event Types ====================

export interface FolderServiceEvents {
  'config-updated': (config: FolderServiceConfig) => void;
  'service-detected': (data: { path: string }) => void;
  'service-extracted': (service: ExtractedService) => void;
  'service-import-request': (service: ExtractedService) => void;
  'service-deleted': (data: { id: string }) => void;
  'service-error': (data: { error: string; path?: string }) => void;
}

// ==================== Folder Service Client Class ====================

export class FolderServiceClient {
  private baseUrl: string;
  private http: AxiosInstance;
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(host: string = '127.0.0.1', port: number = 3005) {
    this.baseUrl = `http://${host}:${port}`;
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
  }

  // ==================== Connection Management ====================

  /**
   * Connect to the folder service via Socket.IO
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.baseUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to folder service');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Disconnected from folder service');
      });

      // Set up event forwarding
      this.setupEventForwarding();
    });
  }

  /**
   * Disconnect from the folder service
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ==================== Event Handling ====================

  private setupEventForwarding(): void {
    if (!this.socket) return;

    const events: (keyof FolderServiceEvents)[] = [
      'config-updated',
      'service-detected',
      'service-extracted',
      'service-import-request',
      'service-deleted',
      'service-error'
    ];

    events.forEach(event => {
      this.socket!.on(event, (data: any) => {
        this.emit(event, data);
      });
    });
  }

  /**
   * Register event listener
   */
  public on<K extends keyof FolderServiceEvents>(
    event: K,
    handler: FolderServiceEvents[K]
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof FolderServiceEvents>(
    event: K,
    handler: FolderServiceEvents[K]
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // ==================== API Methods ====================

  /**
   * Get service health status
   */
  public async getHealth(): Promise<{
    status: string;
    service: string;
    version: string;
    watching: boolean;
    servicesCount: number;
  }> {
    const response = await this.http.get('/health');
    return response.data;
  }

  /**
   * Get current configuration
   */
  public async getConfig(): Promise<FolderServiceConfig> {
    const response = await this.http.get<FolderServiceConfig>('/config');
    return response.data;
  }

  /**
   * Update configuration
   */
  public async updateConfig(
    updates: Partial<FolderServiceConfig>
  ): Promise<{ success: boolean; config: FolderServiceConfig }> {
    const response = await this.http.post('/config', updates);
    return response.data;
  }

  /**
   * List all extracted services
   */
  public async listServices(): Promise<ServiceSummary[]> {
    const response = await this.http.get<ServiceSummary[]>('/services');
    return response.data;
  }

  /**
   * Get detailed service information
   */
  public async getService(serviceId: string): Promise<ExtractedService> {
    const response = await this.http.get<ExtractedService>(`/services/${serviceId}`);
    return response.data;
  }

  /**
   * Request to import a service
   */
  public async importService(serviceId: string): Promise<{
    success: boolean;
    message: string;
    service: { id: string; name: string };
  }> {
    const response = await this.http.post(`/import/${serviceId}`);
    return response.data;
  }

  /**
   * Delete an extracted service
   */
  public async deleteService(serviceId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await this.http.delete(`/services/${serviceId}`);
    return response.data;
  }

  // ==================== Socket.IO Commands ====================

  /**
   * Send configuration update via Socket.IO
   */
  public sendConfigUpdate(config: Partial<FolderServiceConfig>): void {
    if (this.socket?.connected) {
      this.socket.emit('configure', config);
    }
  }

  /**
   * Request service import via Socket.IO
   */
  public requestImport(serviceId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('import-service', serviceId);
    }
  }
}

// ==================== Singleton Export ====================

let clientInstance: FolderServiceClient | null = null;

/**
 * Get or create the folder service client singleton
 */
export function getFolderServiceClient(
  host?: string,
  port?: number
): FolderServiceClient {
  if (!clientInstance) {
    clientInstance = new FolderServiceClient(host, port);
  }
  return clientInstance;
}

export default FolderServiceClient;
