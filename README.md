# Dr Joe Video Library

A mobile-friendly web app to browse, search, and play your Dr Joe Dispenza course videos and audio files stored on Internet Archive.

## Features

- 📱 **Mobile-optimized** - Works great on iPhone and other mobile devices
- 🔍 **Search & Filter** - Search by title, course, or file path
- 🎬 **Video & Audio Player** - Built-in HTML5 players for streaming
- 🏷️ **Collection Filtering** - Filter by course/collection with chips
- ⚡ **Fast & Lightweight** - Pure React, no heavy frameworks

## Quick Start

All commands should be run from the `video-library` directory:

```bash
cd video-library
```

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Media URL

Create a `.env` file in the `video-library` directory:

```bash
VITE_MEDIA_BASE_URL=https://archive.org/download/drjoecourse-media
```

Replace with your actual Internet Archive item URL.

### 3. Generate Catalog

Make sure your media catalog is up to date (run from parent directory):

```bash
cd ..
node scripts/generateCatalog.mjs
cd video-library
```

This creates `public/catalog.json` with all your media files.

### 4. Run Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser. The app will hot-reload when you make changes.

### 5. Test Production Build Locally

Before deploying, test the production build:

```bash
npm run build
npm run preview
```

This builds the app and serves it locally at `http://localhost:4173` so you can verify everything works.

### 6. Build for Production

```bash
npm run build
```

The `dist` folder contains your production-ready app.

## Deployment

### Quick Deploy to Netlify

**Option 1: Netlify CLI (Recommended for regular updates)**

If you have Netlify CLI set up (see [AUTO_DEPLOY.md](./AUTO_DEPLOY.md)):

```bash
npm run deploy
```

This builds and deploys to production in one command.

**Option 2: Drag & Drop (Easiest for first-time setup)**

1. Build the app:
   ```bash
   npm run build
   ```

2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the `dist` folder to the page
4. Add environment variable in Netlify dashboard:
   - Go to **Site settings** → **Environment variables**
   - Add `VITE_MEDIA_BASE_URL` = `https://archive.org/download/drjoecourse-media`
   - Go to **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

### Other Hosting Options

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
   cd video-library
   ```

2. Rebuild and redeploy:
   ```bash
   npm run build
   ```
   
   Then deploy:
   - **Netlify CLI**: `npm run deploy`
   - **Drag & Drop**: Drag the new `dist` folder to [app.netlify.com/drop](https://app.netlify.com/drop)
   - **Git Integration**: Just commit and push (auto-deploys if set up)

## Environment Variables

- `VITE_MEDIA_BASE_URL` - Base URL for your media files (required)
  - Example: `https://archive.org/download/drjoecourse-media`

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari (iPhone/iPad)
- Mobile browsers

## License

Personal use project.
