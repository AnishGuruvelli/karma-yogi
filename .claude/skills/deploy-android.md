# Skill: Build Android AAB for Play Store

When the user asks to build the Android app or deploy to Play Store, give them these exact steps.

## All commands

```bash
# 1. Go to frontend
cd /Users/admin/Code/karma-yogi/frontend

# 2. Build web assets with the live Render backend
VITE_API_BASE_URL=https://karma-yogi-api.onrender.com/api/v1 npm run build

# 3. Sync into the Android project
npx cap sync android

# 4. Open Android Studio
npm run cap:open:android
```

## Then in Android Studio

**Build → Generate Signed Bundle / APK → Android App Bundle → select keystore → release → Finish**

AAB output: `frontend/android/app/release/app-release.aab`

## Keystore location

`/Users/admin/Code/karma-yogi/frontend/android/karma-yogi-release.keystore`
- Alias: `karma-yogi`
- Back this file up — losing it means you can never update the app on Play Store

## Backend / CORS

- Production API: `https://karma-yogi-api.onrender.com`
- Capacitor Android WebView origin: `http://localhost` and `capacitor://localhost`
- These are already in `CORS_ALLOWED_ORIGINS` on Render — do not remove them

## Common errors

| Error | Fix |
|-------|-----|
| `android platform has not been added yet` | You ran `cap sync` from `frontend/android/` — run it from `frontend/` instead |
| `Failed to fetch` in emulator | Build was done with wrong URL, or Render instance is cold (wait 50s and retry) |
| Signing error in Android Studio | Check keystore path and alias match exactly |

## Testing on a physical device before publishing

Use the same Render URL — it works over any network. No need to change anything.
