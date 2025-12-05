# How to Validate Your Supabase Setup on Netlify

## Quick Validation Method

1. **Deploy your site** (if you haven't already)
2. **Open the test page** in your browser:
   ```
   https://your-site.netlify.app/test-supabase.html
   ```
3. **Click "Run Validation Test"** - it will automatically run when the page loads
4. **Review the results** - all checks should show green ✅

## What Gets Tested

### ✅ Configuration Check
- **Supabase URL**: Verifies `SUPABASE_URL` environment variable is set
- **Supabase Key**: Verifies `SUPABASE_ANON_KEY` environment variable is set
- **Client Initialization**: Confirms the Supabase client was created successfully

### ✅ Connection Test
- **Database Connection**: Tests if the function can connect to your Supabase project
- **Table Exists**: Verifies the `shared_playlists` table was created

### ✅ Read/Write Test (Optional)
- Click "Test Read/Write" to verify you can create and read playlists
- This creates a test playlist, reads it back, then deletes it

## Understanding the Results

### ✅ All Green = Success!
Your Supabase setup is working correctly. You can start sharing playlists!

### ❌ Red Status = Problem Found

**"Supabase URL: NOT SET"**
- Go to Netlify → Site settings → Environment variables
- Add `SUPABASE_URL` with value: `https://gcybvbyppzmvfrktjicw.supabase.co`

**"Supabase Key: MISSING"**
- Go to Netlify → Site settings → Environment variables
- Add `SUPABASE_ANON_KEY` with your key from Supabase dashboard

**"Connection: FAILED"**
- Check the error message
- Common issues:
  - Wrong API key (verify it's the anon/public key, not service_role)
  - Network issues
  - Supabase project paused (check your Supabase dashboard)

**"Table Exists: NO"**
- The database table hasn't been created
- Go to Supabase → SQL Editor
- Run the SQL script from `QUICK_SETUP.md` (Step 1)

## Manual Validation Steps

If the test page doesn't work, you can validate manually:

### 1. Check Environment Variables in Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Verify these exist:
   - `SUPABASE_URL` = `https://gcybvbyppzmvfrktjicw.supabase.co`
   - `SUPABASE_ANON_KEY` = (your key)

### 2. Check Netlify Function Logs

1. In Netlify, go to **Functions** → **shared-playlists**
2. Click **Logs**
3. Look for any error messages
4. Common errors:
   - `Supabase not configured` = Environment variables missing
   - `relation "shared_playlists" does not exist` = Table not created
   - `JWT expired` = Invalid API key

### 3. Test the API Directly

Open these URLs in your browser (replace with your site URL):

**Validation Endpoint:**
```
https://your-site.netlify.app/api/shared-playlists/validate
```

**Get Playlists:**
```
https://your-site.netlify.app/api/shared-playlists
```

You should see JSON responses. If you get errors, check the Netlify function logs.

### 4. Verify Supabase Table

1. Go to your Supabase dashboard
2. Navigate to **Table Editor**
3. Look for `shared_playlists` table
4. If it doesn't exist, run the SQL script from `QUICK_SETUP.md`

## Troubleshooting Common Issues

### Issue: "Function not found" or 404 error

**Solution:**
- Make sure `netlify.toml` has `functions = "netlify/functions"` configured
- Verify the function file exists at `netlify/functions/shared-playlists.js`
- Redeploy your site

### Issue: "CORS error" in browser console

**Solution:**
- The function includes CORS headers, but if you see CORS errors:
  - Make sure you're accessing from your deployed site (not localhost)
  - Check that the function is returning proper CORS headers

### Issue: "Supabase not configured" in logs

**Solution:**
- Environment variables aren't being read
- Make sure variables are set in Netlify (not just in `.env` file)
- Redeploy after adding environment variables
- Check variable names match exactly: `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Issue: "Table does not exist" error

**Solution:**
1. Go to Supabase → SQL Editor
2. Run this SQL:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'shared_playlists'
);
```
3. If it returns `false`, run the table creation script from `QUICK_SETUP.md`

## Success Checklist

- [ ] Environment variables set in Netlify
- [ ] Site redeployed after adding variables
- [ ] Database table created in Supabase
- [ ] Validation test shows all green ✅
- [ ] Read/Write test passes
- [ ] Can create and share playlists in the app

Once all checks pass, your Supabase setup is complete! 🎉

