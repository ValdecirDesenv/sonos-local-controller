# Sonos Local Controller

A self-hosted system for controlling Sonos speakers on a local network, with scheduled/automated playback and Spotify playlist integration — built to run background music unattended (e.g. an office/store audio setup), replacing manual control through the official Sonos app.

## What it does

- **Device/group control** (`Devices` page): view every Sonos group on the network, see live volume/mute/playback state per speaker, and configure per-group:
  - **Always Keep Playing** — force a group to stay playing.
  - **Audio TimeFrame** — auto play/pause a group based on a start/stop time window (a 30-second scheduler loop in `server.js` enforces this).
  - **Automatic Group Restore** — save a group's exact configuration (which speaker is the leader, which speakers follow it, and what audio source the leader plays — including a Line-In source from another room) and have the app automatically re-create that exact group if it drifts (most commonly: a power outage ungroups everything). This works by replaying a saved "preset" through the `sonos-discovery` library whenever it detects the live group topology no longer matches what was saved.
  - Removing offline/stale groups.
- **Spotify Weekly Playlist** (`Playlist Settings` page): assign a Spotify playlist to each day of the week, with a "Play" button to trigger it immediately. Playback is controlled by **remote-controlling a real Spotify Connect device** (e.g. the Spotify desktop app running somewhere on the network) via the Spotify Web API — this app does not embed or stream Spotify audio itself.
- **Spotify Login**: an OAuth flow (`/spotify/login` → `/spotify/callback`) that authorizes this app to control your Spotify account's playback.

## Architecture

Two halves in **one git repo**, deployed as **one combined process**:

- **`server/`** — Node.js + Express + WebSocket backend.
  - `server.js` — entry point: sets up Express, the WebSocket server, Sonos discovery, the scheduler loop, and (in production) serves the built frontend.
  - `services/deviceService.js` — reads/writes persisted device & group state (`data/default.json`), builds the WebSocket broadcast payload.
  - `services/groupRestoreWatchdog.js` — the Automatic Group Restore feature described above.
  - `services/playlistWatchdog.js` — daily cron-based Spotify playlist trigger.
  - `services/spotifyService.js` / `services/spotifyTriggers.js` — Spotify token management and remote playback control via the Web API.
  - `websocket/websocketHandler.js` — all real-time client↔server message handling.
  - `routers/sonosRoutes.js`, `routers/spotifyAuthRoutes.js` — REST endpoints.
  - Uses [`sonos-discovery`](https://www.npmjs.com/package/sonos-discovery) — a **local UPnP/SSDP library**, not Sonos's official cloud API. **This means the backend must run on the same local network as the Sonos speakers** — it cannot discover or control them from a remote/cloud host.
  - Logs: winston, daily-rotating, written to `~/serverSonos.log.YYYY-MM-DD` (5 files kept, gzipped).

- **`frontController/`** — React + TypeScript + Vite + MUI frontend.
  - `src/ws/` — a single typed WebSocket client (module-level singleton store + `useSyncExternalStore` hooks) that all pages/components read from.
  - `src/pages/` — `HomePage`, `DevicesPage`, `SpotifyWeekListPage`, `NotFoundPage`.
  - `src/components/layout|devices|spotify/` — UI building blocks per page area.

- **Data storage**: no database — everything persists to local JSON files in `server/data/`:
  - `default.json` — devices/groups, schedules, keep-playing flags, saved group-restore presets. Tracked in git as a starting template but will diverge per-deployment; **not secret**, but is live state.
  - `spotifyPlaylists.json` — the weekly playlist assignments. Same as above.
  - `spotifyToken.json` — the live Spotify OAuth token. **Not tracked in git** (see below).

## Running it

### Development (two processes, hot-reload)
```bash
# terminal 1 — backend
cd server
npm install
npm run dev          # nodemon, auto-restarts on file changes

# terminal 2 — frontend
cd frontController
npm install
npm run dev          # Vite dev server, http://127.0.0.1:5173
```
The frontend dev server connects to the backend's WebSocket on `ws://localhost:3000`.

### Production (one process, one port)
```bash
cd frontController
npm install
npm run build         # outputs frontController/dist

cd ../server
npm install
npm start              # (or: pm2 start server.js --name sonos-server)
```
The backend now serves the built frontend itself (`express.static` + SPA fallback in `server.js`) — the whole app runs at `http://<host>:3000` (or whatever `PORT` is set to), no separate frontend server needed.

For always-on deployment, run it under **PM2**:
```bash
npm install -g pm2
cd server
pm2 start server.js --name sonos-server
pm2 save
pm2 startup            # follow its printed instructions for boot auto-start
pm2 install pm2-logrotate   # PM2's own stdout/stderr logs don't rotate on their own
```

## Setting up on a fresh clone (VS Code)

1. **Clone the repo** — this gets both `server/` and `frontController/`, they're in the same repo:
   ```bash
   git clone git@github.com:ValdecirDesenv/sonos-local-controller.git
   ```
2. **Open the folder in VS Code.**
3. **Install dependencies** in both halves:
   ```bash
   cd server && npm install
   cd ../frontController && npm install
   ```
4. **Create `server/.env`** — this file is **deliberately not in git** (see the alert below) and must be created by hand:
   ```bash
   PORT=3000
   WEBROOT=                       # optional, defaults to server/public
   WEBHOOK_URL=                   # optional
   WEBHOOK_TYPE=                  # optional
   WEBHOOK_DATA=                  # optional
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/spotify/callback
   ```
   See the next section for where `SPOTIFY_CLIENT_ID`/`SECRET` come from.
5. **Run it** — either the two-process dev setup or the built single-process production setup, above.
6. **First-time Spotify login**: open the app in a browser, click **Login with Spotify**, complete the OAuth screen. This creates `server/data/spotifyToken.json` automatically (also not in git — see below) and refreshes itself afterward; you shouldn't need to log in again unless that file is deleted or the refresh token is revoked.

Node.js: developed/tested with a recent version (v26.x); any current LTS (Node 18+) should work fine.

## ⚠️ Spotify credentials — must be created per-deployment, never committed

This project needs its own Spotify API app registration to talk to Spotify's Web API. **Whoever sets this up (including you, again, on a new machine) must create this themselves:**

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and log in with any Spotify account.
2. **Create an app.**
3. Copy the **Client ID** and **Client Secret** it gives you.
4. In the app's settings, add a **Redirect URI** that exactly matches `SPOTIFY_REDIRECT_URI` in your `.env` (e.g. `http://127.0.0.1:3000/spotify/callback` for local use — Spotify requires an exact match, including trailing slashes).
5. Put the Client ID/Secret into `server/.env` as shown above.

**These values, along with the `.env` file itself and `server/data/spotifyToken.json` (the live login token generated after step 6 above), must never be committed to GitHub.** Both are already listed in `.gitignore` at the repo root — do not remove them from it, and double-check `git status` before committing if you ever touch either file. If you're moving this app to a new server, copy `.env` and `spotifyToken.json` over manually (e.g. `scp`) — don't try to regenerate them from git, they aren't there.
