# ⚔️ SW Side Quests

> *The South West Test & Learn Network's guild board — where work becomes adventure.*

A fun, friendly team tool for the SW Test & Learn Network. Part project board, part people connector, part noticeboard. Built with a retro RPG aesthetic because spreadsheets are boring and quests are not.

---

## What It Does

**Quest Board** — Post tasks, ideas, and learning goals as quests. Claim them, track progress, and earn XP when they're done. Filter by type: Bounties (tasks to do), Idea Scrolls (pitches to discuss), and Learning Quests (things to explore).

**Town Crier** — A noticeboard for announcements, updates, and shout-outs from the guild. Anyone can post.

**Guild Members** — Top Trumps-style cards for every member. See what people know, what they're learning, and what to talk to them about. A quick way to find the right person or start a conversation.

---

## Tech Stack

| Layer | What |
|---|---|
| Frontend | React 18 (CDN), Babel Standalone (in-browser JSX), plain CSS |
| Storage | Azure Blob Storage (single JSON document) |
| API | Azure Function (HTTP trigger) — reads/writes the blob |
| Auth | Microsoft Entra ID (mocked for dev; MSAL-ready for prod) |
| Build tools | None — open `Site/Side Quest Board.html` in a browser |

---

## Getting Started (Local Dev)

1. Clone the repo
2. Open `Site/Side Quest Board.html` in a browser
3. That's it — it runs from the filesystem using localStorage as a fallback

To connect to the real shared data:
1. Copy `Site/config.example.js` → `Site/config.js`
2. Fill in your Azure Function URL
3. Refresh — data now reads/writes from the shared blob

---

## Folder Structure

```
SWsidequests/
├── Site/                        # All frontend files
│   ├── Side Quest Board.html    # Entry point — open this
│   ├── quest-data.jsx           # Data schemas, storage layer, seed data
│   ├── quest-components.jsx     # Shared UI components
│   ├── quest-app-1.jsx          # Sign-in, PostQuest, PostAnnouncement modals
│   ├── quest-app-2.jsx          # Main app, routing, all section views
│   ├── quest-styles.css         # Full theme (1100+ lines)
│   ├── config.example.js        # API config template
│   ├── config.js                # Your local config (git-ignored)
│   └── avatars/                 # Pixel-art member portraits
├── api/                         # Azure Function
│   ├── function.js              # GET/POST handler for blob data
│   └── host.json                # Function host config
├── BUILD.md                     # Detailed build plan and progress
├── CLAUDE.md                    # Codebase guide for AI-assisted development
└── README.md                    # You are here
```

---

## Contributing

Sign in, pick a quest, and get after it. Or post one. That's the whole loop.

For code contributions — see `BUILD.md` for what's planned and `CLAUDE.md` for how the codebase is structured.
