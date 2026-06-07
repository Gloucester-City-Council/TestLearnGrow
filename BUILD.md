# Build Plan — SW Side Quests

This document tracks what's being built, why, and the current status of each piece.

---

## Vision

A lightweight team site for the South West Test & Learn Network that does three things well:

1. **Tracks shared work** — quests (tasks, ideas, learning goals) that anyone can pick up
2. **Broadcasts updates** — a noticeboard for announcements and shout-outs
3. **Connects people** — Top Trumps-style member cards showing expertise, stretch goals, and conversation starters

---

## Current State

The `Site/` folder (capital `S`) contains the runnable design output: a fully functional quest board app (~2,500 lines JSX + CSS). It works in a browser with no build tools. Everything currently persists to localStorage (single device only).

| Feature | Status |
|---|---|
| Quest board — post, claim, release, complete | ✅ Done |
| Quest update log with timeline | ✅ Done |
| XP system + leaderboard | ✅ Done |
| Sign-in (mock Entra, 7 seed accounts) | ✅ Done |
| Mobile responsive layout | ✅ Done |
| Quest types (Bounty / Idea / Learning) | 🔲 Planned (Phase 2) |
| Town Crier announcements section | 🔲 Planned (Phase 3) |
| Guild Member cards (Top Trumps) | 🔲 Planned (Phase 4) |
| Azure Blob Storage persistence | 🔲 Planned (Phase 1) |
| Azure Function API layer | 🔲 Planned (Phase 1) |
| XP-on-update (config flag exists, not wired) | 🔲 Planned (Phase 5) |
| Quest search/filter by text | 🔲 Planned (Phase 5) |

---


## Review Findings & Proposed Changes

A review of `README.md`, `CLAUDE.md`, and the current `Site/` code surfaced a few alignment fixes that should happen alongside the roadmap:

| Area | Finding | Proposed change | Priority |
|---|---|---|---|
| Config loading | `Site/config.example.js` documents `window.SW_CONFIG`, but `Side Quest Board.html` does not load `config.js`, and `Store` currently only checks `window.storage` then localStorage. | In Phase 1, add an optional `config.js` script before the JSX files and merge `window.SW_CONFIG` into `DEFAULT_CONFIG` before using `API_URL`. Until then, document config as future-facing. | High |
| Storage model | Current code persists separate keys (`sw-quests`, `sw-leaderboard`, schema/config/session), while Phase 1 plans one Blob JSON document. | Build a migration path that reads existing per-key localStorage data once and writes the full document shape (`quests`, `leaderboard`, `announcements`, `members`). | High |
| Folder casing | The user-facing phrase "site folder" can be mistaken for lowercase `site/`, but the repo directory is `Site/`. | Keep docs and commands using `Site/`; mention that casing matters on Linux/macOS. | Medium |
| Roadmap order | Phases 2–4 add fields/collections that will need shared persistence. | Complete Phase 1 before adding announcements or member cards, or add them against the planned full-document storage shape from the start. | Medium |
| Current filters | The app currently filters by quest state (`ALL`, `AVAILABLE`, `CLAIMED`, `COMPLETED`), not quest type. | When Phase 2 lands, either replace or combine filters so type filters and state filters do not regress current availability workflows. | Medium |

---

## Phase 1 — Data Layer & API

**Goal:** Replace localStorage with a shared Azure Blob Storage document via an Azure Function, so the whole team uses one live dataset.

### What to build

**`api/function.js`** — Azure Function HTTP trigger (Node.js v4 model):
- `GET /api/data` → reads `sw-data.json` from blob, returns parsed JSON
- `POST /api/data` → accepts full JSON body, writes `sw-data.json`, returns `{ ok: true }`
- CORS headers for local dev
- Credentials via environment variables (`AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER`)

**`api/host.json`** — Standard Azure Functions host config

**`Site/config.example.js`** — Template (currently present, but not loaded by the HTML until this phase wires it):
```js
window.SW_CONFIG = { API_URL: 'https://YOUR_FUNCTION.azurewebsites.net/api/data' }
```

**`Site/quest-data.jsx`** — Replace `window.storage` localStorage shim with `blobStorage`:
- `blobStorage.load()` — async GET from API_URL (or localStorage fallback)
- `blobStorage.save(data)` — async POST full JSON (or localStorage fallback)
- Optional local migration from existing `sw::sw-quests` / `sw::sw-leaderboard` localStorage keys into the full-document shape

**Blob document shape:**
```json
{
  "quests": [],
  "leaderboard": [],
  "announcements": [],
  "members": []
}
```

### Done when
- [ ] Azure Function created and deployable locally with `func start`
- [ ] `blobStorage.load()` returns correct data from blob (or falls back gracefully)
- [ ] `blobStorage.save()` writes changes and they persist on reload
- [ ] Two browser tabs see the same data after a page refresh
- [ ] Existing localStorage-only demo data migrates or falls back without a blank-board surprise

---

## Phase 2 — Quest Types

**Goal:** Add a `type` field to quests so Idea Scrolls and Learning Quests live on the same board as Bounties — same workflow, different flavour.

### What to build

- Add `type: "bounty" | "idea" | "learning"` to quest schema in `quest-data.jsx`
- Update `PostQuest` form in `quest-app-1.jsx` with a type picker:
  - ⚔️ Bounty — a task to get done
  - 💡 Idea Scroll — a pitch or suggestion to discuss
  - 📖 Learning Quest — something to explore or upskill
- Update `QuestCard` in `quest-components.jsx` to show type badge/icon
- Extend filter controls in `quest-app-2.jsx` without losing current state filters (`ALL`, `AVAILABLE`, `CLAIMED`, `COMPLETED`): add type filters for BOUNTIES / IDEAS / LEARNING or use separate state + type controls
- Add card style variants to `quest-styles.css` (subtle colour edge per type)

### Done when
- [ ] PostQuest form shows type picker
- [ ] Cards display correct type indicator
- [ ] Type filters work and current availability/completed workflows still work
- [ ] Existing quests without `type` treated as `"bounty"` (backwards compat)

---

## Phase 3 — Town Crier

**Goal:** A simple announcements noticeboard as a second nav section. Anyone can post.

### What to build

- Announcement schema in `quest-data.jsx`: `{ id, title, body, author_name, author_oid, pinned, created_at }`
- Seed with 2–3 example announcements
- `AnnouncementCard` component in `quest-components.jsx` — parchment/proclamation style, wax seal icon for pinned items
- `PostAnnouncement` modal in `quest-app-1.jsx` — title + body form
- Town Crier section in `quest-app-2.jsx` — feed of cards, post button
- "Town Crier" nav tab (horn icon) in header + mobile bottom nav
- Styles in `quest-styles.css`

### Done when
- [ ] Town Crier tab navigates to announcements feed
- [ ] Can post an announcement (title + body)
- [ ] Pinned announcements appear at top
- [ ] Cards styled consistently with existing aesthetic
- [ ] Mobile nav includes Town Crier tab

---

## Phase 4 — Guild Member Cards

**Goal:** Top Trumps-style profile cards for every member, showing who they are, what they know, what they're learning, and what to talk to them about.

### What to build

- Member schema in `quest-data.jsx`:
  ```js
  { oid, name, avatar, expertise: [], stretch: [], talk_about: [] }
  ```
- Stats derived at render time from quest/update data (not stored):
  - Quests Completed, Ideas Posted, Updates Given
- Seed member records for the 7 existing mock accounts (blank fields, they fill in themselves)
- `MemberCard` component in `quest-components.jsx`:
  - Top section: avatar, name, XP rank badge
  - Stat bars (3 RPG-style progress bars)
  - Expertise tags (gold badges)
  - Stretch tags (blue/learning colour)
  - "Talk to me about" list
  - Edit button (own card only)
- `EditMemberCard` modal in `quest-app-1.jsx` — form for expertise/stretch/talk_about fields, tag input pattern
- Guild Members section in `quest-app-2.jsx` — responsive card grid
- "Guild Members" nav tab (shield icon)
- Leaderboard moved to collapsible panel within this section on mobile
- Styles in `quest-styles.css` — card layout, tag badges, stat bars, flip/expand animation

### Done when
- [ ] Guild Members tab shows card grid
- [ ] Each card displays avatar, rank, stats, expertise, stretch, talk_about
- [ ] Stat bars reflect real quest/update data
- [ ] Members can edit their own card
- [ ] Changes persist via blobStorage
- [ ] Mobile layout works

---

## Phase 5 — Polish & Small Wires

Small things that complete the experience:

- **XP on update** — wire up `xp_on_update` config flag to award 10 XP per update post (already stubbed)
- **Quest text search** — filter input in board header, real-time filter by title/description text
- **Quest count badges** — show count on each filter tab (e.g. "IDEAS 3")
- **Toast on blob save failure** — graceful error if API is unreachable

### Done when
- [ ] Quest search input filters cards in real time
- [ ] Tab labels show counts
- [ ] XP-on-update awards 10 XP and reflects in leaderboard

---

## Architecture Notes

See `CLAUDE.md` for full codebase conventions. Key constraints:

- **No build tools** — CDN React + Babel, runs directly in browser
- **No ES modules** in `Site/` — global variable scope across files
- **Azure Function** holds all storage credentials — never in the browser
- **Single App component** holds all state — no context, no Redux
- **Existing aesthetic is the constraint** — all new UI must feel native to the guild hall theme

---

## Azure Setup

To connect live shared data:

1. Azure Storage account with a container (e.g. `sw-sidequests`)
2. Azure Function App (consumption plan, Node.js 20)
3. Set these App Settings on the Function:
   - `AZURE_STORAGE_CONNECTION_STRING` — connection string from the storage account
   - `AZURE_STORAGE_CONTAINER` — container name
4. Deploy `api/` to the Function App
5. Copy `Site/config.example.js` → `Site/config.js`, set `API_URL` to the function endpoint
