# Troubleshooting: Can't Play Files

## Quick Checks

### 1. Check Environment Variable
Make sure `.env` file exists and has:
```
VITE_MEDIA_BASE_URL=https://archive.org/download/drjoecourse-media
```

### 2. Rebuild After Changing .env
If you change `.env`, you MUST rebuild:
```bash
npm run build
npm run preview
```

### 3. Check Browser Console
Open browser DevTools (F12) and check:
- Console tab for errors
- Network tab to see if media requests are failing
- Look for CORS errors or 404s

### 4. Test URL Directly
When you click a file, expand "Debug Info" in the player to see the generated URL. Click "Test URL directly" to verify the file exists.

### 5. Check Upload Status
Verify files are uploaded to Internet Archive:
```bash
tail -f /tmp/ia_upload.log
```

Or check directly:
```bash
ia list drjoecourse-media | head -20
```

## Common Issues

### "Set VITE_MEDIA_BASE_URL" Message
- **Cause:** Environment variable not set or not included in build
- **Fix:** 
  1. Create/check `.env` file
  2. Run `npm run build` again
  3. Restart preview server

### Files Don't Load (Network Errors)
- **Cause:** Files not uploaded yet or wrong path
- **Fix:**
  1. Wait for upload to complete
  2. Check upload log: `tail -f /tmp/ia_upload.log`
  3. Verify file exists: `ia list drjoecourse-media | grep "filename"`

### CORS Errors
- **Cause:** Internet Archive should allow CORS, but check browser console
- **Fix:** Internet Archive sets `access-control-allow-origin: *` - if you see CORS errors, it might be a browser cache issue. Try hard refresh (Cmd+Shift+R on Mac).

### Preview Server Issues
If `npm run preview` doesn't work:
1. Make sure you ran `npm run build` first
2. Try `npm run dev` instead (development mode with hot reload)
3. Check if port 4173 is already in use

## Testing Steps

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Start preview:**
   ```bash
   npm run preview
   ```

3. **Open browser:**
   - Go to `http://localhost:4173`
   - Open DevTools (F12)
   - Click a file to play
   - Check Console and Network tabs

4. **Check Debug Info:**
   - In the player, expand "Debug Info"
   - Verify the URL looks correct
   - Click "Test URL directly" to test in new tab

## Still Not Working?

1. Check if files are actually on Internet Archive:
   ```bash
   curl -I "https://archive.org/download/drjoecourse-media/Tuning%20to%20your%20Heart%20meditation/01-Eng-TIWYH-Introduction%202.mp3"
   ```

2. Verify the catalog has correct paths:
   ```bash
   cat public/catalog.json | head -20
   ```

3. Try development mode instead:
   ```bash
   npm run dev
   ```
   (This uses `.env` at runtime, not build time)

