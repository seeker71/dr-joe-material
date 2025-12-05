# Dr Joe Video Library

A mobile-friendly web app to browse, search, and play your Dr Joe Dispenza course videos and audio files stored on Internet Archive.

## Features

- 📱 **Mobile-optimized** - Works great on iPhone and other mobile devices
- 🔍 **Search & Filter** - Search by title, course, or file path
- 🎬 **Video & Audio Player** - Built-in HTML5 players for streaming
- 🏷️ **Collection Filtering** - Filter by course/collection with chips
- ⚡ **Fast & Lightweight** - Pure React, no heavy frameworks

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Media URL

Create a `.env` file in the root directory:

```bash
VITE_MEDIA_BASE_URL=https://archive.org/download/drjoecourse-media
```

Replace with your actual Internet Archive item URL.

### 3. Generate Catalog

Make sure your media catalog is up to date:

```bash
cd ..
node scripts/generateCatalog.mjs
```

This creates `public/catalog.json` with all your media files.

### 4. Run Locally

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 5. Build for Production

```bash
npm run build
```

The `dist` folder contains your production-ready app.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for detailed instructions on deploying to:
- **Netlify** (recommended - easiest)
- **Vercel**
- **Cloudflare Pages**

All three offer free hosting perfect for personal use.

## Project Structure

```
video-library/
├── src/
│   ├── App.tsx          # Main app component
│   ├── App.css          # Styles
│   └── main.tsx         # Entry point
├── public/
│   └── catalog.json     # Media catalog (generated)
├── dist/                # Build output (deploy this)
├── .env                 # Environment variables
└── DEPLOY.md            # Deployment guide
```

## Updating Media

When you add new files to Internet Archive:

1. Regenerate the catalog:
   ```bash
   cd ..
   node scripts/generateCatalog.mjs
   ```

2. Rebuild and redeploy:
   ```bash
   npm run build
   # Then redeploy the dist folder
   ```

## Environment Variables

- `VITE_MEDIA_BASE_URL` - Base URL for your media files (required)
  - Example: `https://archive.org/download/drjoecourse-media`

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari (iPhone/iPad)
- Mobile browsers

## License

Personal use project.
