# Building Windows Installer for HarmonySync

This guide explains how to build Windows installers (MSI and NSIS) for HarmonySync Presenter.

## Prerequisites

### 1. Install Required Tools

#### Windows Development Environment
- **Rust**: Install from [rustup.rs](https://rustup.rs/)
- **Node.js**: Install LTS version from [nodejs.org](https://nodejs.org/)
- **Visual Studio Build Tools**: Required for native modules
  - Download from [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/)
  - Select "Desktop development with C++" workload

#### Tauri Prerequisites
Follow the complete guide at: [https://tauri.app/v1/guides/getting-started/prerequisites/](https://tauri.app/v1/guides/getting-started/prerequisites/)

**Key Windows Requirements:**
- Microsoft Visual C++ Build Tools
- WebView2 Runtime (usually pre-installed on Windows 10/11)
- Windows SDK

#### Additional Dependencies for HarmonySync
- **FFmpeg**: Required for audio/video processing
  - Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - Add FFmpeg to your system PATH
  - Ensure `ffmpeg` and `ffprobe` are accessible from command line

### 2. Clone and Setup

```bash
git clone <repository-url>
cd harmonysync
npm install
```

## Building the Installer

### Option 1: NSIS Installer (Recommended)

NSIS creates a lightweight installer executable (.exe) that's commonly used for Windows applications.

```bash
cd harmonysync
npm run tauri build -- --target nsis
```

The installer will be created at:
```
harmonysync/src-tauri/target/release/bundle/nsis/HarmonySync_0.1.0_x64-setup.exe
```

### Option 2: MSI Installer

MSI installers are used in enterprise environments and can be deployed via Group Policy.

**Requirements:**
- WiX Toolset v3.11 or later
- Download from: [https://wixtoolset.org/](https://wixtoolset.org/)

```bash
cd harmonysync
npm run tauri build -- --target msi
```

The installer will be created at:
```
harmonysync/src-tauri/target/release/bundle/msi/HarmonySync_0.1.0_x64_en-US.msi
```

### Option 3: Build Both Installers

```bash
cd harmonysync
npm run tauri build
```

This will create both NSIS and MSI installers by default when running on Windows.

## Installer Configuration

The installer configuration is defined in `harmonysync/src-tauri/tauri.conf.json`:

### Key Configuration Options

#### General Bundle Settings
```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "publisher": "HarmonySync Team",
    "copyright": "Copyright © 2024 HarmonySync Team. All rights reserved.",
    "category": "Productivity",
    "shortDescription": "Modern Worship & Media Software",
    "longDescription": "..."
  }
}
```

#### NSIS-Specific Settings
```json
{
  "bundle": {
    "windows": {
      "nsis": {
        "installMode": "perMachine",
        "languages": ["English"],
        "compression": "lzma",
        "startMenuFolder": "HarmonySync"
      }
    }
  }
}
```

- **installMode**: `perMachine` (requires admin) or `perUser` (per-user install)
- **languages**: Supported installer languages
- **compression**: `lzma` (best compression) or `zlib` (faster)
- **startMenuFolder**: Name of Start Menu folder

#### WiX/MSI-Specific Settings
```json
{
  "bundle": {
    "windows": {
      "wix": {
        "language": "en-US",
        "skipWebviewInstall": false,
        "enableElevatedUpdateRuntime": false
      }
    }
  }
}
```

## Customizing the Installer

### Adding Custom Images

#### NSIS Installer Images
1. **Header Image**: 150x57 pixels, BMP format
   - Place at: `harmonysync/src-tauri/icons/nsis-header.bmp`
   - Update config: `"headerImage": "icons/nsis-header.bmp"`

2. **Sidebar Image**: 164x314 pixels, BMP format
   - Place at: `harmonysync/src-tauri/icons/nsis-sidebar.bmp`
   - Update config: `"sidebarImage": "icons/nsis-sidebar.bmp"`

#### WiX Installer Images
1. **Banner**: 493x58 pixels, BMP format
   - Place at: `harmonysync/src-tauri/icons/wix-banner.bmp`
   - Update config: `"bannerPath": "icons/wix-banner.bmp"`

2. **Dialog Image**: 493x312 pixels, BMP format
   - Place at: `harmonysync/src-tauri/icons/wix-dialog.bmp`
   - Update config: `"dialogImagePath": "icons/wix-dialog.bmp"`

### Adding a License Agreement

1. Create a license file (RTF or TXT format)
2. Place it in `harmonysync/src-tauri/`
3. Update configuration:

For NSIS:
```json
"nsis": {
  "license": "LICENSE.txt"
}
```

For WiX:
```json
"wix": {
  "license": "LICENSE.rtf"
}
```

### Code Signing (Optional but Recommended)

To sign your installer with a code signing certificate:

1. Obtain a code signing certificate (from DigiCert, Sectigo, etc.)
2. Update configuration:
```json
"windows": {
  "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT",
  "digestAlgorithm": "sha256",
  "timestampUrl": "http://timestamp.digicert.com"
}
```

## Troubleshooting

### WebView2 Not Found
If users encounter WebView2 errors:
- WebView2 is automatically installed on Windows 10/11 (version 1803+)
- For older systems, users need to install it from: [https://developer.microsoft.com/en-us/microsoft-edge/webview2/](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### FFmpeg Not Found
Ensure FFmpeg is installed and in the system PATH before building.

### Build Fails on Windows
- Ensure all Visual Studio Build Tools are installed
- Run builds from "Developer Command Prompt for VS"
- Check that Rust and Node.js are properly installed

### WiX Not Found
If MSI build fails:
- Download and install WiX Toolset v3.11+
- Add WiX bin directory to system PATH
- Restart command prompt/terminal

## Distribution

### NSIS Installer
- Standalone executable
- Can be distributed directly
- Approximately 40-60 MB depending on dependencies
- Users run the .exe to install

### MSI Installer
- Can be deployed via Group Policy in enterprise environments
- Supports administrative installation
- Can be customized with MSI editors (e.g., Orca)
- Better for enterprise deployments

## Testing the Installer

1. **Test on Clean VM**: Always test on a clean Windows installation
2. **Verify Installation**: Check that all files are installed correctly
3. **Test Shortcuts**: Verify desktop and Start Menu shortcuts work
4. **Test Uninstall**: Ensure clean uninstallation removes all files
5. **Check Updates**: Test the update mechanism if implemented

## Installer Features

The HarmonySync installer includes:
- ✅ Desktop shortcut creation
- ✅ Start Menu shortcut
- ✅ Automatic WebView2 installation (if needed)
- ✅ File association support (can be added)
- ✅ Add/Remove Programs entry
- ✅ Clean uninstallation
- ✅ Per-machine or per-user installation (configurable)

## Next Steps

After building your installer:
1. Test thoroughly on different Windows versions (10, 11)
2. Consider code signing for production releases
3. Set up CI/CD for automated builds (GitHub Actions, etc.)
4. Create release notes and documentation
5. Distribute via website or update server

## Resources

- [Tauri Documentation](https://tauri.app/)
- [NSIS Documentation](https://nsis.sourceforge.io/Docs/)
- [WiX Toolset Documentation](https://wixtoolset.org/documentation/manual/)
- [Windows Code Signing](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
