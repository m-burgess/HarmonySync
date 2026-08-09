#!/bin/bash
set -e

# HarmonySync C++ & Qt Development Server Script
# Usage: ./dev.sh

echo "=========================================="
echo "HarmonySync C++20 / Qt 6 Engine"
echo "=========================================="
echo ""

export PATH="$HOME/.local/bin:$PATH"

if [ ! -d "build" ]; then
    echo "Configuring CMake build environment..."
    cmake -B build -DCMAKE_BUILD_TYPE=Debug
fi

echo "Compiling C++ engine & running test suite..."
cmake --build build
ctest --test-dir build --output-on-failure

echo "Launching HarmonySync executable..."
./build/harmonysync_app
