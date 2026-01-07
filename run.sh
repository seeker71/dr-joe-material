#!/bin/bash

# Run script for Dr Joe Video Library
# Sets all required environment variables and starts the dev server
# No need to create a .env file - this script sets everything!

# Extract environment variables from NETLIFY_GIT_SETUP.md
export SUPABASE_URL="https://gcybvbyppzmvfrktjicw.supabase.co"
export SUPABASE_ANON_KEY="sb_publishable_0mVDAvzkUV9V3-4w43X-OQ_lIuncSJ2"
export VITE_MEDIA_BASE_URL="https://archive.org/download/drjoecourse-media"

# Change to video-library directory if not already there
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "🚀 Starting Dr Joe Video Library..."
echo ""
echo "Environment variables set:"
echo "  ✓ SUPABASE_URL"
echo "  ✓ SUPABASE_ANON_KEY"
echo "  ✓ VITE_MEDIA_BASE_URL"
echo ""

# Check if node_modules exists, if not, install dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

echo "Starting dev server..."
echo "Open http://localhost:5173 in your browser"
echo ""

# Run the dev server
npm run dev

