# Pico's TTRPG Toolkit

A self-hosted, system-agnostic Game Master toolkit. Single user, LAN-only, runs on Node + SQLite.
Modular widgets on an infinite canvas, plus a read-only player-projection view at `/player/:id?t=<shareToken>`.

## Stack
- **Server:** Node.js + TypeScript + Fastify + Prisma + SQLite + `@fastify/secure-session`
- **Web:** React 18 + Vite + TypeScript + Tailwind + Zustand + TanStack Query + React Router
- **Realtime:** Server-Sent Events (one-way GM → clients)
- **Canvas:** `react-zoom-pan-pinch` for pan/zoom + `react-rnd` per widget for drag/resize

## Quick start

```powershell
# Windows (PowerShell):
npm start
```

```sh
# macOS / Linux / Git Bash:
npm run start:bash
```

The starter script handles everything: creates `.env` with a fresh `SESSION_KEY`
the first time, installs npm packages if needed, runs migrations + seed
(idempotent), frees ports 3000/5173 if a previous run left something behind, and
boots both server and web. After it prints `server:` and `web:` URLs:

- GM app: http://localhost:5173 (sign in with `GM_PASSWORD` from `.env` — defaults to `changeme`)
- Player view link is generated inside the GM app per campaign

To wipe the DB and re-seed: `npm start -- -Reset` (PS) or `npm run start:bash -- --reset`.

## Scripts
| Command | What it does |
|---|---|
| `npm start` | One-shot starter (PowerShell) — env, deps, migrate, seed, dev |
| `npm run start:bash` | Same as `npm start`, for POSIX shells |
| `npm run dev` | Start server and web together with hot reload (assumes setup is done) |
| `npm run migrate` | Apply Prisma migrations |
| `npm run seed` | Initialize Settings row + default campaign |
| `npm run build` | Build server + web for production |
| `npm run serve` | Start the built server in production mode |
| `npm run check` | Typecheck + Prisma validate across all workspaces |

## Layout
```
apps/server   Fastify API + Prisma + SQLite
apps/web      React SPA (GM canvas + player view)
packages/shared  zod schemas + shared TS types
```

## Backup / restore
Hit `GET /api/admin/export` while logged in. The server uses `VACUUM INTO` to take a hot copy of the SQLite DB and streams it back with the `uploads/` folder zipped alongside.

To restore, stop the server, unzip into `apps/server/data/`, restart.

## Security notes
- One GM account. Password is bcrypt-hashed in the DB. There is no registration or password reset; change it inside the app, or re-seed.
- Player view is gated by a per-campaign rotatable share token. No accounts.
- All `/api/*` requires the GM session **except** `/api/player/*` and `/api/player-stream/*`, which validate the share token.
- File uploads are MIME-allowlisted (png/jpeg/webp/gif), stored under `UPLOAD_DIR` with UUID filenames, and served exclusively via `/api/files/:id`.
