#!/bin/bash

# pRouting Backend Startup Script
# Run this script to start the backend server

echo "Starting pRouting Backend..."

# Check if environment variables are set
if [ -z "$SHAPEFILE_URL" ] && [ -z "$ATTR_CSV_URL" ]; then
    echo "Warning: SHAPEFILE_URL and ATTR_CSV_URL not set. Using dummy data."
fi

# Try to install dependencies if not already installed
echo "Checking dependencies..."
python -c "import flask" 2>/dev/null || echo "Flask not available - using simple HTTP server"
python -c "import geopandas" 2>/dev/null || echo "Geopandas not available - using dummy data"

# Start the server
echo "Starting server on port ${PORT:-5000}..."
python app.py