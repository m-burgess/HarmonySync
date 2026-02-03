# Folder Service - Troubleshooting & Operations Guide

## Common Issues & Solutions

### Issue 1: Service exits immediately without error

**Symptoms**:
- Folder Service starts then stops right away
- No error messages
- Watch folder configured

**Causes**:
1. Port 3005 already in use
2. Permission issues on extract folder
3. Extract folder doesn't exist
4. Crash in initialization

**Solutions**:
```bash
# Check if port is in use
lsof -i :3005  # Linux/macOS
netstat -ano | findstr :3005  # Windows

# If in use, either:
# - Kill the process: kill <PID>
# - Use different port: PORT=3006 npm run start

# Check permissions
ls -la ~/.harmonysync/
chmod 755 ~/.harmonysync/

# Manually create extract folder
mkdir -p ~/.harmonysync/imported-services
chmod 755 ~/.harmonysync/imported-services

# Run with verbose logging
DEBUG=* npm run dev
```

---

### Issue 2: Service detects zip file but doesn't extract

**Symptoms**:
- File appears in watch folder
- No notification received
- Service still running

**Causes**:
1. File stability threshold not met (still being written)
2. File name doesn't end with .zip
3. File system watcher missed event

**Solutions**:
```bash
# Wait 3+ seconds after file completes
# The service needs 2 seconds of write-stability

# Verify file is complete
ls -lh watch-folder/  # Check modified time

# Check if file is actually .zip
file watch-folder/your-file.zip

# Force re-read (move file out and back in)
mv watch-folder/file.zip watch-folder/file.zip.tmp
sleep 3
mv watch-folder/file.zip.tmp watch-folder/file.zip

# Check logs
npm run dev  # See console output
journalctl -u harmonysync-folder-service -f  # If systemd
```

---

### Issue 3: "Watch folder does not exist" error

**Symptoms**:
- Error when trying to configure watch folder
- REST API returns 400 status

**Causes**:
1. Path doesn't exist
2. Typo in path
3. Folder was deleted

**Solutions**:
```bash
# Verify path exists
ls -la /path/to/watch/folder

# Create if missing
mkdir -p ~/Downloads/HarmonySync

# Update via API with correct path
curl -X POST http://localhost:3005/config \
  -H "Content-Type: application/json" \
  -d '{"watchFolder": "/home/user/Downloads/HarmonySync"}'

# Or update config file directly
vi ~/.harmonysync/folder-service-config.json
# Change "watchFolder" to existing path
# Restart service
```

---

### Issue 4: Extraction fails silently

**Symptoms**:
- File detected and processing
- Service stops processing
- Service not reporting error
- No extracted files

**Causes**:
1. Disk space full
2. Permission denied
3. Corrupted zip file
4. Disk I/O error

**Solutions**:
```bash
# Check disk space
df -h
df -h ~/.harmonysync/

# Check permissions
ls -la ~/.harmonysync/imported-services/
chmod 755 ~/.harmonysync/imported-services/

# Test zip file integrity
unzip -t suspect-file.zip

# Check system logs for I/O errors
dmesg | tail -20  # Linux
# Check system logs graphically on macOS/Windows

# Try smaller test zip
echo "test" > test.txt
zip test.zip test.txt
# Move to watch folder and see if it works

# View detailed logs
npm run dev  # Will show extraction errors
```

---

### Issue 5: Files extracted but not showing in API

**Symptoms**:
- Files exist in extract folder
- GET /services returns empty list
- Service was restarted

**Causes**:
1. Extract folder path changed
2. Files in wrong location
3. In-memory cache lost (restart)
4. Permission issues reading files

**Solutions**:
```bash
# Verify files are in extract folder
ls -la ~/.harmonysync/imported-services/

# Check file count matches API
ls ~/.harmonysync/imported-services/ | wc -l

# Restart service (reloads existing services)
systemctl restart harmonysync-folder-service
# or kill and restart npm

# Check API response directly
curl http://localhost:3005/services

# Check permissions on extracted folders
ls -la ~/.harmonysync/imported-services/*

# If files are there but not showing:
# They may not have valid service structure
# Verify each has: 01 - Item Name / folder structure
```

---

### Issue 6: Cannot connect from Electron app

**Symptoms**:
- Electron app can't reach folder service
- WebSocket connection timeout
- 404 errors calling API

**Causes**:
1. Service not running
2. Wrong port or hostname
3. CORS configuration issue
4. Firewall blocking

**Solutions**:
```bash
# Verify service is running
curl http://127.0.0.1:3005/health
# Should return: {"status":"healthy",...}

# If can't reach:
# 1. Is service running?
ps aux | grep "node dist/server.js"

# 2. Is it on right port?
netstat -tulpn | grep 3005

# 3. Is firewall blocking?
sudo ufw status  # Linux
sudo ufw allow 3005  # If needed

# 4. Check CORS config in server.ts
# Should have: cors: { origin: '*' }

# 5. Try from local machine first
curl http://localhost:3005/health

# 6. Try from Electron with explicit host
const socket = io('http://127.0.0.1:3005', {
  reconnection: true,
  reconnectionDelay: 1000
});
```

---

### Issue 7: Zip file not deleted after extraction

**Symptoms**:
- config.autoDelete is true
- File extracted successfully
- Original zip still exists in watch folder

**Causes**:
1. autoDelete is actually false
2. Permission denied deleting file
3. File still in use by another process

**Solutions**:
```bash
# Verify config
curl http://localhost:3005/config | grep autoDelete

# If false, enable it
curl -X POST http://localhost:3005/config \
  -H "Content-Type: application/json" \
  -d '{"autoDelete": true}'

# Check permissions
ls -la watch-folder/your-file.zip
chmod 644 watch-folder/your-file.zip

# Check if file is locked
lsof watch-folder/your-file.zip  # Linux/macOS
handle watch-folder\file.zip  # Windows (Sysinternals)

# Manually delete if needed
rm watch-folder/your-file.zip

# Restart service
systemctl restart harmonysync-folder-service
```

---

## Diagnostic Commands

### Health Check
```bash
# Quick status
curl http://localhost:3005/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "harmonysync-folder-service",
#   "version": "1.0.0",
#   "watching": true,
#   "servicesCount": 3
# }
```

### Configuration Check
```bash
# View current config
curl http://localhost:3005/config

# View config file directly
cat ~/.harmonysync/folder-service-config.json

# List all services
curl http://localhost:3005/services

# Get specific service details
curl http://localhost:3005/services/{UUID}
```

### File System Check
```bash
# What's in watch folder?
ls -lah ~/Downloads/HarmonySync/

# What's been extracted?
ls -lah ~/.harmonysync/imported-services/

# Disk usage
du -sh ~/.harmonysync/

# Check for errors in logs
grep -i "error" ~/.harmonysync/folder-service.log  # If using logging
```

### Service Status (Linux)
```bash
# System service status
sudo systemctl status harmonysync-folder-service

# Restart service
sudo systemctl restart harmonysync-folder-service

# View logs
journalctl -u harmonysync-folder-service -f
journalctl -u harmonysync-folder-service --since "1 hour ago"

# Enable/disable at boot
sudo systemctl enable harmonysync-folder-service
sudo systemctl disable harmonysync-folder-service
```

---

## Testing & Verification

### Test 1: Can the service reach the watch folder?

```bash
# Create test folder structure
mkdir -p ~/test-watch/test-service/{01-Item1,02-Item2}
touch ~/test-watch/test-service/01-Item1/file.txt
touch ~/test-watch/test-service/02-Item2/song.mp3

# Zip it
cd ~/test-watch
zip -r test-service.zip test-service/

# Configure service to watch ~/test-watch
curl -X POST http://localhost:3005/config \
  -H "Content-Type: application/json" \
  -d '{"watchFolder": "/home/user/test-watch"}'

# Move zip to watch folder
cp test-service.zip ~/test-watch/

# Check if extracted (wait 3 seconds)
sleep 3
curl http://localhost:3005/services

# Should now show the extracted service
```

### Test 2: Does the API work?

```bash
# Test all endpoints
# Health
curl http://localhost:3005/health
echo "---"

# Config
curl http://localhost:3005/config
echo "---"

# Services list
curl http://localhost:3005/services
echo "---"

# If you have a service, test its details
curl http://localhost:3005/services/{UUID}
echo "---"
```

### Test 3: Does WebSocket work?

```bash
# Using websocat (if installed)
websocat ws://localhost:3005

# Or using Node.js
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3005');
socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('ping');
  socket.on('pong', () => console.log('Pong received!'));
});
"
```

---

## Performance Troubleshooting

### Service is slow to extract

**Causes**:
1. Large zip file
2. Slow disk (HDD vs SSD)
3. High CPU load
4. Network drive (if watching networked folder)

**Solutions**:
```bash
# Check disk speed
time dd if=/dev/zero of=test.bin bs=1M count=100 oflag=direct

# Monitor during extraction
top  # Watch CPU usage
iotop  # Watch disk I/O

# Use faster disk if available
# Move extracted folder to SSD

# Check if watch folder is on network
mount | grep watch-folder
# If network, consider local copy
```

### Service memory usage growing

**Causes**:
1. Many services in memory
2. Memory leak in Node.js
3. Files cached in memory

**Solutions**:
```bash
# Check memory usage
ps aux | grep "node dist/server.js"

# If high, restart service
systemctl restart harmonysync-folder-service

# Check if old services can be deleted
curl http://localhost:3005/services
# Delete old ones:
curl -X DELETE http://localhost:3005/services/{OLD_UUID}

# Monitor over time
while true; do
  ps aux | grep "node dist/server.js" | grep -v grep | awk '{print $6}'
  sleep 10
done
```

---

## Recovery Procedures

### Reset to Defaults

```bash
# Stop service
systemctl stop harmonysync-folder-service

# Backup config
cp ~/.harmonysync/folder-service-config.json \
   ~/.harmonysync/folder-service-config.json.backup

# Delete config (will reset on restart)
rm ~/.harmonysync/folder-service-config.json

# Start service
systemctl start harmonysync-folder-service

# Verify reset
curl http://localhost:3005/config
# Should show default values: watchFolder: null
```

### Clear all extracted services

```bash
# This deletes ALL extracted files
rm -rf ~/.harmonysync/imported-services/*

# Restart service
systemctl restart harmonysync-folder-service

# Verify
curl http://localhost:3005/services
# Should return: []
```

### Reinstall service

```bash
# Uninstall
sudo systemctl stop harmonysync-folder-service
sudo systemctl disable harmonysync-folder-service
sudo rm /etc/systemd/system/harmonysync-folder-service.service
sudo systemctl daemon-reload

# Reinstall
cd apps/harmonysync-folder-service
pnpm build
sudo pnpm run install-service

# Start
sudo systemctl start harmonysync-folder-service
sudo systemctl status harmonysync-folder-service
```

---

## Getting Help

**When reporting issues, include**:

1. Service version
   ```bash
   curl http://localhost:3005/health | grep version
   ```

2. Current config
   ```bash
   cat ~/.harmonysync/folder-service-config.json
   ```

3. Service logs
   ```bash
   journalctl -u harmonysync-folder-service -n 50
   ```

4. System info
   ```bash
   uname -a
   df -h ~/.harmonysync/
   ls -la ~/.harmonysync/
   ```

5. Specific error message
6. Steps to reproduce

---

## Best Practices

### ✅ DO

- Create watch folder in user home directory or accessible location
- Use numeric prefixes for service items (01, 02, 03...)
- Keep zip files organized with clear names
- Monitor disk space in extract folder
- Regularly clean up old imported services
- Test zip files before deployment to watch folder

### ❌ DON'T

- Put watch folder on slow network drives
- Use special characters in folder names
- Create zip files with spaces at start of item names
- Leave thousands of services in extract folder
- Run service with insufficient disk space
- Configure watch folder as root-only accessible
- Ignore error messages - diagnose and fix

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `curl http://localhost:3005/health` | Check if running |
| `curl http://localhost:3005/config` | View configuration |
| `curl http://localhost:3005/services` | List services |
| `systemctl status harmonysync-folder` | Service status (Linux) |
| `journalctl -u harmonysync-folder -f` | Live logs (Linux) |
| `npm run dev` | Dev mode with logs |
| `rm -rf ~/.harmonysync/imported-services/*` | Clear all services |

