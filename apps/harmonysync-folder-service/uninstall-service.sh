#!/bin/bash

# HarmonySync Folder Service - Systemd Uninstallation Script

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Uninstalling HarmonySync Folder Service                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

SERVICE_FILE="/etc/systemd/system/harmonysync-folder-service.service"

# Stop service
echo "🛑 Stopping service..."
systemctl stop harmonysync-folder-service 2>/dev/null || true

# Disable service
echo "🔧 Disabling service..."
systemctl disable harmonysync-folder-service 2>/dev/null || true

# Remove service file
if [ -f "$SERVICE_FILE" ]; then
  echo "🗑️  Removing service file..."
  rm "$SERVICE_FILE"
  echo "✅ Service file removed"
else
  echo "⚠️  Service file not found"
fi

# Reload systemd
echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✅ Uninstallation Complete!                             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Note: Configuration file and extracted services are preserved at:"
echo "  ~/.harmonysync/"
echo ""
echo "To remove them manually, run:"
echo "  rm -rf ~/.harmonysync/folder-service-config.json"
echo "  rm -rf ~/.harmonysync/imported-services"
echo ""
