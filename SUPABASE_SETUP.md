# Supabase Setup for Shared Playlists

This app uses Supabase (free tier) to store shared playlists on the server. Follow these steps to set it up:

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account (or log in)
3. Click "New Project"
4. Fill in:
   - **Name**: `drjoe-playlists` (or any name you prefer)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait 2-3 minutes for the project to be set up

## Step 2: Create the Database Table

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste this SQL and click **Run**:

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

4. You should see "Success. No rows returned"

## Step 3: Get Your API Keys

1. In Supabase, go to **Settings** (gear icon) → **API**
2. Find these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

## Step 4: Add Environment Variables to Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add these two variables:

   **Variable 1:**
   - **Key**: `SUPABASE_URL`
   - **Value**: Your Project URL from Step 3

   **Variable 2:**
   - **Key**: `SUPABASE_ANON_KEY`
   - **Value**: Your anon/public key from Step 3

4. Click **Save**

## Step 5: Redeploy Your Site

1. In Netlify, go to **Deploys**
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. Wait for the deployment to complete

## Testing

After deployment:
1. Open your site
2. Click "⚙️ Manage" in the Playlists section
3. Create a playlist and click "🌐 Share"
4. The playlist should appear in "Shared Playlists" tab
5. Open the site in another browser/device - the shared playlist should be visible!

## Troubleshooting

**Playlists not saving?**
- Check that environment variables are set correctly in Netlify
- Check the Netlify Function logs: **Functions** → **shared-playlists** → **Logs**
- Verify the Supabase table was created correctly

**Getting CORS errors?**
- Make sure RLS policies are set up correctly (Step 2)
- Check that you're using the `anon` key, not the `service_role` key

**Functions not working?**
- Make sure `netlify.toml` has `functions = "netlify/functions"` configured
- Verify the function file exists at `netlify/functions/shared-playlists.js`

## Alternative: Use Without Supabase (Development Only)

If you want to test locally without Supabase, the function will use in-memory storage. However, this won't persist across deployments and won't work for sharing between users.

To use Supabase in production, you must complete the setup above.

