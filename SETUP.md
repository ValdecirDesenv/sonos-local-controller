# Setup Guide

Step-by-step instructions for taking this repo from a fresh `git clone` to a
running app — both for local development and for an always-on production
deployment. If you just forked or cloned this and don't know where to start,
start here. (For a high-level overview of what the app does and how it's
architected, see [PROJECT.md](PROJECT.md) instead.)

## Before you start

- **You must be on the same local network as the Sonos speakers.** This app
  discovers and controls them via UPnP/SSDP (the `sonos-discovery` library),
  not Sonos's cloud API. It cannot see or control speakers from a remote
  server, a different VLAN, or a machine outside the building's LAN.
- **Node.js**: any current LTS (18+) works. Check your version:
  ```bash
  node --version
  npm --version
  ```
  You may see `npm WARN EBADENGINE` warnings during `npm install` (some
  dependencies request Node 20/22). These are just warnings — the app has
  been verified to install and run correctly on Node 18.19.1 — but if you hit
  a real runtime error, upgrading Node is the first thing to try.
- **git** and, if you plan to run this unattended, **PM2** (`npm install -g pm2`).

## 1. Clone the repo

```bash
git clone <your-fork-or-this-repo-url>
cd sonos-local-controller
```

Both halves of the app — `server/` (backend) and `frontController/`
(frontend) — live in this one repo.

## 2. Install dependencies

```bash
cd server && npm install
cd ../frontController && npm install
```

Run both — they're independent Node projects with separate `package.json`
files.

## 3. Configure `server/.env`

This file is **not in git** (see `.gitignore`) and must be created by hand.
Create `server/.env` with:

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

**Watch out for stray characters at the end of the file.** The
`SPOTIFY_REDIRECT_URI` value is used byte-for-byte to build the Spotify OAuth
URL — a shell prompt symbol, trailing `%`, trailing space, or missing final
newline that accidentally gets pasted into the file becomes *part of the
URL*, and Spotify will silently reject the login because it no longer
matches what's registered in your dashboard. If Spotify login fails,
double-check the raw bytes:
```bash
od -c server/.env | tail -5
```

## 4. Get Spotify API credentials

Playback control goes through the Spotify Web API, which needs its own app
registration — **every deployment needs to create its own**, this can't be
shared or reused across machines:

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   and log in with any Spotify account.
2. **Create an app.**
3. Copy the **Client ID** and **Client Secret** into `server/.env` (step 3).
4. In the app's settings, add a **Redirect URI** that is an *exact* match
   for `SPOTIFY_REDIRECT_URI` above — including scheme, port, path, and any
   trailing slash. Spotify does not fuzzy-match this.

Both the Client Secret and `server/.env` itself must never be committed —
they're already covered by `.gitignore`, don't remove them from it.

## 5. First run — development mode

Two terminals, hot-reload on both sides:

```bash
# terminal 1 — backend
cd server
npm run dev          # nodemon, http://127.0.0.1:3000

# terminal 2 — frontend
cd frontController
npm run dev          # Vite dev server, http://127.0.0.1:5173
```

Open `http://127.0.0.1:5173`. The frontend connects to the backend's
WebSocket on `ws://localhost:3000` automatically.

**Sanity check the backend on its own**, independent of the frontend:
```bash
curl http://127.0.0.1:3000/api/topology
```
This should return JSON describing your Sonos zones. An empty array (`[]`)
usually means either no speakers are on this network, or this machine isn't
on the same LAN/VLAN as them (see "Before you start").

## 6. First-time Spotify login

Click **Login with Spotify** in the top-right of the app and complete the
OAuth screen. This creates `server/data/spotifyToken.json` (also gitignored
— not shared across deployments, don't try to copy it from git) and
refreshes itself automatically afterward.

If you see **"Spotify token expired and could not be refreshed. Please log
in again"** the very first time, before ever logging in — that's expected,
not a bug: there's no token yet, so there's nothing to refresh. Completing
the login above resolves it. If you see that message again *after* a
successful login and things stop playing, that indicates a real refresh
failure worth investigating (e.g. a revoked token).

## 7. Production build

```bash
cd frontController
npm run build         # tsc -b && vite build -> outputs frontController/dist
```

The backend serves this build directly — `server.js` does
`express.static(frontController/dist)` with an SPA fallback — so there's
no separate frontend server needed in production. The whole app runs on one
port (`http://<host>:3000` or whatever `PORT` is set to).

Quick manual check without PM2, if you want to confirm the build works
before wiring up PM2:
```bash
cd server
npm start             # node server.js
```

## 8. Run it under PM2 (recommended for always-on deployments)

PM2 keeps the process alive across crashes and (once configured) across
reboots — this is the recommended way to run this unattended, e.g. on an
office/store server.

```bash
npm install -g pm2

cd server
pm2 start server.js --name sonos-server
pm2 save                       # persist the process list
```

**Log rotation** — PM2's own stdout/stderr logs don't rotate on their own
and will grow forever without this:
```bash
pm2 install pm2-logrotate
```

**Boot auto-start** — makes the app come back up automatically after a
server reboot. This step needs `sudo` and modifies systemd, so it must be
run interactively by you, in a real terminal (not scriptable/automatable):
```bash
pm2 startup
# pm2 prints a `sudo env PATH=... pm2 startup systemd ...` command — copy,
# paste, and run exactly that.
pm2 save                       # run again after `pm2 startup` completes
```

Useful commands afterward:
```bash
pm2 status                     # is it running?
pm2 logs sonos-server          # tail its logs
pm2 restart sonos-server       # e.g. after pulling new code + rebuilding
```

## 9. Redeploying after a code change

```bash
git pull
cd server && npm install               # if server dependencies changed
cd ../frontController && npm install   # if frontend dependencies changed
npm run build                          # rebuild the frontend
pm2 restart sonos-server               # backend picks up new code + new dist
```

`server/.env` and `server/data/spotifyToken.json` are per-machine and never
touched by `git pull` — you don't need to redo steps 3–4 or 6 on a redeploy,
only on a genuinely fresh setup or a move to a new machine (in which case,
copy those two files over by hand, e.g. `scp` — see PROJECT.md).

## Troubleshooting quick reference

| Symptom | Likely cause |
|---|---|
| `/api/topology` returns `[]` | This machine isn't on the same LAN as the Sonos speakers |
| Spotify login redirects to an error page | `SPOTIFY_REDIRECT_URI` doesn't exactly match the dashboard entry — check for stray characters (step 3) |
| "token expired and could not be refreshed" on first-ever login | Expected — no token exists yet, just complete the login |
| Same message *after* a working login | Real refresh failure — check `server/data/spotifyToken.json` and whether the refresh token was revoked |
| Daily playlist trigger silently fails (check PM2 logs for a `403`) | Usually means the target desktop's Spotify app isn't open/active at that hour, or the account isn't Premium (required for playback-control endpoints) |
| `npm install` shows `EBADENGINE` warnings | Harmless on Node 18+ unless paired with an actual runtime error |
