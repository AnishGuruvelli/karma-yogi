# Karma Yogi — Run the Android app in Android Studio

This is a **step-by-step** guide to open the Capacitor Android project and run **Karma Yogi** on an emulator or a physical device.

---

## 1. Install prerequisites

1. Install **Android Studio** (current stable). During setup, install the **Android SDK**, **SDK Platform** for the API level you will run (the project targets **API 36**; install that platform or the closest available), and **Android SDK Build-Tools**.
2. Ensure a **JDK** is available. Android Studio bundles a **JetBrains Runtime (JBR)**; point Gradle to it if the IDE asks. If you see **“Unable to locate a Java Runtime”** from Gradle on the command line, install **JDK 21** (or the JDK version your Android Studio release recommends) and set `JAVA_HOME`.
3. Install **Node.js** (LTS recommended) and **npm**.
4. Clone the repo and stay at the monorepo root when copying env files (the frontend build reads env from the **repo root**).

---

## 2. Backend and API URL (choose how you will run the API)

The app talks to the API using **`VITE_API_BASE_URL`** (and other `VITE_*` variables) from a **`.env` file at the repository root** (`karma-yogi/.env`), because `frontend/vite.config.ts` sets `envDir: ".."`.

1. From the repo root, copy the template:

   ```bash
   cp .env.example .env
   ```

2. Edit **`.env`** and set at least:
   - **`VITE_API_BASE_URL`** — must be reachable **from the phone or emulator**, not only from your laptop browser.
   - **`VITE_CLIENT_PLATFORM=android`** — tags requests as Android.
   - **`VITE_GOOGLE_CLIENT_ID`** — match your Google OAuth setup if you use Google sign-in.

**Pick one networking approach:**

| Where you run the app | Typical `VITE_API_BASE_URL` value |
|------------------------|-----------------------------------|
| **Android Emulator** on the same machine as the API | `http://10.0.2.2:8080/api/v1` (emulator alias for host `localhost`) |
| **Physical device** on the same Wi‑Fi | `http://<your-computer-LAN-IP>:8080/api/v1` (e.g. `http://192.168.1.50:8080/api/v1`) |
| **Physical device** + you prefer `localhost` in `.env` | Run `adb reverse tcp:8080 tcp:8080` while the device is connected, then you can use `http://127.0.0.1:8080/api/v1` **from the app’s perspective** on that device |

3. If you use **Docker Compose** for the API, from the repo root run:

   ```bash
   docker compose up --build
   ```

   Ensure **`CORS_ALLOWED_ORIGINS`** in `.env` includes any origins your setup needs; for a packaged WebView app the important part is that the **API is reachable** at the URL you put in `VITE_API_BASE_URL`.

---

## 3. Install frontend dependencies

1. Open a terminal.
2. Go to the frontend folder:

   ```bash
   cd frontend
   ```

3. Install packages:

   ```bash
   npm install
   ```

---

## 4. Build the web bundle and sync into the Android project

Every time you change frontend code or **root `.env`** values that affect the Vite build, repeat this block.

1. Still in **`frontend/`**, run:

   ```bash
   npm run android:build:sync
   ```

   This runs **`npm run build`** (Vite → `frontend/dist`) then **`npx cap sync android`** (copies web assets into `frontend/android`).

2. Confirm there are no errors in the terminal. If the build fails, fix TypeScript or env issues before opening Android Studio.

---

## 5. Open the project in Android Studio

**Option A — from the terminal (recommended after sync):**

1. In **`frontend/`**:

   ```bash
   npm run cap:open:android
   ```

   This launches Android Studio with the **`frontend/android`** Gradle project.

**Option B — manually:**

1. Open **Android Studio**.
2. **File → Open…**
3. Select the folder **`frontend/android`** (not the repo root, not `frontend` alone).
4. Click **Open**.

---

## 6. Wait for Gradle sync

1. Android Studio will **sync Gradle** (first time may download Gradle **8.14.3** and dependencies).
2. If sync fails, read the **Build** tool window message:
   - **Missing SDK** → open **SDK Manager** and install **compileSdk 36** (or adjust if the team documents a different requirement).
   - **Java / JDK** → **File → Settings → Build, Execution, Deployment → Build Tools → Gradle** and set **Gradle JDK** to the embedded JBR or a supported JDK.
3. When sync finishes successfully, the project is ready to run.

---

## 7. Create or select a run configuration

1. In the toolbar, open the **run configuration** dropdown (next to the green Run button).
2. Choose the **`app`** module (standard Capacitor Android app).
3. If you see no device, go to **Device Manager** and **Create Virtual Device…** (pick a phone image with a system image installed) **or** plug in a phone with **USB debugging** enabled.

---

## 8. Run the app

1. Select your **emulator** or **physical device**.
2. Click **Run** (green triangle) or press **Ctrl+R** / **⌘R**.
3. Wait for install and launch. The first launch after a clean build may take longer.

---

## 9. Verify it works

1. The **Karma Yogi** app should open on the device.
2. Try **login** or a screen that calls the API. If requests fail:
   - Re-check **`VITE_API_BASE_URL`** for emulator (`10.0.2.2`) vs device (LAN IP or `adb reverse`).
   - Confirm the API is running and reachable (e.g. `curl` / browser to health: **`http://localhost:8080/healthz`** on the host).
3. After changing **`.env`** or frontend source, go back to **section 4** and run **`npm run android:build:sync`**, then **Run** again in Android Studio.

---

## 10. Optional: `google-services.json`

1. The Gradle build **does not require** `google-services.json` for a basic run; if the file is absent, push-related Google Services are skipped (see log line in `frontend/android/app/build.gradle`).
2. If you add Firebase / Google Services for Android, place **`google-services.json`** under **`frontend/android/app/`** as usual and sync again.

---

## Quick command recap

From repo root (after `.env` exists):

```bash
cd frontend
npm install
npm run android:build:sync
npm run cap:open:android
```

Then in Android Studio: **Gradle sync → select device → Run `app`**.

---

---

## 11. Building for the Play Store (production release)

### 11a. Set the production API URL

The Play Store APK/AAB must point to the **live Render backend**, not localhost.

In the root `.env` (or a separate `.env.production` if you prefer), set:

```
VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api/v1
VITE_CLIENT_PLATFORM=android
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
```

Then build and sync:

```bash
cd frontend
npm run android:build:sync
```

Or as a one-liner without touching `.env`:

```bash
VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api/v1 npm run build
npx cap sync android
```

Every API call baked into the bundle will now hit Render. ✅

> **Testing a debug APK on your phone before publishing?**
> Use the same Render URL — it works over any network and is the simplest option.
> Alternatively, use your Mac's LAN IP (see the table in section 2) if you need a local backend.

---

### 11b. Generate a signing keystore (one-time)

Play Store requires a signed AAB. Create a keystore and **back it up somewhere safe** — losing it means you can never update the app.

```bash
keytool -genkey -v \
  -keystore karma-yogi-release.keystore \
  -alias karma-yogi \
  -keyalg RSA -keysize 2048 -validity 10000
```

Store the `.keystore` file **outside** the repo (never commit it).

---

### 11c. Build the signed AAB in Android Studio

1. Open the project: `npm run cap:open:android`
2. **Build → Generate Signed Bundle / APK**
3. Choose **Android App Bundle**
4. Fill in your keystore path, alias, and passwords
5. Select **release** build variant
6. Click **Finish** — the `.aab` file is output to `frontend/android/app/release/`

---

### 11d. Publish to Google Play

1. Go to [play.google.com/console](https://play.google.com/console) (one-time $25 developer account fee)
2. **Create app** → fill in name, category, and store listing (description, screenshots, icon)
3. Go to **Production → Releases → Create release**
4. Upload the `.aab` file
5. Submit for review — typically 1–3 days for new apps

---

## Reference

- **Application ID / namespace:** `com.karmayogi.app`
- **Capacitor config:** `frontend/capacitor.config.ts` (`webDir`: `dist`)
- **Monorepo README (overview):** `README.md`
