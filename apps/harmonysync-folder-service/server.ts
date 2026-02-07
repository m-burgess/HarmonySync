import express, { Request, Response, Application } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chokidar from 'chokidar';
import unzipper from 'unzipper';
import { v4 as uuidv4 } from 'uuid';

// ==================== Configuration ====================

const PORT: number = parseInt(process.env.PORT || '3005', 10);
const HOST: string = process.env.HOST || '127.0.0.1';
const CONFIG_DIR: string = path.join(os.homedir(), '.harmonysync');
const CONFIG_PATH: string = process.env.CONFIG_PATH || path.join(CONFIG_DIR, 'folder-service-config.json');

interface ServiceConfig {
  watchFolder: string | null;
  extractFolder: string;
  autoDelete: boolean;
  port: number;
}

const DEFAULT_CONFIG: ServiceConfig = {
  watchFolder: null,
  extractFolder: path.join(CONFIG_DIR, 'imported-services'),
  autoDelete: true,
  port: PORT
};
const IS_TEST_ENV: boolean = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
let isShuttingDown = false;

// ==================== Type Definitions ====================

interface ServiceItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'song' | 'presentation';
  sortOrder: number;
  children?: ServiceItem[];
}

interface ExtractedService {
  id: string;
  name: string;
  path: string;
  items: ServiceItem[];
  extractedAt: Date;
  sourceZip: string;
}

// ==================== Folder Service Class ====================

class FolderService {
  private app: Application;
  private server: http.Server;
  private io: SocketIOServer;
  private config: ServiceConfig;
  private watcher: chokidar.FSWatcher | null = null;
  private extractedServices: Map<string, ExtractedService> = new Map();
  private processingQueue: Set<string> = new Set();

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.config = this.loadConfig();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.initializeService();
  }

  // ==================== Configuration Management ====================

  private loadConfig(): ServiceConfig {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const configData = fs.readJsonSync(CONFIG_PATH);
        console.log('✅ Configuration loaded from:', CONFIG_PATH);
        return { ...DEFAULT_CONFIG, ...configData };
      }
    } catch (error) {
      console.error('⚠️  Error loading config, using defaults:', error);
    }
    return { ...DEFAULT_CONFIG };
  }

  private saveConfig(): void {
    try {
      fs.ensureDirSync(CONFIG_DIR);
      fs.writeJsonSync(CONFIG_PATH, this.config, { spaces: 2 });
      console.log('✅ Configuration saved to:', CONFIG_PATH);
    } catch (error) {
      console.error('❌ Error saving config:', error);
    }
  }

  // ==================== Service Initialization ====================

  private async initializeService(): Promise<void> {
    console.log('🚀 Initializing HarmonySync Folder Service...');
    
    // Ensure extract folder exists
    fs.ensureDirSync(this.config.extractFolder);
    
    // Load existing extracted services
    await this.loadExistingServices();
    
    // Start watching if folder is configured
    if (this.config.watchFolder) {
      this.startWatching();
    } else {
      console.log('⚠️  No watch folder configured. Use POST /config to set one.');
    }
  }

  // ==================== Middleware Setup ====================

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, _res, next) => {
      console.log(`📥 ${req.method} ${req.path}`);
      next();
    });
  }

  // ==================== API Routes ====================

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ 
        status: 'healthy', 
        service: 'harmonysync-folder-service',
        version: '1.0.0',
        watching: this.config.watchFolder !== null,
        servicesCount: this.extractedServices.size
      });
    });

    // Get configuration
    this.app.get('/config', (_req: Request, res: Response) => {
      res.json(this.config);
    });

    // Update configuration
    this.app.post('/config', async (req: Request, res: Response) => {
      try {
        const updates: Partial<ServiceConfig> = req.body;
        
        // Validate watch folder if provided
        if (updates.watchFolder !== undefined) {
          if (updates.watchFolder !== null && !fs.existsSync(updates.watchFolder)) {
            return res.status(400).json({ 
              error: 'Watch folder does not exist',
              path: updates.watchFolder 
            });
          }
        }

        // Update config
        const oldWatchFolder = this.config.watchFolder;
        this.config = { ...this.config, ...updates };
        this.saveConfig();

        // Restart watcher if watch folder changed
        if (updates.watchFolder !== undefined && updates.watchFolder !== oldWatchFolder) {
          this.stopWatching();
          if (this.config.watchFolder) {
            this.startWatching();
          }
        }

        res.json({ 
          success: true, 
          config: this.config 
        });

        this.io.emit('config-updated', this.config);
      } catch (error) {
        console.error('❌ Error updating config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
      }
    });

    // List extracted services
    this.app.get('/services', (_req: Request, res: Response) => {
      const services = Array.from(this.extractedServices.values()).map(s => ({
        id: s.id,
        name: s.name,
        path: s.path,
        itemCount: s.items.length,
        extractedAt: s.extractedAt
      }));
      res.json(services);
    });

    // Get service details
    this.app.get('/services/:id', (req: Request, res: Response) => {
      const service = this.extractedServices.get(req.params.id);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }
      res.json(service);
    });

    // Import service to main app
    this.app.post('/import/:id', async (req: Request, res: Response) => {
      try {
        const service = this.extractedServices.get(req.params.id);
        if (!service) {
          return res.status(404).json({ error: 'Service not found' });
        }

        // Emit import event to connected clients
        this.io.emit('service-import-request', service);
        
        res.json({ 
          success: true, 
          message: 'Import request sent to main application',
          service: { id: service.id, name: service.name }
        });
      } catch (error) {
        console.error('❌ Error importing service:', error);
        res.status(500).json({ error: 'Failed to import service' });
      }
    });

    // Delete extracted service
    this.app.delete('/services/:id', async (req: Request, res: Response) => {
      try {
        const service = this.extractedServices.get(req.params.id);
        if (!service) {
          return res.status(404).json({ error: 'Service not found' });
        }

        // Delete folder
        await fs.remove(service.path);
        this.extractedServices.delete(req.params.id);

        res.json({ success: true, message: 'Service deleted' });
        this.io.emit('service-deleted', { id: req.params.id });
      } catch (error) {
        console.error('❌ Error deleting service:', error);
        res.status(500).json({ error: 'Failed to delete service' });
      }
    });
  }

  // ==================== Socket.IO Setup ====================

  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);

      // Send current state
      socket.emit('config', this.config);
      socket.emit('services', Array.from(this.extractedServices.values()));

      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
      });

      socket.on('configure', (config: Partial<ServiceConfig>) => {
        this.config = { ...this.config, ...config };
        this.saveConfig();
        this.io.emit('config-updated', this.config);
      });

      socket.on('import-service', (serviceId: string) => {
        const service = this.extractedServices.get(serviceId);
        if (service) {
          socket.emit('service-import-request', service);
        }
      });
    });
  }

  // ==================== File Watching ====================

  private startWatching(): void {
    if (!this.config.watchFolder) {
      console.log('⚠️  No watch folder configured');
      return;
    }

    console.log('👀 Starting folder watch:', this.config.watchFolder);

    this.watcher = chokidar.watch(this.config.watchFolder, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath: string) => this.handleNewFile(filePath))
      .on('error', (error: Error) => {
        console.error('❌ Watcher error:', error);
        this.io.emit('service-error', { error: error.message });
      });

    console.log('✅ Folder watch started');
  }

  private stopWatching(): void {
    if (this.watcher) {
      console.log('🛑 Stopping folder watch');
      this.watcher.close();
      this.watcher = null;
    }
  }

  // ==================== File Processing ====================

  private async handleNewFile(filePath: string): Promise<void> {
    // Only process zip files
    if (!filePath.toLowerCase().endsWith('.zip')) {
      return;
    }

    // Skip if already processing
    if (this.processingQueue.has(filePath)) {
      return;
    }

    console.log('📦 New zip file detected:', filePath);
    this.processingQueue.add(filePath);
    this.io.emit('service-detected', { path: filePath });

    try {
      await this.extractAndProcess(filePath);
    } catch (error) {
      console.error('❌ Error processing file:', error);
      this.io.emit('service-error', { 
        path: filePath, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      this.processingQueue.delete(filePath);
    }
  }

  private async extractAndProcess(zipPath: string): Promise<void> {
    const fileName = path.basename(zipPath, '.zip');
    const serviceId = uuidv4();
    const extractPath = path.join(this.config.extractFolder, serviceId);

    console.log('📂 Extracting to:', extractPath);

    try {
      // Extract zip file
      await fs.ensureDir(extractPath);
      
      await fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .promise();

      console.log('✅ Extraction complete');

      // Parse service structure
      const serviceItems = await this.parseServiceStructure(extractPath);

      // Create service record
      const service: ExtractedService = {
        id: serviceId,
        name: fileName,
        path: extractPath,
        items: serviceItems,
        extractedAt: new Date(),
        sourceZip: zipPath
      };

      this.extractedServices.set(serviceId, service);

      console.log(`✅ Service processed: ${fileName} (${serviceItems.length} items)`);
      this.io.emit('service-extracted', service);

      // Delete original zip if configured
      if (this.config.autoDelete) {
        await fs.remove(zipPath);
        console.log('🗑️  Original zip file deleted');
      }

    } catch (error) {
      console.error('❌ Extraction failed:', error);
      // Clean up partial extraction
      await fs.remove(extractPath);
      throw error;
    }
  }

  // ==================== Service Structure Parsing ====================

  private async parseServiceStructure(servicePath: string): Promise<ServiceItem[]> {
    const items: ServiceItem[] = [];
    
    try {
      // Find the root service folder (might be nested in a parent folder)
      const rootContents = await fs.readdir(servicePath);
      let scanPath = servicePath;
      
      // If there's only one folder, it might be the actual service folder
      if (rootContents.length === 1) {
        const potentialRoot = path.join(servicePath, rootContents[0]);
        const stat = await fs.stat(potentialRoot);
        if (stat.isDirectory()) {
          scanPath = potentialRoot;
        }
      }

      // Read all folders in the service directory
      const entries = await fs.readdir(scanPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const fullPath = path.join(scanPath, entry.name);
        const sortOrder = this.extractSortOrder(entry.name);
        const cleanName = this.cleanItemName(entry.name);

        // Check if this is a song folder (contains audio files)
        const isSong = await this.containsAudioFiles(fullPath);
        
        const item: ServiceItem = {
          id: uuidv4(),
          name: cleanName,
          path: fullPath,
          type: isSong ? 'song' : 'folder',
          sortOrder: sortOrder
        };

        items.push(item);
      }

      // Sort by order
      items.sort((a, b) => a.sortOrder - b.sortOrder);

      return items;
    } catch (error) {
      console.error('❌ Error parsing service structure:', error);
      return [];
    }
  }

  private extractSortOrder(name: string): number {
    // Extract leading number from names like "01 - Announcements" or "01-Song Name"
    const match = name.match(/^(\d+)\s*[-–—]\s*/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 999; // Default high number for items without prefix
  }

  private cleanItemName(name: string): string {
    // Remove leading numbers and separators
    return name.replace(/^\d+\s*[-–—]\s*/, '').trim();
  }

  private async containsAudioFiles(folderPath: string): Promise<boolean> {
    try {
      const files = await fs.readdir(folderPath);
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];
      return files.some(file => 
        audioExtensions.some(ext => file.toLowerCase().endsWith(ext))
      );
    } catch {
      return false;
    }
  }

  // ==================== Load Existing Services ====================

  private async loadExistingServices(): Promise<void> {
    try {
      const extractFolder = this.config.extractFolder;
      if (!fs.existsSync(extractFolder)) {
        return;
      }

      const entries = await fs.readdir(extractFolder, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const servicePath = path.join(extractFolder, entry.name);
        const items = await this.parseServiceStructure(servicePath);

        if (items.length > 0) {
          const service: ExtractedService = {
            id: entry.name,
            name: entry.name,
            path: servicePath,
            items: items,
            extractedAt: new Date(0), // Unknown extraction time
            sourceZip: 'unknown'
          };

          this.extractedServices.set(entry.name, service);
          console.log(`📂 Loaded existing service: ${entry.name}`);
        }
      }

      console.log(`✅ Loaded ${this.extractedServices.size} existing services`);
    } catch (error) {
      console.error('❌ Error loading existing services:', error);
    }
  }

  // ==================== Server Start ====================

  public start(): void {
    this.server.listen(PORT, HOST, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║   🗂️  HarmonySync Folder Service                         ║');
      console.log('╠═══════════════════════════════════════════════════════════╣');
      console.log(`║   🌐 Server: http://${HOST}:${PORT}                    ║`);
      console.log(`║   📂 Watch Folder: ${this.config.watchFolder || 'Not configured'.padEnd(26)} ║`);
      console.log(`║   📁 Extract Folder: ${path.basename(this.config.extractFolder).padEnd(24)} ║`);
      console.log(`║   🗑️  Auto-delete: ${this.config.autoDelete ? 'Enabled ' : 'Disabled'}                       ║`);
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log('');
    });
  }

  public stop(): void {
    this.stopWatching();
    this.io.close();
    this.server.close();
    console.log('🛑 Service stopped');
  }
}

// ==================== Main ====================

const service = new FolderService();
service.start();

// Graceful shutdown
const shutdown = (reason: string, error?: unknown, exitCode: number = 1): void => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (error) {
    console.error(`\n🛑 Folder service shutting down due to ${reason}:`, error);
  } else {
    console.log(`\n🛑 Folder service shutting down (${reason})`);
  }

  try {
    service.stop();
  } catch (cleanupError) {
    console.error('Failed to stop folder service:', cleanupError);
  }

  if (IS_TEST_ENV) {
    return;
  }

  process.exit(exitCode);
};

process.on('SIGINT', () => {
  shutdown('SIGINT', undefined, 0);
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM', undefined, 0);
});

process.on('uncaughtException', (error: Error): void => {
  shutdown('uncaughtException', error);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>): void => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection', reason);
});

export default FolderService;
