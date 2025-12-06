# Automatic Deployment Setup

This guide will help you set up automatic deployments to `dr-joe-material.netlify.app`.

## Option 1: Netlify CLI (Quick Setup - Recommended)

This allows you to deploy with a single command: `npm run deploy`

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify

```bash
netlify login
```

This will open your browser to authenticate.

### Step 3: Link to Your Site

```bash
cd /Users/ursmuff/Downloads/DrJoeCource/video-library
netlify link
```

When prompted:
- **Site name**: `dr-joe-material` (or select it from the list)
- **Site ID**: It will auto-detect if you're already logged in

### Step 4: Deploy!

Now you can deploy with:
```bash
npm run deploy
```

Or manually:
```bash
netlify deploy --prod
```

---

## Option 2: Git Integration (Automatic on Push)

This automatically deploys whenever you push to GitHub/GitLab.

### Step 1: Initialize Git Repository

```bash
cd /Users/ursmuff/Downloads/DrJoeCource/video-library
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Create GitHub Repository

1. Go to [github.com](https://github.com) and create a new repository
2. Name it something like `dr-joe-library` or `dr-joe-material`
3. Don't initialize with README (we already have files)

### Step 3: Connect to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 4: Connect Netlify to GitHub

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** (or GitLab/Bitbucket)
4. Authorize Netlify to access your repositories
5. Select your repository
6. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
7. Click **Deploy site**

### Step 5: Set Environment Variables

1. In Netlify, go to **Site settings** → **Environment variables**
2. Add:
   - `SUPABASE_URL` = `https://gcybvbyppzmvfrktjicw.supabase.co`
   - `SUPABASE_ANON_KEY` = (your key)
   - `VITE_MEDIA_BASE_URL` = `https://archive.org/download/drjoecourse-media`

### Step 6: Trigger First Deploy

After connecting, Netlify will automatically deploy. Or trigger manually:
- Go to **Deploys** → **Trigger deploy** → **Deploy site**

---

## Option 3: Add Deploy Script to package.json

I've added a `deploy` script to your `package.json`. You can use it with Netlify CLI:

```bash
npm run deploy
```

This will:
1. Build your app
2. Deploy to Netlify production

---

## Which Option Should You Use?

- **Option 1 (CLI)**: Best if you want quick manual deployments
- **Option 2 (Git)**: Best if you want automatic deployments on every push
- **Both**: You can use both! Git for automatic, CLI for quick manual deploys

---

## Quick Deploy Commands

Once set up, you can deploy with:

```bash
# Using npm script (requires Netlify CLI)
npm run deploy

# Or using Netlify CLI directly
netlify deploy --prod

# Or just push to Git (if Git integration is set up)
git push
```

---

## Troubleshooting

**"Site not found" error:**
- Make sure you've linked the site: `netlify link`
- Or verify the site name in Netlify dashboard

**"Not authenticated" error:**
- Run `netlify login` again

**Build fails:**
- Check Netlify build logs
- Make sure all dependencies are in `package.json`
- Verify `netlify.toml` is configured correctly


