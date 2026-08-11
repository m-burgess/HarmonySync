# HarmonySync

Modern worship presentation software with multitrack audio, DMX lighting control, and high-performance media display capabilities.

**This is a Test-Driven Development (TDD) Application** - All new features and changes should be developed with comprehensive tests to ensure reliability and maintainability.

## Project Overview

HarmonySync is a comprehensive presentation solution designed for modern worship environments. It integrates multitrack audio playback, synchronized lighting control, and multi-screen display management into a single, cohesive system.

### Product Vision & Core Workflow

The core philosophy of HarmonySync is to be a **zero-layout, packaged presentation software**. Unlike traditional presentation software that forces users to manually build slide layouts, import media, and configure complex presentations every week, HarmonySync is entirely driven by folder structures and simple configuration files.

- **JSON-Driven Configuration**: Everything is configured via simple `.json` files that can be stored and collaborated on via Google Drive.
- **Automated Service Orders**: The service order folder is downloaded from the cloud. Once the main service folder is selected in the app, all subfolders automatically populate as clickable, ready-to-run service order items.
- **Ready to Display**: Media and lyrics are instantly ready to be displayed on Audience, Stage, and Livestream (Lower Thirds) outputs without *any* manual slide building or extra configuration required.

### Key Features

- **Multitrack Audio**: High-performance audio playback with real-time transposition, stem mixing, and MIDI synchronization.
- **Triple-Screen Output**: Dedicated outputs for Audience (full-screen lyrics/video), Confidence Monitor (chords/notes), and Lower Thirds (chroma-key transparent output).
- **Go Media Engine**: A high-performance media processing engine built in Go for low-latency audio/video handling.
- **Musician View**: Real-time remote control and display for musicians on mobile devices, including chords and lyric sync.
- **Canva Integration**: Directly import and display presentation slides from Canva.
- **Automation & Scripting**: Powerful scripting engine and DMX/MIDI automation for seamless service transitions.
- **Cloud Sync**: Integrated support for Google Drive and Dropbox for asset management.
- **YouTube Integration**: Stream and playback YouTube content directly within the presentation.

## Project Structure

This is a monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces).

```
├── apps/
│   ├── electron-app/       # Main desktop application (Electron + TypeScript)
│   ├── angular-renderer/   # Primary UI and presentation engine (Angular 21)
│   ├── media-engine/       # High-performance Go-based media engine
│   ├── mobile-app/         # Remote control / Musician View (React + Vite)
│   └── harmonysync-tests/  # Comprehensive test suites
│
├── harmonysync-core-logic/ # Shared business logic and state management
├── docs/                   # Engineering documentation and guidelines
└── packages/               # Shared libraries and types
```

## Getting Started

### Prerequisites

- **Node.js**: v20 or later
- **Go**: 1.21 or later (for building the media engine)
- **pnpm**: v9 or later
- **FFmpeg**: Required for media processing services

### Installation

```bash
# Install dependencies
pnpm install

# Build the Go Media Engine
cd apps/media-engine
go build -o harmonysync-media-engine
```

### Development

The easiest way to start developing is to use the provided scripts:

```bash
# Start all components in development mode
pnpm dev
```

This will concurrently:
1. Start the Angular dev server (UI)
2. Start the Electron main process
3. Initialize the Go Media Engine

### Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific workspace
pnpm --filter @harmonysync/electron-app test
```

## Architecture

HarmonySync utilizes a modern, hybrid architecture:

1. **Host (Electron)**: Orchestrates the application lifecycle, manages windowing, and handles system-level integrations (MIDI, DMX, File System).
2. **Frontend (Angular)**: A high-performance UI layer for the control interface and presentation screens.
3. **Media Engine (Go)**: A dedicated, low-latency microservice for audio/video processing, communicating via HTTP/WebSocket.
4. **Remote Layer**: A Socket.IO based communication system that powers the Musician View and remote control functionality.

## Documentation

- [UI Guidelines](docs/UI_GUIDELINES.md) - Design standards and principles.
- [Architecture Analysis](docs/ARCHITECTURE_ANALYSIS.md) - Deep dive into system design.
- [Service Architecture](docs/SERVICE_ARCHITECTURE.md) - Communication between Electron and the Media Engine.

## Developer Guide

### Feature Development Workflow

1. **Service Layer**: Implement logic in `apps/electron-app/electron/services/` or `apps/media-engine/` if performance-critical.
2. **IPC Integration**: Exposed via `apps/electron-app/ipc-handlers.ts`.
3. **Frontend Implementation**: Add components and services to `apps/angular-renderer`.
4. **Remote Access**: If applicable, update `remote-control-service` to expose functionality to `mobile-app`.

### Testing Standards

- **Unit Tests**: Required for all new services and logic.
- **Integration Tests**: Required for cross-process communication (Electron <-> Media Engine).
- **UI Tests**: Recommended for complex user interaction flows.

---

## License

MIT License - see [docs/LICENSE](docs/LICENSE) for details.
