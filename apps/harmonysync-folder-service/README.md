# HarmonySync Folder Service

Automated service folder monitoring and import service for HarmonySync.

## Features

- **Automatic Folder Monitoring**: Watches a user-specified directory for new zipped service folders
- **Auto-Extract**: Automatically unzips service folders when detected
- **Smart Ordering**: Organizes service items based on numeric prefixes (e.g., "01 - Announcements", "02 - Song 1")
- **Boot Startup**: Runs automatically on system boot via systemd service
- **Real-time Updates**: Notifies the main application when new services are available

## Service Folder Structure

The service expects zipped folders with the following naming convention:

```
Service Order [Date]/
├── 01 - Announcements/
│   └── [slides/media]
├── 02 - 5 Minute Countdown/
│   └── [countdown video/slides]
├── 03 - Song 1/
│   └── [audio tracks/lyrics]
├── 04 - Sermon/
│   └── [video/slides]
└── 05 - Special Services/
    └── [wedding/funeral materials]
```

## Installation

```bash
# Install dependencies
pnpm install

# Build the service
pnpm build

# Install as systemd service (Linux only)
sudo pnpm run install-service
```

## Configuration

The service configuration is stored in `~/.harmonysync/folder-service-config.json`:

```json
{
  "watchFolder": "/path/to/download/folder",
  "extractFolder": "/path/to/extract/destination",
  "autoDelete": true,
  "port": 3005
}
```

## API Endpoints

### GET /health
Health check endpoint

### GET /config
Get current configuration

### POST /config
Update configuration
```json
{
  "watchFolder": "/path/to/folder",
  "extractFolder": "/path/to/extract",
  "autoDelete": true
}
```

### GET /services
List all extracted services

### POST /import/:serviceId
Import a specific service into the main application

## Socket.IO Events

### Emitted Events
- `service-detected`: New zip file detected
- `service-extracted`: Service successfully extracted
- `service-imported`: Service imported to main app
- `service-error`: Error during processing

### Received Events
- `configure`: Update service configuration
- `import-service`: Request to import a service

## Running as Systemd Service

The service can be installed to run automatically on boot:

```bash
# Install service
sudo pnpm run install-service

# Start service
sudo systemctl start harmonysync-folder-service

# Enable on boot
sudo systemctl enable harmonysync-folder-service

# Check status
sudo systemctl status harmonysync-folder-service

# View logs
journalctl -u harmonysync-folder-service -f
```

## Development

```bash
# Run in development mode
pnpm dev

# Run tests
pnpm test
```

## Architecture

The service consists of:
1. **File Watcher**: Monitors the specified folder using chokidar
2. **Extractor**: Unzips service folders using unzipper
3. **Parser**: Analyzes folder structure and creates service order
4. **API Server**: Express server for configuration and control
5. **Socket.IO Server**: Real-time communication with main app

## Environment Variables

- `PORT`: Service port (default: 3005)
- `HOST`: Service host (default: 127.0.0.1)
- `CONFIG_PATH`: Configuration file path (default: ~/.harmonysync/folder-service-config.json)
