# HarmonySync Folder Service - Quick Start Guide

## Overview

The HarmonySync Folder Service is a microservice that automatically monitors a folder for zipped service packages, extracts them, and prepares them for import into the main HarmonySync application.

## Features

✅ **Automatic Detection**: Watches a specified folder for new zip files  
✅ **Smart Extraction**: Automatically unzips service folders  
✅ **Intelligent Sorting**: Orders service items by numeric prefix (01, 02, 03, etc.)  
✅ **Real-time Updates**: Notifies the main app via Socket.IO  
✅ **Boot Startup**: Runs automatically on system boot (systemd)  
✅ **REST API**: Full API for configuration and management  

## Installation

### 1. Install Dependencies

```bash
cd apps/harmonysync-folder-service
pnpm install
```

### 2. Build the Service

```bash
pnpm build
```

### 3. Install as System Service (Linux)

```bash
# Install and enable the service to run on boot
sudo pnpm run install-service

# The service will start automatically
```

### 4. Verify Installation

```bash
# Check service status
sudo systemctl status harmonysync-folder-service

# View logs
journalctl -u harmonysync-folder-service -f
```

## Configuration

### Default Configuration

The service creates a configuration file at:
```
~/.harmonysync/folder-service-config.json
```

Default settings:
```json
{
  "watchFolder": null,
  "extractFolder": "~/.harmonysync/imported-services",
  "autoDelete": true,
  "port": 3005
}
```

### Setting the Watch Folder

You **must** configure a watch folder before the service can detect zip files.

#### Option 1: Via REST API

```bash
curl -X POST http://127.0.0.1:3005/config \
  -H "Content-Type: application/json" \
  -d '{
    "watchFolder": "/home/user/Downloads/services"
  }'
```

#### Option 2: Edit Config File

```bash
nano ~/.harmonysync/folder-service-config.json
```

Change `watchFolder` to your desired path:
```json
{
  "watchFolder": "/home/user/Downloads/services",
  "extractFolder": "/home/user/.harmonysync/imported-services",
  "autoDelete": true,
  "port": 3005
}
```

Then restart the service:
```bash
sudo systemctl restart harmonysync-folder-service
```

## Usage

### Preparing Service Folders

Create a zip file with the following structure:

```
Service Order [Date].zip
├── 01 - Announcements/
│   └── [slides/images]
├── 02 - 5 Minute Countdown/
│   └── [countdown media]
├── 03 - Song 1/
│   ├── track1.mp3
│   └── track2.mp3
├── 04 - Sermon/
│   └── [sermon materials]
└── 05 - Special Services/
    └── [additional content]
```

**Naming Convention**: Use numeric prefixes (01-, 02-, etc.) to define the order.

### Automatic Import

1. Place the zip file in your configured watch folder
2. The service automatically:
   - Detects the new file
   - Extracts the contents
   - Parses the folder structure
   - Sorts items by prefix
   - Notifies the main application

### Manual Testing

Create a test service:
```bash
cd apps/harmonysync-folder-service
./create-test-service.sh
```

This creates a test zip file in `~/Downloads/test-services/`

## API Reference

### Health Check

```bash
curl http://127.0.0.1:3005/health
```

Response:
```json
{
  "status": "healthy",
  "service": "harmonysync-folder-service",
  "version": "1.0.0",
  "watching": true,
  "servicesCount": 3
}
```

### List Services

```bash
curl http://127.0.0.1:3005/services
```

### Get Service Details

```bash
curl http://127.0.0.1:3005/services/{service-id}
```

### Import Service

```bash
curl -X POST http://127.0.0.1:3005/import/{service-id}
```

### Delete Service

```bash
curl -X DELETE http://127.0.0.1:3005/services/{service-id}
```

## Integration with Main App

### 1. Add Client to Electron App

```typescript
import { FolderServiceClient } from '../harmonysync-folder-service/client';

const folderClient = new FolderServiceClient();
await folderClient.connect();

// Listen for new services
folderClient.on('service-extracted', (service) => {
  console.log('New service available:', service.name);
  // Update UI, etc.
});
```

### 2. Import Service into Service Order

When a service is imported, convert the items to ServiceOrder format:

```typescript
folderClient.on('service-import-request', async (service) => {
  const serviceItems = service.items.map(item => ({
    id: item.id,
    name: item.name,
    path: item.path,
    type: item.type
  }));
  
  // Load into service order
  await serviceOrderViewModel.loadServiceOrder(service.path);
});
```

See [integration-example.ts](integration-example.ts) for complete integration code.

## Troubleshooting

### Service Won't Start

```bash
# Check if port 3005 is already in use
lsof -i :3005

# Check service logs
journalctl -u harmonysync-folder-service -n 50

# Verify Node.js is installed
node --version
```

### Not Detecting Zip Files

1. Check watch folder is configured:
   ```bash
   curl http://127.0.0.1:3005/config
   ```

2. Verify folder exists and is accessible:
   ```bash
   ls -la /path/to/watch/folder
   ```

3. Check file permissions

4. View real-time logs:
   ```bash
   journalctl -u harmonysync-folder-service -f
   ```

### Extraction Fails

- Ensure zip file is valid: `unzip -t file.zip`
- Check available disk space: `df -h`
- Verify extract folder permissions

## Development

### Run in Development Mode

```bash
pnpm dev
```

This runs the service with nodemon for auto-reloading.

### Test Client

```bash
pnpm build
node dist/test-client.js
```

### API Documentation

View the OpenAPI specification:
```bash
cat openapi.yml
```

Or use Swagger UI to explore the API interactively.

## System Management

### Service Commands

```bash
# Start
sudo systemctl start harmonysync-folder-service

# Stop
sudo systemctl stop harmonysync-folder-service

# Restart
sudo systemctl restart harmonysync-folder-service

# Status
sudo systemctl status harmonysync-folder-service

# Enable on boot
sudo systemctl enable harmonysync-folder-service

# Disable on boot
sudo systemctl disable harmonysync-folder-service

# View logs
journalctl -u harmonysync-folder-service -f

# View last 100 lines
journalctl -u harmonysync-folder-service -n 100
```

### Uninstall

```bash
cd apps/harmonysync-folder-service
sudo ./uninstall-service.sh
```

This removes the systemd service but preserves your configuration and extracted services.

## Socket.IO Events

### Emitted by Service

- `service-detected`: New zip file detected
- `service-extracted`: Service extracted successfully
- `service-import-request`: Service ready for import
- `service-deleted`: Service deleted
- `service-error`: Error occurred
- `config-updated`: Configuration changed

### Received by Service

- `configure`: Update configuration
- `import-service`: Request service import

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `watchFolder` | string\|null | null | Folder to watch for zip files |
| `extractFolder` | string | ~/.harmonysync/imported-services | Where to extract services |
| `autoDelete` | boolean | true | Delete zip after extraction |
| `port` | number | 3005 | Service port |

## File Structure

```
harmonysync-folder-service/
├── server.ts              # Main service implementation
├── client.ts              # Client library for integration
├── integration-example.ts # Example Electron integration
├── install-service.ts     # Installation helper
├── install-service.sh     # Systemd installation script
├── uninstall-service.sh   # Systemd removal script
├── create-test-service.sh # Test data generator
├── test-client.ts         # Test utility
├── openapi.yml           # API specification
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── README.md             # This file
```

## License

MIT

## Support

For issues or questions, please check the main HarmonySync documentation or contact the development team.
