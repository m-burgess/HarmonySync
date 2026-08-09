#!/bin/bash
set -e

# HarmonySync C++ & Qt Clean & Build Script
# Usage: ./dev-rebuild.sh

echo "=========================================="
echo "HarmonySync C++ / Qt Rebuild"
echo "=========================================="
echo ""

export PATH="$HOME/.local/bin:$PATH"

echo "Step 1: Removing build directory..."
rm -rf build

echo "Step 2: Reconfiguring CMake build environment..."
cmake -B build -DCMAKE_BUILD_TYPE=Debug

echo "Step 3: Compiling C++ engine & targets..."
cmake --build build

echo "Step 4: Running CTest test suite..."
ctest --test-dir build --output-on-failure

echo "=========================================="
echo "✅ Clean Rebuild & Verification Complete!"
echo "Run './dev.sh' to launch HarmonySync"
echo "=========================================="
