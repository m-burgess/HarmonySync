# Windows Installer Quick Reference

## Quick Start

### Prerequisites Checklist
- ✅ Rust installed (from rustup.rs)
- ✅ Node.js installed (LTS version)
- ✅ Visual Studio Build Tools installed
- ✅ FFmpeg in system PATH
- ✅ WiX Toolset (only for MSI builds)

### Build Commands

```bash
cd harmonysync

# NSIS installer (recommended for end users)
npm run tauri build -- --target nsis

# MSI installer (for enterprise deployment)
npm run tauri build -- --target msi

# Both installers
npm run tauri build
```

### Using Build Scripts

**Windows Batch Script:**
```cmd
cd harmonysync
build-installer.bat
```

**PowerShell Script:**
```powershell
cd harmonysync
.\build-installer.ps1
```

## Output Locations

```
harmonysync/
└── src-tauri/
    └── target/
        └── release/
            └── bundle/
                ├── nsis/
                │   └── HarmonySync_0.1.0_x64-setup.exe
                └── msi/
                    └── HarmonySync_0.1.0_x64_en-US.msi
```

## Installer Types Comparison

| Feature | NSIS | MSI |
|---------|------|-----|
| File Size | Smaller (~40-60 MB) | Larger (~50-70 MB) |
| Installation Speed | Faster | Slower |
| Enterprise Deployment | No | Yes (Group Policy) |
| Customization | High | Medium |
| Admin Rights | Optional | Required |
| Best For | End users | Enterprise/IT |

## Configuration Location

All installer settings are in: `harmonysync/src-tauri/tauri.conf.json`

Key sections:
- `bundle.publisher` - Company/developer name
- `bundle.copyright` - Copyright notice
- `bundle.windows.nsis` - NSIS-specific settings
- `bundle.windows.wix` - MSI-specific settings

## Common Issues

### "Rust not found"
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### "Node.js not found"
Download and install from: https://nodejs.org/

### "FFmpeg not found"
1. Download FFmpeg from https://ffmpeg.org/
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add `C:\ffmpeg\bin` to system PATH

### "WiX not found" (MSI only)
1. Download WiX from https://wixtoolset.org/
2. Install WiX Toolset
3. Add WiX bin directory to system PATH

### "WebView2 not found"
WebView2 is included in Windows 10/11. For older systems:
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

## Testing

1. **Test on clean Windows VM**
2. **Run the installer**
3. **Verify application launches**
4. **Check shortcuts work** (Desktop, Start Menu)
5. **Test uninstaller**

## Distribution

### End Users (NSIS)
- Share the `.exe` file
- Users run installer
- No additional requirements

### Enterprise (MSI)
- Deploy via Group Policy
- Can be silently installed: `msiexec /i HarmonySync.msi /quiet`
- Supports administrative installations

## Code Signing (Optional)

To sign installers:
1. Obtain code signing certificate
2. Update `tauri.conf.json`:
```json
"windows": {
  "certificateThumbprint": "YOUR_THUMBPRINT",
  "timestampUrl": "http://timestamp.digicert.com"
}
```

## Need Help?

- Full documentation: [docs/BUILDING_WINDOWS_INSTALLER.md](BUILDING_WINDOWS_INSTALLER.md)
- Tauri docs: https://tauri.app/
- NSIS docs: https://nsis.sourceforge.io/
- WiX docs: https://wixtoolset.org/

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Build Windows Installer

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies
        run: npm install
        working-directory: ./harmonysync
      
      - name: Build Windows installer
        run: npm run tauri build
        working-directory: ./harmonysync
      
      - name: Upload installer
        uses: actions/upload-artifact@v3
        with:
          name: windows-installer
          path: harmonysync/src-tauri/target/release/bundle/nsis/*.exe
```

## Version Updates

To update version number:
1. Edit `harmonysync/package.json` - change `version`
2. Edit `harmonysync/src-tauri/tauri.conf.json` - change `version`
3. Edit `harmonysync/src-tauri/Cargo.toml` - change `version`

Rebuild to create installer with new version.
