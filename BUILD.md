# Build Plan — SW Side Quests

This document tracks what's being built, why, and the current status of each piece.

---

## Vision

A lightweight team site for the South West Test & Learn Network that does three things well:

1. **Tracks shared work** — quests (tasks, ideas, learning goals) that anyone can pick up
2. **Broadcasts updates** — a noticeboard for announcements and shout-outs
3. **Connects people** — Top Trumps-style member cards showing expertise, stretch goals, and conversation starters

Fun and friendly is not optional. The RPG aesthetic is the product.

---

## Current State

The `Site/` folder contains a fully functional quest board app (~2,500 lines JSX + CSS). It works in a browser with no build tools. Everything currently persists to localStorage (single device only).

| Feature | Status |
|---|---|
| Quest board — post, claim, release, complete | ✅ Done |
| Quest update log with timeline | ✅ Done |
| XP system + leaderboard | ✅ Done |
| Sign-in (mock Entra, 7 seed accounts) | ✅ Done |
| Mobile responsive layout | ✅ Done |
| Quest types (Bounty / Idea / Learning) | 🔲 To do |
| Town Crier announcements section | 🔲 To do |
| Guild Member cards (Top Trumps) | 🔲 To do |
| Azure Blob Storage persistence | 🔲 To do |
| Azure Function API layer | 🔲 To do |
| XP-on-update (config flag exists, not wired) | 🔲 To do |
| Quest search/filter by text | 🔲 To do |

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

**`Site/config.example.js`** — Template:
```js
window.SW_CONFIG = { API_URL: 'https://YOUR_FUNCTION.azurewebsites.net/api/data' }
```

**`Site/quest-data.jsx`** — Replace `window.storage` localStorage shim with `blobStorage`:
- `blobStorage.load()` — async GET from API_URL (or localStorage fallback)
- `blobStorage.save(data)` — async POST full JSON (or localStorage fallback)

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
- Extend filter tabs in `quest-app-2.jsx`: ALL / BOUNTIES / IDEAS / LEARNING / COMPLETED
- Add card style variants to `quest-styles.css` (subtle colour edge per type)

### Done when
- [ ] PostQuest form shows type picker
- [ ] Cards display correct type indicator
- [ ] Filter tabs work for each type
- [ ] Existing quests without `type` field treated as "bounty" (backwards compat)

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

## What You'll Need (Azure Setup)

To connect the live shared data:

1. Azure Storage account with a container (e.g. `sw-sidequests`)
2. Azure Function App (consumption plan, Node.js 20)
3. Set these App Settings on the Function:
   - `AZURE_STORAGE_CONNECTION_STRING` — connection string from the storage account
   - `AZURE_STORAGE_CONTAINER` — container name
4. Deploy `api/` to the Function App
5. Copy `Site/config.example.js` → `Site/config.js`, set `API_URL` to the function endpoint
