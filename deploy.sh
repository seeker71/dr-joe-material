#!/bin/bash

# Quick deployment helper script
# This builds your app and prepares it for deployment

set -e

echo "🔨 Building your video library..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Your app is ready in the 'dist' folder"
echo ""
echo "🚀 To deploy:"
echo "   1. Go to https://app.netlify.com/drop"
echo "   2. Drag the 'dist' folder"
echo "   3. Add environment variable in Netlify:"
echo "      VITE_MEDIA_BASE_URL = https://archive.org/download/drjoecourse-media"
echo ""
echo "📱 Or see DEPLOY.md for other hosting options"

