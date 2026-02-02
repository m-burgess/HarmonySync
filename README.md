# HarmonySync

Modern worship presentation software with multitrack audio, DMX lighting control, and media display capabilities.

## Project Structure

This is a monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces). The repository is organized as follows:

```
├── apps/                           # Application packages
│   ├── electron-app/              # Main desktop app (Electron)
│   ├── renderer/                  # React UI renderer
│   ├── harmonysync-audio-service/ # Audio processing microservice
│   ├── harmonysync-image-service/ # Image processing microservice
│   ├── harmonysync-video-service/ # Video processing microservice
│   ├── control-app/               # Mobile/remote control interface
│   └── mobile-app/                # Mobile application
│
├── packages/                      # Shared packages
│   ├── core/                      # Core types and interfaces
│   ├── shared-logic/              # Business logic and utilities
│   └── ui/                        # UI components and styling
│
└── docs/                          # Documentation
```

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- pnpm (v8 or later)

### Installation

```bash
# Install pnpm globally if you haven't already
npm install -g pnpm

# Install all dependencies across all workspace packages
pnpm install
```

### Development

```bash
# Run all apps and packages in development mode
pnpm dev

# Build all packages
pnpm build

# Run type checking across all packages
pnpm typecheck

# Run tests across all packages
pnpm test
```

### Working with Individual Packages

You can run commands in specific workspaces using pnpm's filtering:

```bash
# Run dev mode for a specific app
pnpm --filter @harmonysync/electron-app dev

# Build a specific package
pnpm --filter @harmonysync/renderer build

# Run tests for a specific app
pnpm --filter @harmonysync/audio-service test
```

## Architecture

HarmonySync uses a microservices architecture:

- **Electron App**: Main desktop application built with Electron
- **Renderer**: React-based UI for presentation views
- **Microservices**: Separate services for audio, image, and video processing
- **Shared Packages**: Common types, logic, and components shared across apps

## Documentation

Comprehensive documentation can be found in the `docs/` directory:

- [Architecture Analysis](docs/ARCHITECTURE_ANALYSIS.md)
- [MVVM Quick Reference](docs/MVVM_QUICK_REFERENCE.md)
- [TypeScript Migration Guide](docs/TYPESCRIPT_MIGRATION_GUIDE.md)
- [Service Architecture](docs/SERVICE_ARCHITECTURE.md)

## License

MIT License - see [docs/LICENSE](docs/LICENSE) for details

## Contributing

This is a monorepo structure. When making changes:

1. Make changes in the appropriate `apps/` or `packages/` directory
2. Run `pnpm typecheck` to verify type safety
3. Run `pnpm test` to ensure tests pass
4. Use workspace dependencies with `workspace:*` protocol in package.json files
