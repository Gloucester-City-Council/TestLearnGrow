# ⚔️ SW Side Quests

A browser-run RPG quest board for the South West Test & Learn Network — post tasks, claim work, earn XP, and see who's done what.

> The RPG aesthetic is the product, not decoration.

---

## What it does now

**Quest Board** — Post quests, claim or release open quests, add progress updates, complete owned quests, earn XP.

**Leaderboard** — Completed quests award XP and rank guild members by total score.

**Mock sign-in** — Pick from seven seeded demo accounts or join as a custom demo user. Production Microsoft Entra/MSAL auth is planned but not wired.

**Local storage** — Data persists to localStorage on one device. Shared Azure Blob Storage is planned; see BUILD.md.

---

## Planned roadmap

- Quest types: Bounties, Idea Scrolls, Learning Quests
- Town Crier announcement board
- Guild Member Top Trumps-style profile cards
- Azure Function API backed by a single Azure Blob Storage JSON document
- Search, quest-count badges, XP-on-update, save-failure toasts

Full phase plan in `BUILD.md`.

---

## Tech stack

| Layer | Current | Planned |
|---|---|---|
| Frontend | React 18 CDN, Babel Standalone, plain CSS | Same unless a build system is explicitly adopted |
| Storage | localStorage via `Store` | Azure Blob Storage single JSON document |
| API | None | Azure Function HTTP trigger |
| Auth | Mock account picker | Microsoft Entra ID / MSAL |
| Build tools | None | None |

---

## Getting started (local dev)

No build step. Serve the `Site/` folder with any static file server:

```bash
cd Site
python3 -m http.server 8000
```

Then open:

```
http://localhost:8000/Side%20Quest%20Board.html
```

Opening the HTML file directly from the filesystem may work in some browsers, but a local static server is more reliable because Babel Standalone loads the JSX files as external scripts.

---

## Folder structure

```
SWsidequests/
├── Site/                        # All frontend files
│   ├── Side Quest Board.html    # Entry point
│   ├── quest-data.jsx           # Data utilities, local storage shim, seed data
│   ├── quest-components.jsx     # Shared UI components
│   ├── quest-app-1.jsx          # Sign-in and PostQuest modal
│   ├── quest-app-2.jsx          # Root App, quest detail, state and handlers
│   ├── quest-styles.css         # Full theme
│   ├── config.example.js        # API config template — copy to config.js and fill in
│   ├── config.js                # Your local config (git-ignored)
│   └── avatars/                 # Pixel-art member portraits
├── BUILD.md                     # Detailed roadmap and phase plan
├── CLAUDE.md                    # Codebase guide for AI-assisted development
└── README.md                    # You are here
```

Planned but not yet present: `api/`.

---

## Contributing

Start with `BUILD.md` for product direction. Read `CLAUDE.md` before editing the site.
