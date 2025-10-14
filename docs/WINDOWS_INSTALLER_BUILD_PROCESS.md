# Windows Installer Build Process

This document describes the build process for creating Windows installers for HarmonySync.

## Build Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer/CI System                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Start Build
                              ▼
                    ┌──────────────────┐
                    │  Prerequisites   │
                    │  - Rust          │
                    │  - Node.js       │
                    │  - VS Build Tools│
                    │  - FFmpeg        │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  npm install     │
                    │  (Frontend deps) │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  npm run build   │
                    │  (Vite build)    │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ cargo build      │
                    │ (Rust backend)   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Tauri Bundler    │
                    │ reads config     │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
          ┌──────────────────┐  ┌──────────────────┐
          │  NSIS Builder    │  │  WiX Builder     │
          │  (if selected)   │  │  (if selected)   │
          └──────────────────┘  └──────────────────┘
                    │                   │
                    ▼                   ▼
          ┌──────────────────┐  ┌──────────────────┐
          │ .exe Installer   │  │ .msi Installer   │
          │ (40-60 MB)       │  │ (50-70 MB)       │
          └──────────────────┘  └──────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Output Bundle   │
                    │  Directory       │
                    └──────────────────┘
```

## Detailed Build Steps

### 1. Frontend Build (Vite)

```
src/ (React components)
├── App.jsx
├── MultitrackPlayer.jsx
├── SlideManager.jsx
└── ...
         │
         ▼
    Vite Build
         │
         ▼
dist/ (Optimized bundle)
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
├── audience.html
├── confidence.html
└── lowerthirds.html
```

### 2. Backend Build (Rust)

```
src-tauri/src/
├── main.rs
├── lib.rs
└── application/
         │
         ▼
  Cargo Build
  (Release Mode)
         │
         ▼
target/release/
└── app.exe
   (Rust binary)
```

### 3. Asset Collection

```
Tauri Bundler collects:
├── Frontend dist/
├── Rust binary
├── Icons (icon.ico)
├── WebView2 bootstrapper
└── Configuration
```

### 4. NSIS Packaging

```
NSIS Script Generation
├── Install paths
├── Registry entries
├── Shortcuts
├── Uninstaller
└── WebView2 check
         │
         ▼
    NSIS Compile
         │
         ▼
HarmonySync_0.1.0_x64-setup.exe
```

### 5. WiX/MSI Packaging

```
WiX XML Generation
├── Product definition
├── Component groups
├── Feature tree
├── UI dialogs
└── Registry keys
         │
         ▼
   WiX Compile
   (candle.exe)
         │
         ▼
   WiX Link
   (light.exe)
         │
         ▼
HarmonySync_0.1.0_x64_en-US.msi
```

## Configuration Flow

```
tauri.conf.json
│
├── productName ─────────────────────► Installer title
├── version ─────────────────────────► Installer version
├── identifier ──────────────────────► App ID
│
├── bundle
│   ├── publisher ───────────────────► Company name
│   ├── copyright ───────────────────► Copyright notice
│   ├── icon ────────────────────────► Application icons
│   │
│   └── windows
│       ├── nsis
│       │   ├── installMode ─────────► System/User install
│       │   ├── compression ─────────► lzma/zlib
│       │   └── startMenuFolder ─────► Menu folder name
│       │
│       └── wix
│           ├── language ────────────► Installer language
│           └── skipWebviewInstall ──► WebView2 handling
│
└── build
    ├── frontendDist ────────────────► Frontend output
    ├── beforeBuildCommand ──────────► Pre-build script
    └── devUrl ──────────────────────► Dev server URL
```

## Build Commands Reference

### Using npm Scripts

```bash
# Development
npm run tauri dev          # Run in development mode

# Production builds
npm run tauri build        # Build all targets (NSIS + MSI)
npm run tauri build -- --target nsis  # NSIS only
npm run tauri build -- --target msi   # MSI only
```

### Using Custom Scripts

```bash
# Windows Batch
.\build-installer.bat      # Interactive menu

# PowerShell
.\build-installer.ps1      # Interactive menu
```

### Using Tauri CLI Directly

```bash
# Install Tauri CLI globally (optional)
npm install -g @tauri-apps/cli

# Build commands
tauri build                # All targets
tauri build --target nsis  # NSIS only
tauri build --target msi   # MSI only
tauri build --debug        # Debug build
```

## CI/CD Build Flow

```
GitHub Push/Tag
     │
     ▼
GitHub Actions Trigger
     │
     ├─► Checkout code
     ├─► Setup Node.js
     ├─► Setup Rust
     ├─► Cache dependencies
     ├─► npm install
     ├─► npm run tauri build
     │   │
     │   ├─► Build NSIS
     │   └─► Build MSI
     │
     ├─► Upload artifacts
     │   ├─► NSIS artifact
     │   └─► MSI artifact
     │
     └─► Create GitHub Release (if tag)
         ├─► Attach NSIS installer
         └─► Attach MSI installer
```

## Output Structure

```
harmonysync/
└── src-tauri/
    └── target/
        └── release/
            ├── app.exe                    # Raw executable
            ├── bundle/
            │   ├── nsis/
            │   │   ├── HarmonySync_0.1.0_x64-setup.exe
            │   │   └── HarmonySync_0.1.0_x64-setup.exe.zip (if code signed)
            │   │
            │   └── msi/
            │       ├── HarmonySync_0.1.0_x64_en-US.msi
            │       └── HarmonySync_0.1.0_x64_en-US.msi.zip (if code signed)
            │
            └── deps/                      # Rust dependencies
```

## Installation Flow (End User)

### NSIS Installer

```
User runs .exe
     │
     ▼
UAC Prompt (if perMachine)
     │
     ▼
Welcome Screen
     │
     ▼
License Agreement (if configured)
     │
     ▼
Installation Directory Selection
     │
     ▼
Components Selection (if configured)
     │
     ▼
WebView2 Check
     │
     ├─► Install WebView2 (if needed)
     │
     ▼
Copy Files
     │
     ├─► Program Files/HarmonySync/
     ├─► Create shortcuts
     │   ├─► Desktop
     │   └─► Start Menu/HarmonySync/
     │
     ├─► Registry entries
     │   └─► Uninstall information
     │
     ▼
Installation Complete
```

### MSI Installer

```
User runs .msi
     │
     ▼
Windows Installer Service
     │
     ▼
UAC Prompt
     │
     ▼
Installation Type
├─► Typical
├─► Custom
└─► Complete
     │
     ▼
Feature Selection (if custom)
     │
     ▼
Ready to Install
     │
     ▼
Installation Progress
     │
     ├─► Copy files
     ├─► WebView2 check
     ├─► Create shortcuts
     └─► Register application
     │
     ▼
Installation Complete
```

## Troubleshooting Build Issues

### Common Build Failures

```
Build Error
     │
     ├─► "Rust not found"
     │   └─► Install Rust from rustup.rs
     │
     ├─► "Node.js not found"
     │   └─► Install Node.js LTS
     │
     ├─► "FFmpeg not found"
     │   └─► Install FFmpeg and add to PATH
     │
     ├─► "WiX not found"
     │   └─► Install WiX Toolset (for MSI)
     │
     ├─► "Build failed: missing dependencies"
     │   └─► Run: npm install
     │
     └─► "WebView2 not found"
         └─► Usually auto-installed on Windows 10/11
```

## Performance Metrics

### Build Times (Typical)

```
Frontend Build (Vite):      ~30-60 seconds
Backend Build (Rust):       ~2-5 minutes (first build)
                           ~30-90 seconds (incremental)
NSIS Packaging:            ~10-30 seconds
MSI Packaging:             ~20-40 seconds
Total (both installers):   ~4-7 minutes (first build)
                           ~2-4 minutes (incremental)
```

### Installer Sizes

```
Uncompressed Application:   ~150-200 MB
NSIS Installer (.exe):      ~40-60 MB (lzma compression)
MSI Installer (.msi):       ~50-70 MB
```

## References

- [Tauri Build Documentation](https://tauri.app/v1/guides/building/)
- [Vite Build Documentation](https://vitejs.dev/guide/build.html)
- [Cargo Build Documentation](https://doc.rust-lang.org/cargo/commands/cargo-build.html)
- [NSIS Documentation](https://nsis.sourceforge.io/Docs/)
- [WiX Toolset Documentation](https://wixtoolset.org/documentation/)
