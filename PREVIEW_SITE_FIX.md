# Preview Site Spinning Line Fix

## The Issue

You're seeing:
- Spinning line that won't stop
- "Cannot navigate to URL" error in console
- "Loading user data..." repeating

## Quick Fix

### Step 1: Clear Browser Cache

1. **Hard Refresh**: Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear Site Data**:
   - Open DevTools (`F12`)
   - Go to **Application** tab
   - Click **Clear storage** (left sidebar)
   - Click **Clear site data** button
   - Close DevTools
   - Refresh page

### Step 2: Clear Service Worker

The error "Cannot navigate to URL" is from a cached service worker:

1. Open DevTools (`F12`)
2. Go to **Application** tab
3. Click **Service Workers** (left sidebar)
4. Click **Unregister** next to any service workers
5. Close DevTools
6. Hard refresh (`Ctrl+Shift+R`)

### Step 3: Try Incognito/Private Window

If the above doesn't work:

1. Open an incognito/private window
2. Go to your preview URL
3. Log in again

This bypasses all cached data.

## Why "Loading user data..." Appears 3 Times

This is **NORMAL** in React development mode!

React's StrictMode intentionally mounts components twice to help catch bugs. You'll see:
- `Loading user data...` (mount 1)
- `Loading user data...` (mount 2)
- `Loading user data...` (auth state change)

This only happens in development. In production (after building), it will only appear once.

## If Still Stuck on Spinning Line

### Check Console for Errors

Open console (`F12` → Console tab) and look for:

1. **Network errors**:
   - `Failed to fetch`
   - `ERR_CONNECTION_REFUSED`
   - `CORS error`

2. **Auth errors**:
   - `Invalid JWT`
   - `Session expired`
   - `Unauthorized`

3. **Supabase errors**:
   - Check if Supabase URL and key are correct in `.env`
   - Make sure Supabase project is not paused

### Verify Supabase Connection

Check the console for:
```
Supabase URL: https://rkrjicdfsbgxkuubdykz.supabase.co
Supabase Key exists: true
```

If you see this, Supabase is connecting fine.

### Check Your Session

After the 3 "Loading user data..." messages, you should see:
```
User authenticated: your-email@example.com
Super admin check: { id: '...', user_id: '...', full_name: 'Will Lander', email: 'will@w-j-lander.uk' }
```

If you see this, you're logged in and have super admin access!

## Common Causes of Spinning

1. **Auth redirect loop**: The app is trying to redirect to auth but failing
   - **Fix**: Clear localStorage and try again
   ```javascript
   // In browser console (F12):
   localStorage.clear();
   location.reload();
   ```

2. **CORS issues**: Supabase requests being blocked
   - **Fix**: Check Supabase dashboard → Authentication → URL Configuration
   - Make sure your preview URL is in the allowed list

3. **Outdated build**: Old cached JavaScript files
   - **Fix**: The build is fresh, so this isn't the issue

4. **Session timeout**: Your login session expired
   - **Fix**: Log out and log back in

## Force Complete Reset

If nothing else works:

```javascript
// Paste this in browser console (F12 → Console):
localStorage.clear();
sessionStorage.clear();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}
location.reload(true);
```

This clears everything and does a hard reload.

## What Should Happen

When working correctly, you should see in console:

```
Supabase URL: https://rkrjicdfsbgxkuubdykz.supabase.co
Supabase Key exists: true
Loading user data...
Loading user data...
Loading user data...
User authenticated: will@w-j-lander.uk
Super admin check: {id: "76b5f494-1cfc-41fd-951f-3979ba5f8bf0", user_id: "68ec9e02-12d7-4558-9c3e-83746caa635d", full_name: "Will Lander", email: "will@w-j-lander.uk"}
```

Then the page should load and you should see navigation including "Super Admin Portal".

## Verification Checklist

✅ Hard refreshed (`Ctrl+Shift+R`)
✅ Cleared site data in DevTools
✅ Unregistered service workers
✅ Checked console for "User authenticated"
✅ See "Super admin check" with your data
✅ Super Admin Portal appears in navigation

If all checks pass but you still see spinning, the issue is likely:
- Network connectivity to Supabase
- Supabase project is paused (check dashboard)
- A frontend routing issue (check browser URL)

## Development vs Production

Remember:
- **Development** (npm run dev): Components mount twice, lots of console logs
- **Production** (npm run build): Clean, optimized, single mount

The preview is running in development mode, so extra logging is expected.
