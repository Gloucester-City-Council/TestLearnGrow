# ⚔️ SW Side Quests

> *The South West Test & Learn Network's guild board — where work becomes adventure.*

A fun, friendly team tool for the SW Test & Learn Network. Part project board, part people connector, part noticeboard. Built with a retro RPG aesthetic because spreadsheets are boring and quests are not.

---

## Current MVP

The current app is a browser-run quest board with local persistence:

**Quest Board** — Post workplace quests, claim or release open quests, add progress updates, complete owned quests, and earn XP.

**Leaderboard** — Completed quests award XP and rank guild members by total score.

**Mock Entra sign-in** — Pick from seven seeded demo accounts, or join as a custom demo user. Production Microsoft Entra/MSAL auth is planned but not wired yet.

**Local/offline storage** — Data currently persists to localStorage on one device. Shared Azure Blob Storage is planned in the roadmap.

---

## Planned Roadmap

The roadmap in `BUILD.md` tracks the target product:

* Quest types: Bounties, Idea Scrolls, and Learning Quests.
* Town Crier announcement board.
* Guild Member Top Trumps-style profile cards.
* Azure Function API backed by a single Azure Blob Storage JSON document.
* Search, quest-count badges, XP-on-update, and save-failure toasts.

---

## Tech Stack

| Layer | Current | Planned |
|---|---|---|
| Frontend | React 18 CDN, Babel Standalone, plain CSS | Same unless the project explicitly chooses a build system later |
| Storage | localStorage fallback via `Store` | Azure Blob Storage single JSON document |
| API | None yet | Azure Function HTTP trigger |
| Auth | Mock account picker | Microsoft Entra ID / MSAL |
| Build tools | None | None |

---

## Getting Started (Local Dev)

The app has no build step. Serve the `Site/` folder with any static file server:

```bash
cd Site
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/Side%20Quest%20Board.html
```

Opening `Site/Side Quest Board.html` directly from the filesystem may work in some browsers, but a local static server is more reliable because the page loads external JSX files through Babel Standalone.

---

## Folder Structure

```text
SWsidequests/
├── Site/                        # All frontend files
│   ├── Side Quest Board.html    # Entry point
│   ├── quest-data.jsx           # Data utilities, local storage shim, seed data
│   ├── quest-components.jsx     # Shared UI components
│   ├── quest-app-1.jsx          # Sign-in and PostQuest modal
│   ├── quest-app-2.jsx          # Root App, quest detail, state and handlers
│   ├── quest-styles.css         # Full theme
│   └── avatars/                 # Pixel-art member portraits
├── BUILD.md                     # Detailed roadmap and phase plan
├── CLAUDE.md                    # Codebase guide for AI-assisted development
└── README.md                    # You are here
```

Planned but not yet present: `api/`, `Site/config.example.js`, and `Site/config.js`.

---

## Contributing

For product direction, start with `BUILD.md`. For implementation conventions, read `CLAUDE.md` before editing the site.
