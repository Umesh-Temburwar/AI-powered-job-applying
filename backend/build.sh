#!/usr/bin/env bash
set -e

echo "Starting backend build process..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi
echo "Backend build completed successfully."
