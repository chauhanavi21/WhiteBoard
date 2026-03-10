# Collaborative Whiteboard — Real-Time CRDT Drawing App

A production-grade, **local-first collaborative whiteboard and notes editor** built with **Yjs CRDTs**, React, and Node.js. Multiple users can draw shapes, write notes, and see each other's live cursors — all in real time. The app works fully offline and syncs automatically when reconnected, with zero data conflicts guaranteed by the CRDT engine.

---

## Table of Contents

1. [What Is This Project?](#what-is-this-project)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Architecture Overview](#architecture-overview)
6. [Getting Started (Setup Guide)](#getting-started-setup-guide)
7. [Running the App](#running-the-app)
8. [Running Tests](#running-tests)
9. [Environment Variables](#environment-variables)
10. [Docker / Phase 2 Infrastructure](#docker--phase-2-infrastructure)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [How the CRDT Sync Works](#how-the-crdt-sync-works)
13. [Roadmap](#roadmap)
14. [License](#license)

---

## What Is This Project?

This is a **multi-user real-time collaborative whiteboard**, similar to Figma's canvas or Miro, but built from scratch with a focus on:

- **Offline-first**: Everything is stored locally in IndexedDB. You can open the app with no internet, draw, write notes, and it all saves instantly.
- **Conflict-free sync**: When two people edit at the same time (or one edits offline), the changes merge automatically using **CRDTs (Conflict-free Replicated Data Types)** — the same technology used by Notion, Linear, and Figma.
- **Real-time collaboration**: When online, changes appear on everyone's screen within milliseconds.
- **Privacy-ready**: End-to-end encryption module is built in (Phase 2) — the server only sees ciphertext.

---

## Features

### Currently Working (Phase 1 + 2)

| Feature | Description |
|---|---|
| Multi-user real-time drawing | All connected users see changes instantly |
| Full offline support | Works with no internet; syncs on reconnect |
| 7 Drawing tools | Pen, Line, Rectangle, Ellipse, Text, Sticky Note, Arrow |
| Live cursors | See where every other user's mouse is, with name labels |
| Presence avatars | See who is currently connected to the room |
| Pan & Zoom | Mouse wheel zoom, drag to pan, zoom controls |
| Undo / Redo | Per-client undo history tracked by Yjs |
| Layers panel | Add layers, toggle visibility, lock layers |
| Collaborative notes | A shared text editor panel (Y.Text) that syncs live |
| Comments system | Add and reply to comment threads anchored to shapes |
| Style panel | Pick stroke color, fill color, and stroke width |
| Keyboard shortcuts | Full set of hotkeys for every tool and action |
| Export | Export the canvas as SVG, JSON, or raw CRDT binary |
| Version snapshots | Save named snapshots and restore to any previous version |
| Debug panel | Live telemetry: peer count, sync speed, document size, update rate |
| Network simulation | Simulate bad network conditions (latency + packet loss sliders) |
| JWT authentication | Register, login, or use Quick Join (anonymous, offline-capable) |
| Room management | Create rooms, set permissions (owner / editor / viewer), share links |
| Rate limiting | API protection with express-rate-limit |
| PWA support | Install the app to your desktop or phone, works offline |
| E2E encryption module | AES-256-GCM encryption for document updates (Phase 2, built not yet wired) |

### Coming Next (Phase 3)

- Redis pub/sub for scaling to multiple server instances
- Room sharding across server clusters
- CDN-backed snapshot and export delivery
- Full PostgreSQL + MinIO production database connection

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18 + TypeScript | Component model, strict types |
| **Build Tool** | Vite | Fast HMR, PWA plugin, Proxy support |
| **Styling** | Tailwind CSS 3 | Utility-first, dark Catppuccin theme |
| **Drawing Canvas** | Konva + react-konva | Canvas API (not DOM), handles thousands of shapes |
| **Sketch Effects** | rough.js | Hand-drawn style rendering (available) |
| **CRDT Engine** | Yjs (v13) | Y.Doc, Y.Array, Y.Map, Y.Text, Awareness, UndoManager |
| **Local Storage** | y-indexeddb | Persists the Yjs document to IndexedDB offline |
| **Network Sync** | y-websocket | State-vector diff protocol over WebSocket |
| **UI State** | Zustand | Lightweight store for ephemeral UI (not canvas data) |
| **Routing** | react-router-dom v6 | Page routing (auth vs app) |
| **Icons** | lucide-react | Clean SVG icons |
| **Server** | Node.js + Express + ws | REST API + WebSocket server |
| **Authentication** | jsonwebtoken + bcryptjs | JWT Bearer tokens, secure password hashing |
| **Validation** | Zod | Runtime schema validation for API inputs |
| **Security** | Helmet + express-rate-limit + CORS | HTTP security headers, rate limiting |
| **E2E Encryption** | Web Crypto API | AES-256-GCM + PBKDF2 (Phase 2, implemented) |
| **Testing** | Vitest + jsdom | Unit, integration, and CRDT simulation tests |
| **PWA** | vite-plugin-pwa + Workbox | Service worker, offline install, asset caching |
| **Database** | PostgreSQL 16 | Schema defined for Phase 2 production |
| **Object Storage** | MinIO (S3-compatible) | Snapshot and export storage (Phase 2) |
| **Cache / Pub-Sub** | Redis | Horizontal WebSocket scaling (Phase 3) |
| **Infrastructure** | Docker Compose | Spins up Postgres + MinIO + Redis locally |
| **Monorepo** | npm workspaces | `client`, `server`, `shared` packages in one repo |

---

## Project Structure

```
Whiteboard/
│
├── package.json              ← Root monorepo (npm workspaces)
├── tsconfig.json             ← Shared TypeScript base config
├── vitest.config.ts          ← Test runner config
├── docker-compose.yml        ← PostgreSQL + MinIO + Redis
├── .env.example              ← Documented env vars template
├── GIT_PUSH_GUIDE.txt        ← Step-by-step git push instructions
│
├── client/                   ← React frontend (Vite)
│   ├── package.json
│   ├── vite.config.ts        ← Build config + PWA + proxy to :3001
│   ├── tailwind.config.js    ← Dark theme color palette
│   ├── index.html            ← App HTML entry point
│   └── src/
│       ├── main.tsx          ← React root + PWA service worker
│       ├── App.tsx           ← Auth gate → Whiteboard layout
│       ├── components/
│       │   ├── auth/
│       │   │   └── AuthScreen.tsx        ← Login / Register / Quick Join
│       │   ├── whiteboard/
│       │   │   └── WhiteboardCanvas.tsx  ← Konva canvas (all drawing)
│       │   ├── notes/
│       │   │   └── NotesEditor.tsx       ← Live collaborative notes (Y.Text)
│       │   ├── presence/
│       │   │   ├── PresenceAvatars.tsx   ← Who is online (top bar)
│       │   │   └── CursorsLayer.tsx      ← Remote cursor arrows + names
│       │   ├── ui/
│       │   │   ├── Toolbar.tsx           ← Drawing tools + undo/redo + zoom
│       │   │   ├── StylePanel.tsx        ← Stroke/fill color + stroke width
│       │   │   └── LayersPanel.tsx       ← Layer list (visible/lock/add)
│       │   ├── export/
│       │   │   ├── ExportMenu.tsx        ← Export dropdown button
│       │   │   └── exportUtils.ts        ← SVG, JSON, CRDT binary export
│       │   ├── snapshots/
│       │   │   └── SnapshotsPanel.tsx    ← Version history (save/restore)
│       │   └── debug/
│       │       └── DebugPanel.tsx        ← Telemetry + network simulators
│       ├── hooks/
│       │   ├── useCollaboration.ts       ← CRDT lifecycle (init, observe, sync)
│       │   └── useKeyboardShortcuts.ts   ← Global hotkeys
│       ├── lib/
│       │   ├── collaboration.ts          ← Core Yjs manager (CRDT source of truth)
│       │   └── encryption.ts            ← AES-256-GCM E2E encryption
│       ├── store/
│       │   └── whiteboardStore.ts        ← Zustand (UI state only)
│       └── styles/
│           └── globals.css              ← Tailwind + custom component classes
│
├── server/                   ← Node.js + Express backend
│   ├── package.json
│   └── src/
│       ├── index.ts          ← HTTP server + WebSocket + all routes
│       ├── routes/
│       │   ├── auth.ts       ← POST /api/auth/register, /login, /dev-token
│       │   ├── rooms.ts      ← GET/POST /api/rooms, permissions, share
│       │   └── snapshots.ts  ← GET/POST /api/snapshots/:roomId
│       ├── middleware/
│       │   ├── auth.ts       ← JWT Bearer token verification
│       │   └── rateLimit.ts  ← Rate limiting (200/15min, 20/15min for auth)
│       ├── services/
│       │   └── persistence.ts ← In-memory Yjs persistence + snapshot service
│       └── y-websocket.d.ts  ← Type declarations for y-websocket
│
├── shared/                   ← TypeScript types shared by client + server
│   └── src/
│       └── index.ts          ← Shape types, Room, Auth, CRDT keys, constants
│
├── tests/
│   ├── unit/
│   │   └── crdt-shapes.test.ts     ← Shape CRUD, CRDT merges, undo/redo
│   ├── integration/
│   │   └── sync-offline.test.ts    ← 3-client offline merge, crash recovery
│   └── e2e/
│       └── multi-client.test.ts    ← 5-client concurrent op simulation
│
└── scripts/
    └── init-db.sql           ← PostgreSQL schema (rooms, users, snapshots)
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React + Konva)                   │
│                                                             │
│  WhiteboardCanvas ─────────────────────────────────────────┐│
│  (Konva Stage)  All shapes rendered here                    ││
│                                                             ││
│  NotesEditor ───── Y.Text ──── live collaborative editing   ││
│  PresenceAvatars ── Awareness ─ who is online               ││
│  CursorsLayer ───── Awareness ─ where others' mice are      ││
│                                                             ││
│  ┌─────────────────────────────────────────────────────┐   ││
│  │           Zustand Store (UI state only)              │   ││
│  │   activeTool, zoom, selection, panels open/closed    │   ││
│  └──────────────────────┬──────────────────────────────┘   ││
│                         │                                   ││
│  ┌──────────────────────▼──────────────────────────────┐   ││
│  │         Yjs Document (CRDT — Source of Truth)        │   ││
│  │  Y.Map("meta")    → room title, owner, version       │   ││
│  │  Y.Array("shapes") → every shape on the canvas       │   ││
│  │  Y.Array("layers") → layer list with lock/visible    │   ││
│  │  Y.Text("notes")  → collaborative notes panel        │   ││
│  │  Y.Map("comments") → comment threads                 │   ││
│  │  ─────────────────────────────────────────────────   │   ││
│  │  Awareness (ephemeral, NOT in Y.Doc)                 │   ││
│  │   → cursor positions, active tool, online status     │   ││
│  └───────────┬───────────────────┬──────────────────────┘   ││
│              │                   │                           ││
│  ┌───────────▼───────┐ ┌─────────▼───────────┐             ││
│  │  IndexedDB        │ │  WebSocket Provider  │             ││
│  │  (y-indexeddb)    │ │  (y-websocket)       │             ││
│  │  LOCAL FIRST      │ │  NETWORK SYNC        │             ││
│  │  Instant load     │ │  State-vector diff   │             ││
│  │  Works offline    │ │  ~10-50ms latency    │             ││
│  └───────────────────┘ └────────┬────────────┘             ││
└────────────────────────────────┼─────────────────────────────┘
                                 │ WebSocket (Yjs sync protocol)
┌────────────────────────────────▼─────────────────────────────┐
│                  SERVER (Node.js + Express)                    │
│                                                               │
│  y-websocket Server ─── syncs Y.Doc state across all clients  │
│  REST API ─────────────  /api/auth, /api/rooms, /api/snapshots│
│  JWT Middleware ────────  protects all endpoints              │
│  Rate Limiter ──────────  prevents abuse                      │
│  In-Memory Persistence ─  stores Yjs updates, auto-compacts   │
└───────────────────────────────────────────────────────────────┘
                                 │ (Phase 2)
┌────────────────────────────────▼─────────────────────────────┐
│            INFRASTRUCTURE (Docker Compose)                     │
│  PostgreSQL ────── rooms, users, permissions, audit           │
│  MinIO (S3) ─────  snapshot blobs, SVG exports               │
│  Redis ──────────  presence pub/sub, horizontal scaling       │
└───────────────────────────────────────────────────────────────┘
```

---

## Getting Started (Setup Guide)

### Step 1 — Check Prerequisites

Make sure you have these installed:

- **Node.js** version 18 or higher → [nodejs.org](https://nodejs.org)
- **npm** version 9 or higher (comes with Node.js)
- **Git** → [git-scm.com](https://git-scm.com)
- **Docker Desktop** (optional, only needed for Phase 2 database) → [docker.com](https://www.docker.com/products/docker-desktop)

Check your versions:
```bash
node --version    # should be v18.x.x or higher
npm --version     # should be 9.x.x or higher
```

### Step 2 — Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/whiteboard.git
cd whiteboard
```

### Step 3 — Set Up Environment Variables

```bash
# Copy the example env file
cp .env.example .env
```

Then open `.env` and fill in the values. For local development, the defaults in `.env.example` should work as-is. See [Environment Variables](#environment-variables) section below.

### Step 4 — Install All Dependencies

This is a monorepo with 3 packages (`client`, `server`, `shared`). One command installs everything:

```bash
npm install
```

npm workspaces will automatically install dependencies for `client/`, `server/`, and `shared/` in one go.

### Step 5 — Start the App

```bash
npm run dev
```

This starts both the backend server and the frontend simultaneously:

| Service | URL | What it does |
|---|---|---|
| Frontend (Vite) | http://localhost:5173 | The whiteboard app |
| Backend (Express) | http://localhost:3001 | REST API + WebSocket |

Open http://localhost:5173 in your browser. You can also open it in a second browser tab or window to test multi-user collaboration.

---

## Running the App

### Development Mode

```bash
# Start everything at once (recommended)
npm run dev

# Or start them separately in two terminals:
npm run dev:server    # starts Node.js server on :3001
npm run dev:client    # starts Vite frontend on :5173
```

### Production Build

```bash
# Build the client for production
npm run build

# The output goes to client/dist/
# Serve it with any static file server (Nginx, Vercel, Netlify, etc.)
```

### Quick Login for Testing

When you open the app, you'll see an auth screen. For local development:

- Click **"Quick Join (Offline)"** — no credentials needed, anonymous session
- Or click **Register** to create a local account
- Dev token endpoint: `POST http://localhost:3001/api/auth/dev-token` (dev mode only)

---

## Running Tests

The project has three levels of tests:

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file save)
npm run test:watch

# Run only unit tests
npx vitest run tests/unit/

# Run only integration tests
npx vitest run tests/integration/

# Run only e2e tests
npx vitest run tests/e2e/
```

### What Each Test Suite Covers

| Suite | File | What it tests |
|---|---|---|
| Unit | `tests/unit/crdt-shapes.test.ts` | Shape create/update/delete, CRDT merges, undo/redo, Y.Text edits, comments |
| Integration | `tests/integration/sync-offline.test.ts` | 3 clients merge offline edits, state vectors, snapshot restore, crash recovery |
| E2E | `tests/e2e/multi-client.test.ts` | 5 concurrent clients with mixed ops, conflict resolution, comment sync |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the backend server listens on |
| `JWT_SECRET` | `changeme-in-production` | Secret key for signing JWT tokens — **change this in production** |
| `JWT_EXPIRES_IN` | `7d` | How long JWT tokens are valid |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (your frontend URL) |
| `NODE_ENV` | `development` | Set to `production` for prod builds |
| `DB_HOST` | `localhost` | PostgreSQL host (Phase 2) |
| `DB_PORT` | `5432` | PostgreSQL port (Phase 2) |
| `DB_NAME` | `whiteboard` | PostgreSQL database name (Phase 2) |
| `DB_USER` | `postgres` | PostgreSQL user (Phase 2) |
| `DB_PASSWORD` | `postgres` | PostgreSQL password (Phase 2) |
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO/S3 endpoint (Phase 2) |
| `S3_BUCKET` | `whiteboard-snapshots` | Storage bucket name (Phase 2) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string (Phase 3) |

> **Note**: Variables marked "(Phase 2)" or "(Phase 3)" are only needed when you run Docker Compose for the production database setup.

---

## Docker / Phase 2 Infrastructure

For full production-like setup with PostgreSQL, object storage, and Redis:

```bash
# Start all infrastructure services in the background
docker-compose up -d

# Check that they are running
docker-compose ps

# Stop everything
docker-compose down

# Stop and delete all data (fresh start)
docker-compose down -v
```

Services started by Docker Compose:

| Service | Port | Purpose |
|---|---|---|
| PostgreSQL | 5432 | Persistent room/user/snapshot database |
| MinIO (S3) | 9000 / 9001 | Snapshot blobs and exported files |
| Redis | 6379 | Presence pub/sub and session cache |

Initialize the database schema after Docker is running:

```bash
# Run the SQL schema setup
docker exec -i whiteboard_postgres psql -U postgres -d whiteboard < scripts/init-db.sql
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `V` | Select tool |
| `P` | Pen / freehand draw |
| `L` | Line tool |
| `R` | Rectangle tool |
| `E` | Ellipse tool |
| `T` | Text tool |
| `N` | Sticky note |
| `A` | Arrow tool |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` or `Ctrl+Y` | Redo |
| `Ctrl++` or `=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Reset zoom to 100% |
| `Escape` | Deselect / cancel drawing |
| `Delete` or `Backspace` | Delete selected shape |
| `Ctrl+D` | Toggle debug panel |
| `Ctrl+E` | Open export menu |
| `Ctrl+L` | Toggle layers panel |
| `Ctrl+Shift+N` | Toggle notes panel |

---

## How the CRDT Sync Works

This is what makes the app special — here's a plain-English explanation:

### What is a CRDT?

A **CRDT (Conflict-free Replicated Data Type)** is a special data structure where two copies can always be merged together without conflicts, no matter what order changes were made in.

Think of it like Google Docs, but without needing a server to resolve conflicts — the math handles it automatically.

### The Flow

1. **You open the app** → Your Yjs document loads instantly from IndexedDB (local browser storage)
2. **You draw something** → The change is applied to your local Y.Doc immediately and saved to IndexedDB
3. **If you're online** → The change is sent to the server via WebSocket within milliseconds
4. **The server relays it** → All other connected clients receive the update and apply it locally
5. **You go offline** → You keep drawing; changes pile up in IndexedDB
6. **You reconnect** → Your client sends only the changes the server hasn't seen yet (state vector diff), and receives only what you missed — minimal bandwidth, perfect merge

### What Happens When Two People Edit the Same Thing?

| Scenario | Result |
|---|---|
| Two people move the same shape | Both moves are preserved; last one wins (Lamport timestamp) |
| Two people add different shapes | Both shapes appear for everyone |
| Two people edit the same text in Notes | Characters interleave intelligently (Y.Text semantic merge) |
| One person deletes a shape, another edits it | Delete wins (Yjs array CRDT semantics) |
| Same shape field edited by two people offline | Last-write-wins per field, deterministic across all clients |

### Awareness (Cursors) vs Document (Shapes)

| | Document State (shapes, notes) | Awareness State (cursors) |
|---|---|---|
| **Stored?** | Yes, IndexedDB + server | No, ephemeral only |
| **Survives refresh?** | Yes | No |
| **Conflict resolution** | CRDT merge | Last-write-wins per user |
| **Privacy** | Can be encrypted | Always plaintext |

---

## Roadmap

### Phase 1 — MVP (Complete)
- [x] Real-time multi-user collaboration
- [x] Full offline support with CRDT sync on reconnect
- [x] 7 shape types + freehand pen
- [x] Live cursors and presence
- [x] Undo/redo, layers, notes, comments
- [x] Style panel, export, snapshots
- [x] JWT auth, room permissions, rate limiting
- [x] Comprehensive test suite

### Phase 2 — Production Hardening (Complete)
- [x] PWA with offline install
- [x] E2E encryption module (AES-256-GCM)
- [x] Docker Compose infrastructure
- [x] PostgreSQL schema
- [ ] Wire up PostgreSQL (replace in-memory store)
- [ ] Wire up MinIO for snapshot blobs
- [ ] Wire up E2E encryption into sync path

### Phase 3 — Scaling (Planned)
- [ ] Redis pub/sub for horizontal WebSocket scaling
- [ ] Room sharding across server instances
- [ ] CDN-backed asset delivery
- [ ] Performance profiling and optimization

---

## License

MIT — free to use, modify, and distribute.

---

*Built with Yjs, React, Konva, and a genuine love for distributed systems.*
