# Building HarmonySync Presenter Installers

This document provides instructions for building platform-specific installers for HarmonySync Presenter.

## Prerequisites

### All Platforms
- [Node.js](https://nodejs.org/) (LTS version) and npm
- [Rust](https://www.rust-lang.org/tools/install) (latest stable version)

### macOS
- macOS 10.13 or later
- Xcode Command Line Tools: `xcode-select --install`

### Linux (for AppImage)
- Ubuntu 18.04+ or equivalent Linux distribution
- Required system packages (will be installed by the build script if missing):
  ```bash
  sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev librsvg2-dev patchelf file
  ```

## Building macOS Installer (DMG)

### Using the Build Script

The easiest way to build the macOS installer is using the provided build script:

```bash
./build-macos.sh
```

This script will:
1. Install npm dependencies
2. Build the frontend
3. Build the Tauri application
4. Create a `.app` bundle and `.dmg` installer

### Output Location

After a successful build, you'll find:
- **App Bundle**: `harmonysync/src-tauri/target/release/bundle/macos/harmonysync.app`
- **DMG Installer**: `harmonysync/src-tauri/target/release/bundle/dmg/harmonysync_*.dmg`

### Manual Build

If you prefer to build manually:

```bash
cd harmonysync
npm install
npm run build
npm run tauri build -- --target universal-apple-darwin
```

### Distribution

The DMG file can be distributed to end users. They can:
1. Download the DMG file
2. Open it
3. Drag HarmonySync to their Applications folder
4. Launch the app from Applications

## Building Linux AppImage

### Using the Build Script

The easiest way to build the AppImage is using the provided build script:

```bash
./build-appimage.sh
```

This script will:
1. Install npm dependencies
2. Build the frontend
3. Install required system dependencies (if needed)
4. Build the Tauri application
5. Create an AppImage

### Output Location

After a successful build, you'll find:
- **AppImage**: `harmonysync/src-tauri/target/release/bundle/appimage/harmonysync_*.AppImage`
- **Deb Package**: `harmonysync/src-tauri/target/release/bundle/deb/harmonysync_*.deb`

### Manual Build

If you prefer to build manually:

```bash
cd harmonysync
npm install
npm run build
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

### Distribution

The AppImage is a portable application that can run on most Linux distributions:

1. Download the AppImage file
2. Make it executable: `chmod +x harmonysync_*.AppImage`
3. Run it: `./harmonysync_*.AppImage`

No installation required! The AppImage contains all necessary dependencies.

## Bundle Configuration

The installer configuration is defined in `harmonysync/src-tauri/tauri.conf.json` under the `bundle` section. Key settings include:

- **Publisher**: HarmonySync
- **Category**: Productivity
- **Minimum macOS Version**: 10.13
- **Linux AppImage**: Configured for x86_64 architecture

## Troubleshooting

### macOS Build Issues

**Issue**: "xcrun: error: unable to find utility"
- **Solution**: Install Xcode Command Line Tools: `xcode-select --install`

**Issue**: Code signing errors
- **Solution**: For development builds, the app is unsigned. For distribution, you'll need an Apple Developer account and code signing certificate.

### Linux Build Issues

**Issue**: "webkit2gtk not found"
- **Solution**: Install required dependencies:
  ```bash
  sudo apt-get install libwebkit2gtk-4.1-dev
  ```

**Issue**: AppImage doesn't run on older distributions
- **Solution**: The AppImage is built on the current system. Building on an older LTS release (like Ubuntu 18.04) will provide better compatibility.

## GitHub Actions / CI

For automated builds, consider setting up GitHub Actions workflows. Example workflow files can include:

### macOS Workflow
```yaml
name: Build macOS

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      - name: Build macOS Installer
        run: ./build-macos.sh
      - name: Upload DMG
        uses: actions/upload-artifact@v4
        with:
          name: macos-dmg
          path: harmonysync/src-tauri/target/release/bundle/dmg/*.dmg
```

### Linux Workflow
```yaml
name: Build Linux

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      - name: Build AppImage
        run: ./build-appimage.sh
      - name: Upload AppImage
        uses: actions/upload-artifact@v4
        with:
          name: linux-appimage
          path: harmonysync/src-tauri/target/release/bundle/appimage/*.AppImage
```

## Additional Resources

- [Tauri Building Documentation](https://tauri.app/v1/guides/building/)
- [Tauri Bundle Documentation](https://tauri.app/v1/guides/building/bundle)
- [AppImage Documentation](https://appimage.org/)
- [macOS Code Signing Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

## License

MIT License - see LICENSE file for details.
