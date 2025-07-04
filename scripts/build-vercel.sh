#!/bin/bash

# Build script for Vercel deployment
# Builds the frontend and moves files to the correct directory structure

echo "Building for Vercel deployment..."

# Build the frontend with Vite (outputs to dist/public)
npm run build

# If dist/public exists, move its contents to dist
if [ -d "dist/public" ]; then
  echo "Moving files from dist/public to dist..."
  # Create backup of existing dist contents (if any)
  if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    mkdir -p dist/backup
    find dist -maxdepth 1 -type f -exec mv {} dist/backup/ \;
  fi
  
  # Move public contents to dist root
  mv dist/public/* dist/ 2>/dev/null || true
  mv dist/public/.* dist/ 2>/dev/null || true
  
  # Remove empty public directory
  rmdir dist/public 2>/dev/null || true
  
  echo "Files moved successfully"
else
  echo "No dist/public directory found, build may have output directly to dist"
fi

echo "Vercel build complete"