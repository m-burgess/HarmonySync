#!/bin/bash
set -e

echo "Setting up Python virtual environment for Song Processor..."

cd "$(dirname "$0")"

# Check for python3
if ! command -v python3 &> /dev/null; then
    echo "Python3 could not be found. Please install Python 3."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install --no-build-isolation madmom

echo "Setup complete. Virtual environment created and dependencies installed."
