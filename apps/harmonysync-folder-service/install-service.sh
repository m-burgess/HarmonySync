#!/bin/bash

# HarmonySync Folder Service - Systemd Installation Script

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Installing HarmonySync Folder Service                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

# Get the current directory
SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_NAME="${SUDO_USER:-$USER}"
USER_HOME=$(eval echo ~$USER_NAME)

echo "📂 Service directory: $SERVICE_DIR"
echo "👤 User: $USER_NAME"
echo "🏠 Home: $USER_HOME"
echo ""

# Create systemd service file
SERVICE_FILE="/etc/systemd/system/harmonysync-folder-service.service"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=HarmonySync Folder Service - Automatic service folder importer
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$SERVICE_DIR
ExecStart=/usr/bin/node $SERVICE_DIR/dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=harmonysync-folder

# Environment variables
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3005
Environment=CONFIG_PATH=$USER_HOME/.harmonysync/folder-service-config.json

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created: $SERVICE_FILE"
echo ""

# Reload systemd
echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload

# Enable service
echo "🔧 Enabling service to start on boot..."
systemctl enable harmonysync-folder-service

# Start service
echo "🚀 Starting service..."
systemctl start harmonysync-folder-service

# Wait a moment for service to start
sleep 2

# Check status
echo ""
echo "📊 Service Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
systemctl status harmonysync-folder-service --no-pager -l || true
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✅ Installation Complete!                               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Useful commands:"
echo "  • Check status:  sudo systemctl status harmonysync-folder-service"
echo "  • View logs:     journalctl -u harmonysync-folder-service -f"
echo "  • Stop service:  sudo systemctl stop harmonysync-folder-service"
echo "  • Start service: sudo systemctl start harmonysync-folder-service"
echo "  • Restart:       sudo systemctl restart harmonysync-folder-service"
echo "  • Disable:       sudo systemctl disable harmonysync-folder-service"
echo ""
echo "Configure the service by editing:"
echo "  $USER_HOME/.harmonysync/folder-service-config.json"
echo ""
echo "Or use the REST API at http://127.0.0.1:3005"
echo ""
