#!/usr/bin/env bash
set -e

echo "Starting build process..."

# Install dependencies from whichever directory contains requirements.txt
if [ -f "requirements.txt" ]; then
    echo "Installing from requirements.txt..."
    pip install -r requirements.txt
fi

if [ -f "backend/requirements.txt" ]; then
    echo "Installing from backend/requirements.txt..."
    pip install -r backend/requirements.txt
fi

echo "Build completed successfully."
