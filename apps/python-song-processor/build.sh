#!/bin/bash
set -e

echo "=========================================="
echo "Building Python Song Processor Binary..."
echo "=========================================="

cd "$(dirname "$0")"

# Ensure venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate and install dependencies
source venv/bin/activate
echo "Installing/verifying dependencies..."
pip install -r requirements.txt
pip install --no-build-isolation madmom

# Note: We now bundle the venv directly via electron-builder instead of using PyInstaller.
echo "Build complete! Python environment is ready."
