# Netlify Git Integration Setup

Your code is now on GitHub at: https://github.com/seeker71/dr-joe-material

## Connect Netlify to GitHub for Automatic Deployments

### Step 1: Connect Repository in Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. If you already have a site `dr-joe-material`:
   - Go to **Site settings** → **Build & deploy** → **Continuous Deployment**
   - Click **Link to Git provider**
   - Select **GitHub**
   - Authorize Netlify if prompted
   - Select repository: `seeker71/dr-joe-material`
   - Click **Save**

3. If you need to create a new site:
   - Click **Add new site** → **Import an existing project**
   - Choose **GitHub**
   - Authorize Netlify to access your repositories
   - Select `seeker71/dr-joe-material`
   - Configure build settings (should auto-detect from `netlify.toml`):
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
     - **Functions directory**: `netlify/functions`
   - Click **Deploy site**

### Step 2: Set Environment Variables

1. In Netlify, go to **Site settings** → **Environment variables**
2. Add these variables:

   **Variable 1:**
   - **Key**: `SUPABASE_URL`
   - **Value**: `https://gcybvbyppzmvfrktjicw.supabase.co`
   - Click **Save**

   **Variable 2:**
   - **Key**: `SUPABASE_ANON_KEY`
   - **Value**: `sb_publishable_0mVDAvzkUV9V3-4w43X-OQ_lIuncSJ2` (or your correct anon key)
   - Click **Save**

   **Variable 3:**
   - **Key**: `VITE_MEDIA_BASE_URL`
   - **Value**: `https://archive.org/download/drjoecourse-media`
   - Click **Save**

### Step 3: Trigger First Deployment

After connecting, Netlify will automatically:
1. Detect the push to GitHub
2. Start a new deployment
3. Build your app
4. Deploy to `dr-joe-material.netlify.app`

You can also trigger manually:
- Go to **Deploys** → **Trigger deploy** → **Deploy site**

## Automatic Deployments

Now, every time you push to GitHub:

```bash
git add .
git commit -m "Your commit message"
git push
```

Netlify will automatically:
- ✅ Detect the push
- ✅ Build your app
- ✅ Deploy to production
- ✅ Update `dr-joe-material.netlify.app`

## Future Deployments

Just push to GitHub:

```bash
cd /Users/ursmuff/Downloads/DrJoeCource/video-library
git add .
git commit -m "Update description"
git push
```

That's it! Netlify will handle the rest automatically.

## Verify Deployment

After the first deployment:
1. Check your site: https://dr-joe-material.netlify.app
2. Test Supabase validation: https://dr-joe-material.netlify.app/test-supabase.html
3. Check deployment status in Netlify dashboard

## Troubleshooting

**Deployment fails:**
- Check Netlify build logs
- Verify environment variables are set
- Make sure `netlify.toml` is correct

**Git push fails:**
- Your token might need to be refreshed
- Check GitHub repository permissions
- Verify the remote URL: `git remote -v`

**Site not updating:**
- Check Netlify deploy logs
- Verify the build completed successfully
- Clear browser cache

## Security Note

Your GitHub token is stored in git config. For better security, consider:
- Using SSH keys instead of tokens
- Or using GitHub's credential helper
- Or storing the token in a secure credential manager

