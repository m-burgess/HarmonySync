# HarmonySync AppImage Launcher (No Sandbox)

This directory contains scripts to launch HarmonySync AppImage builds without sandboxing restrictions.

## Problem

The standard AppImage build runs in a sandboxed environment that blocks:
- Dynamic loading of external scripts (like YouTube IFrame API)
- Certain network requests
- External API access

This prevents YouTube playlists from loading in the preservice music feature.

## Solution

Use the provided launcher script to run HarmonySync without sandboxing.

## Usage

### Method 1: Using the Launcher Script
```bash
# From the harmonysync directory:
./scripts/launch-harmonysync.sh

# Or from anywhere:
path/to/harmonysync/scripts/launch-harmonysync.sh
```

### Method 2: Direct AppImage Launch
```bash
./harmonysync.AppImage --no-sandbox
```

### Method 3: Desktop Integration
1. Copy `harmonysync-nosandbox.desktop` to `~/.local/share/applications/`
2. Edit the `Exec` line to point to the correct path of `launch-harmonysync.sh`
3. The app will appear in your application menu

## Files

- `launch-harmonysync.sh` - Bash script that finds and launches the AppImage with --no-sandbox
- `harmonysync-nosandbox.desktop` - Desktop file for menu integration

## Security Note

Running without sandboxing reduces security isolation. Only use this for trusted applications and ensure you have proper antivirus protection.