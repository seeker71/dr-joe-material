# Quick Setup Guide - Your Supabase Credentials

## Your Supabase Configuration

- **Supabase URL**: `https://gcybvbyppzmvfrktjicw.supabase.co`
- **Publishable Key**: `sb_publishable_0mVDAvzkUV9V3-4w43X-OQ_lIuncSJ2`

**Note**: The key you provided starts with `sb_publishable_`. Supabase typically uses JWT tokens starting with `eyJ`. Please verify you're using the **anon/public key** from:
- Supabase Dashboard → Settings → API → **anon public** key

If the key above is correct, we'll use it. Otherwise, get the correct key from your Supabase dashboard.

## Step 1: Set Up Database Table

1. Go to your Supabase project: https://supabase.com/dashboard/project/gcybvbyppzmvfrktjicw
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Create the shared_playlists table
CREATE TABLE IF NOT EXISTS shared_playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  items JSONB NOT NULL,
  share_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on share_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_share_id ON shared_playlists(share_id);

-- Enable Row Level Security (RLS)
ALTER TABLE shared_playlists ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read shared playlists
CREATE POLICY "Anyone can read shared playlists"
  ON shared_playlists
  FOR SELECT
  USING (true);

-- Create a policy that allows anyone to insert shared playlists
CREATE POLICY "Anyone can insert shared playlists"
  ON shared_playlists
  FOR INSERT
  WITH CHECK (true);

-- Create a policy that allows anyone to update shared playlists
CREATE POLICY "Anyone can update shared playlists"
  ON shared_playlists
  FOR UPDATE
  USING (true);

-- Create a policy that allows anyone to delete shared playlists
CREATE POLICY "Anyone can delete shared playlists"
  ON shared_playlists
  FOR DELETE
  USING (true);
```

5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned"

## Step 2: Verify Your API Key

1. In Supabase Dashboard, go to **Settings** → **API**
2. Find the **anon public** key (should start with `eyJ...`)
3. If your key is different from `sb_publishable_0mVDAvzkUV9V3-4w43X-OQ_lIuncSJ2`, use the one from the dashboard

## Step 3: Add Environment Variables to Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add these two variables:

   **Variable 1:**
   - **Key**: `SUPABASE_URL`
   - **Value**: `https://gcybvbyppzmvfrktjicw.supabase.co`
   - Click **Save**

   **Variable 2:**
   - **Key**: `SUPABASE_ANON_KEY`
   - **Value**: `sb_publishable_0mVDAvzkUV9V3-4w43X-OQ_lIuncSJ2` (or the correct anon key from Step 2)
   - Click **Save**

## Step 4: Redeploy Your Site

1. In Netlify, go to **Deploys**
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. Wait for deployment to complete (usually 1-2 minutes)

## Step 5: Test It!

1. Open your deployed site
2. Click **⚙️ Manage** in the Playlists section
3. Create a new playlist or edit an existing one
4. Click **🌐 Share** on a playlist
5. Check the **Shared Playlists** tab - your playlist should appear there!
6. Open the site in another browser/device - the shared playlist should be visible to everyone

## Troubleshooting

**If playlists aren't saving:**
- Check Netlify Function logs: **Functions** → **shared-playlists** → **Logs**
- Verify environment variables are set correctly
- Make sure the SQL table was created successfully

**If you get authentication errors:**
- Double-check the anon key is correct (should start with `eyJ...`)
- Verify RLS policies are set up (Step 1)

**If the function isn't working:**
- Check that `netlify.toml` has `functions = "netlify/functions"` configured
- Verify the function file exists at `netlify/functions/shared-playlists.js`

## Need Help?

Check the full setup guide in `SUPABASE_SETUP.md` for more details.

