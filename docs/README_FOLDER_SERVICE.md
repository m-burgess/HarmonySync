# Folder Service - Complete Documentation Index

## Overview

The **HarmonySync Folder Service** is a standalone microservice that automatically monitors a user-specified directory for zipped service packages and processes them for use in the main HarmonySync Electron application.

**Core Function**: Upload a zip → Service extracts it → App imports it → Ready to broadcast

---

## Documentation Files

### 1. 📋 [FOLDER_SERVICE_ANALYSIS.md](./FOLDER_SERVICE_ANALYSIS.md)
**What**: Complete technical analysis of the current implementation

**Contains**:
- Feature breakdown and capabilities
- Architecture overview
- Integration points with Electron app
- Data structures and flows
- 10 potential enhancement areas with detailed descriptions
- Implementation roadmap

**Best for**: Understanding what the service does and how it works

**Read when**: You want to understand the current system or plan improvements

---

### 2. 🛠️ [FOLDER_SERVICE_DEVELOPMENT.md](./FOLDER_SERVICE_DEVELOPMENT.md)
**What**: Feature development guide and implementation roadmap

**Contains**:
- Current implementation status checklist
- Detailed feature enhancement proposals (10 priorities)
- Implementation roadmap with timeline
- Testing strategy (unit, integration, E2E)
- API expansion suggestions
- Database schema for persistence
- Enhanced configuration options

**Best for**: Planning and implementing new features

**Read when**: You're ready to add functionality or improve the service

---

### 3. 🏗️ [FOLDER_SERVICE_INTEGRATION.md](./FOLDER_SERVICE_INTEGRATION.md)
**What**: Complete workflow diagram and integration architecture

**Contains**:
- End-to-end user workflow from zip creation to broadcast
- Technical architecture with subsystem breakdown
- Communication flow diagrams
- Data structure examples with real JSON
- Boot integration for different OS (Linux/Windows/macOS)
- Error scenarios and recovery paths
- Performance and security considerations

**Best for**: Understanding how everything connects

**Read when**: You need to see the big picture or integrate with another system

---

### 4. 🐛 [FOLDER_SERVICE_TROUBLESHOOTING.md](./FOLDER_SERVICE_TROUBLESHOOTING.md)
**What**: Operations guide with troubleshooting and diagnostics

**Contains**:
- 7 common issues with step-by-step solutions
- Diagnostic commands for each issue
- Health check and testing procedures
- Performance troubleshooting
- Recovery procedures
- Best practices (do's and don'ts)
- Quick reference guide

**Best for**: Solving problems and maintaining the service

**Read when**: Service isn't working or you need to debug something

---

## Quick Navigation

### 🚀 "I want to get it running"
1. Read [FOLDER_SERVICE_INTEGRATION.md](./FOLDER_SERVICE_INTEGRATION.md) - understand the workflow
2. Follow "Getting Started" in main README.md
3. Use [FOLDER_SERVICE_TROUBLESHOOTING.md](./FOLDER_SERVICE_TROUBLESHOOTING.md) if issues

### 📚 "I want to understand the code"
1. Start with [FOLDER_SERVICE_ANALYSIS.md](./FOLDER_SERVICE_ANALYSIS.md) - current implementation
2. Read the source: `apps/harmonysync-folder-service/server.ts`
3. Check `README.md` and `ARCHITECTURE.md` in the service folder

### 🎯 "I want to add features"
1. Review [FOLDER_SERVICE_ANALYSIS.md](./FOLDER_SERVICE_ANALYSIS.md) - understand existing code
2. Check [FOLDER_SERVICE_DEVELOPMENT.md](./FOLDER_SERVICE_DEVELOPMENT.md) - pick a feature
3. Follow the implementation guide for your chosen feature

### 🔧 "Something is broken"
1. Read [FOLDER_SERVICE_TROUBLESHOOTING.md](./FOLDER_SERVICE_TROUBLESHOOTING.md)
2. Find your issue in the common problems section
3. Follow the step-by-step solutions

### 🏗️ "I need to integrate this elsewhere"
1. Read [FOLDER_SERVICE_INTEGRATION.md](./FOLDER_SERVICE_INTEGRATION.md) - see all integration points
2. Check the API section for endpoint details
3. Use the code examples provided

---

## Key Concepts

### Service Architecture
```
Chokidar Watcher → Unzipper → Parser → Storage → API (REST + WebSocket)
```

### Typical Workflow
```
1. Volunteer creates service order zip
2. Uploads to configured watch folder
3. Service detects and extracts it
4. Service parses structure (01 - Item, 02 - Item, etc.)
5. Service emits "ready" notification via WebSocket
6. Electron app receives notification
7. Volunteer clicks "Import"
8. Service sends full metadata to Electron
9. Electron loads all media and displays service order
10. Ready to broadcast!
```

### File Locations
```
Watch Folder:      ~/Downloads/HarmonySync/ (configured by user)
Extract Folder:    ~/.harmonysync/imported-services/
Config File:       ~/.harmonysync/folder-service-config.json
Service Logs:      (future) ~/.harmonysync/logs/
```

### Communication Ports
```
HTTP REST API:     localhost:3005
WebSocket Events:  ws://localhost:3005
```

---

## Feature Checklist

### Current (✅ Implemented)
- ✅ Folder watching with chokidar
- ✅ Automatic zip extraction
- ✅ Service structure parsing
- ✅ Item type detection (song vs folder)
- ✅ REST API endpoints
- ✅ WebSocket notifications
- ✅ Linux systemd boot integration
- ✅ Configuration management
- ✅ Auto-delete original zips
- ✅ Graceful shutdown handling

### Planned (High Priority)
- ⏳ Windows/macOS boot integration
- ⏳ Persistent service metadata
- ⏳ Advanced validation
- ⏳ Enhanced error handling
- ⏳ Batch processing queue

### Future (Medium Priority)
- 🔮 Smart item type detection (presentations, videos)
- 🔮 Performance optimization
- 🔮 Structured logging
- 🔮 Security enhancements
- 🔮 Monitoring and analytics

---

## Common Tasks

### Configure the Watch Folder
```bash
# Via API
curl -X POST http://localhost:3005/config \
  -H "Content-Type: application/json" \
  -d '{"watchFolder": "/home/user/Downloads/HarmonySync"}'

# Or via file
vi ~/.harmonysync/folder-service-config.json
```

### View Available Services
```bash
curl http://localhost:3005/services | jq .
```

### Get Service Details
```bash
curl http://localhost:3005/services/{UUID}
```

### Trigger Import
```bash
curl -X POST http://localhost:3005/import/{UUID}
```

### Check Service Health
```bash
curl http://localhost:3005/health
```

### View Logs (Linux)
```bash
journalctl -u harmonysync-folder-service -f
```

### Restart Service (Linux)
```bash
sudo systemctl restart harmonysync-folder-service
```

---

## Architecture at a Glance

### Main Components
1. **Watcher** - Monitors folder for new zips (chokidar)
2. **Extractor** - Unzips files to unique directories
3. **Parser** - Analyzes folder structure and creates metadata
4. **Storage** - In-memory Map of extracted services
5. **API** - Express.js REST endpoints + Socket.IO WebSocket
6. **Persistence** - Configuration saved to JSON file

### Data Flow
```
File Added → Detected → Extracted → Parsed → Stored → Notified → Imported
```

### Integration Points
- **Electron App**: Listens for notifications, calls import endpoint
- **External Tools**: Can query API for service info
- **Operating System**: Boots automatically via systemd/Task Scheduler

---

## Performance Baseline

| Operation | Time | Notes |
|-----------|------|-------|
| Detect new zip | ~100ms | After write stability threshold |
| Extract 500MB zip | 5-10s | Depends on disk speed |
| Parse structure | <100ms | For typical 5-20 items |
| Emit notification | ~100ms | WebSocket broadcast |
| Store in memory | <10ms | Simple Map insertion |

### Bottlenecks
- Disk I/O during extraction
- File system scanning during parsing
- Network latency if folder on network drive

---

## Security Considerations

### Current Protection
✅ Only .zip files processed
✅ Streaming extraction (memory-efficient)
✅ Auto-cleanup on error
✅ UUID-based service separation

### Future Protections (Planned)
⏳ Zip bomb detection
⏳ File size limits
⏳ Suspicious file detection
⏳ Path traversal prevention

---

## Support & Resources

### Getting Help
1. Check [FOLDER_SERVICE_TROUBLESHOOTING.md](./FOLDER_SERVICE_TROUBLESHOOTING.md) first
2. Run diagnostic commands (see troubleshooting guide)
3. Check service logs
4. Review existing issues in project

### Source Code
- Main service: `apps/harmonysync-folder-service/server.ts`
- Client example: `apps/harmonysync-folder-service/client.ts`
- Test client: `apps/harmonysync-folder-service/test-client.ts`

### Related Files
- `README.md` - Quick start
- `USAGE.md` - Feature walkthrough
- `ARCHITECTURE.md` - Design details
- `INSTALLATION.md` - Setup guide

---

## Glossary

**Service Order**: The complete package of items for a church service (announcements, songs, sermon, etc.)

**Zipped Service**: A .zip file containing a service order with folder structure like:
```
01 - Announcements/
02 - Song/
03 - Sermon/
```

**Service Item**: Individual element in a service order (one song, one video, one presentation, etc.)

**Extraction**: Unzipping the service zip and copying to disk

**Parsing**: Analyzing folder structure and creating metadata

**Import**: Loading extracted service into Electron app for broadcast

**Watch Folder**: The directory the service monitors for new zip files

**Extract Folder**: The directory where services are unzipped

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-02-02 | Initial release with core features |

---

## Next Steps

1. **Immediate**: Ensure service is running and monitoring watch folder
2. **Short-term**: Configure Electron app to listen for service updates
3. **Medium-term**: Add persistent service metadata (Priority 2)
4. **Long-term**: Implement Windows/macOS boot integration (Priority 1)

---

## Document Maintenance

These documents were created on **February 2, 2025** and reflect the current state of the folder service. Update them when:
- New features are added
- Architecture changes significantly
- Troubleshooting procedures need updating
- Performance characteristics change

---

## Authors & Contributors

Created during HarmonySync development phase 2025.

For questions about this documentation, refer to the main project README.md
