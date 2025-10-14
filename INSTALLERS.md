# Quick Start: Building Installers

## macOS DMG Installer

### Requirements
- macOS 10.13 or later
- Xcode Command Line Tools

### Build Command
```bash
./build-macos.sh
```

### Output
- DMG installer in: `harmonysync/src-tauri/target/release/bundle/dmg/`
- App bundle in: `harmonysync/src-tauri/target/release/bundle/macos/`

---

## Linux AppImage

### Requirements
- Ubuntu 18.04+ or equivalent Linux distribution
- Build dependencies (auto-installed by script)

### Build Command
```bash
./build-appimage.sh
```

### Output
- AppImage in: `harmonysync/src-tauri/target/release/bundle/appimage/`
- Deb package in: `harmonysync/src-tauri/target/release/bundle/deb/`

---

## Windows Installer

For Windows installer creation, see the existing Windows installer script or documentation.

---

## Automated Builds (GitHub Actions)

The repository includes a GitHub Actions workflow that automatically builds installers when you:
- Push a version tag (e.g., `v1.0.0`)
- Manually trigger the workflow

The workflow builds both macOS and Linux installers and uploads them as artifacts.

### Manual Trigger
1. Go to the "Actions" tab in GitHub
2. Select "Build Installers" workflow
3. Click "Run workflow"

---

For detailed instructions, see [BUILD.md](BUILD.md)
