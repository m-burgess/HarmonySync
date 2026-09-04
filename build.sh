#!/bin/bash
# Builds both the main HarmonySync host app and the Musician companion app

set -e

echo "Building HarmonySync..."
mkdir -p build
cd build

# Configure CMake if needed
cmake ..

# Build all targets (which includes both harmonysync_app and harmonysync_musician_app)
make -j$(nproc)

echo "Build complete!"
echo "Main App: ./build/harmonysync_app"
echo "Musician App: ./build/harmonysync_musician_app"
