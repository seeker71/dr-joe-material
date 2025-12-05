# Deploy Your Video Library - Free Hosting Guide

Your React app is ready to deploy! Here are **three free hosting options** that will make your library accessible from anywhere on your iPhone.

## 🚀 Option 1: Netlify (Recommended - Easiest)

### Step 1: Create a Netlify Account
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub, Google, or email (free)

### Step 2: Deploy via Drag & Drop (Easiest)
1. **Build your app locally:**
   ```bash
   cd /Users/ursmuff/Downloads/DrJoeCource/video-library
   npm run build
   ```

2. **Drag the `dist` folder** to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Your site will be live in seconds! 🎉

### Step 3: Set Environment Variable (Important!)
1. In Netlify dashboard, go to **Site settings** → **Environment variables**
2. Add a new variable:
   - **Key:** `VITE_MEDIA_BASE_URL`
   - **Value:** `https://archive.org/download/drjoecourse-media`
3. Go to **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

### Step 4: Custom Domain (Optional)
- Netlify gives you a free subdomain like `your-site.netlify.app`
- You can add a custom domain in **Site settings** → **Domain management**

---

## 🌐 Option 2: Vercel (Also Great)

### Step 1: Create a Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (recommended) or email

### Step 2: Deploy via CLI
1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd /Users/ursmuff/Downloads/DrJoeCource/video-library
   vercel
   ```
   - Follow the prompts
   - When asked about environment variables, add:
     - `VITE_MEDIA_BASE_URL` = `https://archive.org/download/drjoecourse-media`

### Step 3: Deploy via GitHub (Alternative)
1. Push your code to GitHub
2. Import the repository in Vercel dashboard
3. Add environment variable in project settings
4. Deploy!

---

## ☁️ Option 3: Cloudflare Pages (Good for Speed)

### Step 1: Create a Cloudflare Account
1. Go to [cloudflare.com](https://cloudflare.com) (free account)

### Step 2: Deploy
1. Go to **Pages** in the dashboard
2. Click **Create a project** → **Upload assets**
3. **Build your app:**
   ```bash
   cd /Users/ursmuff/Downloads/DrJoeCource/video-library
   npm run build
   ```
4. Upload the `dist` folder
5. Add environment variable:
   - **Variable name:** `VITE_MEDIA_BASE_URL`
   - **Value:** `https://archive.org/download/drjoecourse-media`

---

## 📱 Testing on Your iPhone

Once deployed:
1. Open Safari on your iPhone
2. Go to your deployed URL (e.g., `your-site.netlify.app`)
3. Tap a video/audio card to play
4. The player will stream directly from Internet Archive

## 🔄 Updating Your Site

After uploading new files to Internet Archive:

1. **Regenerate the catalog:**
   ```bash
   cd /Users/ursmuff/Downloads/DrJoeCource
   node scripts/generateCatalog.mjs
   ```

2. **Update version (optional but recommended):**
   ```bash
   cd /Users/ursmuff/Downloads/DrJoeCource/video-library
   node scripts/updateVersion.mjs "1.0.1" "Added new meditation tracks"
   ```
   This will:
   - Update the version number in `public/version.json`
   - Add a changelog entry
   - Users will see a notification when they visit the updated site

3. **Rebuild and redeploy:**
   - **Netlify (drag & drop):** Build locally, drag new `dist` folder
   - **Vercel/Cloudflare (GitHub):** Push changes, auto-deploys
   - **Vercel CLI:** Run `vercel --prod` again

### 📋 Automatic Update Detection

The app automatically checks for new versions every 5 minutes. When a new version is detected:
- Users see a modal with the new version number and changelog
- They can choose to refresh immediately or dismiss the notification
- The app will remember the new version and won't show the notification again

To update the version before deploying:
```bash
node scripts/updateVersion.mjs "<version>" "<changelog entry>"
# Example:
node scripts/updateVersion.mjs "1.0.2" "Fixed mobile responsiveness issues"
```

## 🎯 Quick Start (Recommended: Netlify)

```bash
# 1. Build the app
cd /Users/ursmuff/Downloads/DrJoeCource/video-library
npm run build

# 2. Go to https://app.netlify.com/drop
# 3. Drag the 'dist' folder
# 4. Add environment variable in Netlify dashboard
# 5. Done! Your site is live!
```

## 💡 Tips

- **Free tier limits:** All three services offer generous free tiers perfect for personal use
- **Custom domain:** All services support custom domains (you'll need to buy one separately)
- **HTTPS:** All deployments are HTTPS by default (required for iPhone media playback)
- **Auto-deploy:** Connect to GitHub for automatic deployments on every push

---

**Need help?** Check the service documentation:
- [Netlify Docs](https://docs.netlify.com)
- [Vercel Docs](https://vercel.com/docs)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)

