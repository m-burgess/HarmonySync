# Native C++ Audio Module

This directory contains the C++ native addon for HarmonySync audio service.

## Structure

- **`audio_buffer_pool.h/cpp`** - Memory-efficient buffer pool implementation
  - SIMD-aligned memory allocation (16-byte alignment)
  - Lock-free acquire/release operations
  - Pre-allocated buffers to avoid real-time allocation
  
- **`binding.cpp`** - N-API bindings for Node.js integration
  - Zero-copy data transfer via TypedArrays
  - Promise-based async operations
  - Proper error handling and resource cleanup

- **`types.d.ts`** - TypeScript type definitions

## Building

```bash
# Install dependencies
npm install

# Build native addon
npm run build:native

# Or rebuild from scratch
npm run rebuild:native
```

## Usage

```typescript
import { AudioBufferPool } from 'harmonysync-audio-native';

// Create pool: 16 buffers, 4096 frames each, stereo
const pool = new AudioBufferPool(16, 4096, 2);

// Acquire buffer
const buffer = pool.acquireBuffer(); // Float32Array[8192]

// Use buffer...
// buffer contains interleaved samples: [L, R, L, R, ...]

// Return to pool
pool.releaseBuffer(buffer);

// Cleanup
pool.destroy();
```

## Platform Support

- ✅ Windows (MSVC 2019+)
- ✅ Linux (GCC 7+, Clang 6+)
- ✅ macOS (Xcode 10+)

## Requirements

### Windows
- Visual Studio 2019 or later with C++ build tools
- Python 3.x

### Linux
```bash
sudo apt-get install build-essential python3
```

### macOS
```bash
xcode-select --install
```

## Performance

The buffer pool is designed for real-time audio with:
- Lock-free fast path (no mutex in common case)
- SIMD-aligned buffers for vectorized operations
- Zero-copy integration with JavaScript
- Pre-allocation to avoid GC pressure

## Memory Management

Buffers use shared ownership (shared_ptr) with custom deleters:
1. JavaScript acquires buffer → gets Float32Array view
2. C++ retains ownership via shared_ptr
3. When JavaScript releases → shared_ptr ref count decrements
4. Buffer automatically returns to pool when no references remain

This ensures buffers are never freed while JavaScript is using them.
