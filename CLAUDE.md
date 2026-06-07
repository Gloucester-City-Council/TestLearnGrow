# CLAUDE.md — SW Side Quests Codebase Guide

This file is for AI-assisted development. It describes how the codebase is structured, the patterns in use, and the conventions to follow when making changes.

---

## Project Overview

A single-page web app for the South West Test & Learn Network. Fun RPG-themed team tool: quest board, announcements, and guild member profiles. No build tools — CDN React + Babel, runs directly in a browser.

---

## File Structure & Responsibilities

### `Site/` — All frontend

| File | Role |
|---|---|
| `Side Quest Board.html` | Entry point. Loads CDN scripts (React, Babel), then the JSX files in order, then mounts the app. |
| `quest-data.jsx` | Data layer. Schemas (quest, announcement, member), storage abstraction (`blobStorage`), seed data, utility functions (nano ID, relative time, XP calculations). |
| `quest-components.jsx` | Shared presentational components. Icons (SVG), Avatar, XpBadge, StatusBadge, QuestCard, Modal, Leaderboard, QuestComplete celebration, Toast. No business logic. |
| `quest-app-1.jsx` | Modal forms. SignIn, PostQuest (with type picker), PostAnnouncement, EditMemberCard. Each exports a single component. |
| `quest-app-2.jsx` | Root App component. All section state, navigation, data fetching, and action handlers live here. Renders the three sections. Calls `ReactDOM.createRoot`. |
| `quest-styles.css` | Complete theme. CSS variables at `:root`, then layout, then per-component blocks. Responsive via media queries. No CSS-in-JS. |
| `config.js` | Git-ignored. Exports `window.SW_CONFIG = { API_URL: '...' }`. If absent, app falls back to localStorage. |
| `config.example.js` | Committed template for `config.js`. |

### `api/` — Azure Function

| File | Role |
|---|---|
| `function.js` | HTTP trigger. `GET /api/data` reads blob, `POST /api/data` writes blob. Holds Azure Storage credentials in environment variables. |
| `host.json` | Azure Functions host config (version, logging). |

---

## Tech Stack Rules

- **No build tools.** No npm, no webpack, no vite. Everything runs in-browser via CDN.
- **CDN scripts** are loaded in `Side Quest Board.html` in this order: React → ReactDOM → Babel → app JSX files.
- **JSX is transpiled at runtime** by Babel Standalone. Files must have `type="text/babel"` in the script tag.
- **No ES modules** (`import`/`export`) in frontend JSX — components are global variables accessed directly. Functions and components defined in earlier-loaded files are available in later-loaded files.
- **CSS variables** for all colours and spacing. Never hardcode hex values in component styles — reference `var(--color-gold)` etc.

---

## State & Data Flow

```
blobStorage.load()
    ↓
App (quest-app-2.jsx) — holds all state: quests, announcements, members, leaderboard, session, activeSection
    ↓
Props passed down to section components and modals
    ↓
User action → handler in App → mutate state → blobStorage.save(fullData) → setState
```

- **All state lives in App.** No context, no Redux. Props only.
- **Every write** calls `blobStorage.save()` immediately after `setState`.
- **`blobStorage`** is defined in `quest-data.jsx`. It checks `window.SW_CONFIG.API_URL`; if present, does `fetch` GET/POST to the Azure Function; otherwise reads/writes localStorage under `sw::` keys.

---

## Component Conventions

- **Functional components only.** No class components.
- **Hooks:** `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback` — all from `React.*` (not destructured imports, since there are no modules).
- **Modal pattern:** All modals use the shared `Modal` component from `quest-components.jsx`. Pass `onClose` prop; Modal handles Escape key and focus trap.
- **Icons:** Use `Icon.*` components from `quest-components.jsx`. Add new icons there as SVG components, not inline in feature files.
- **IDs:** Use `nanoId()` from `quest-data.jsx` for all new record IDs.
- **Timestamps:** Always store as ISO strings (`new Date().toISOString()`). Display using `relativeTime()` or `formatDate()` from `quest-data.jsx`.

---

## Styling Conventions

- **CSS variables** defined in `:root` in `quest-styles.css`. Key ones:
  - `--bg-deep`, `--bg-card`, `--bg-parchment`
  - `--color-gold`, `--color-amber`, `--color-xp-green`
  - `--font-display` (Cinzel), `--font-body` (IM Fell English), `--font-pixel` (Press Start 2P), `--font-mono` (VT323)
- **Add new component styles** at the bottom of `quest-styles.css` in a clearly labelled block.
- **Responsive breakpoints:** `@media (max-width: 980px)` for tablet/mobile layout switches, `@media (max-width: 768px)` for single-column. Match existing breakpoints.
- **Animations:** Define keyframes at top of new style block. Respect `prefers-reduced-motion`.
- **Corner brackets** on cards: use the `.corner-bracket` pseudo-element pattern already in the CSS.

---

## Data Schemas

### Quest
```js
{
  quest_id, title, description,
  type: "bounty" | "idea" | "learning",   // "bounty" is default/legacy
  xp_reward: 50 | 100 | 250 | 500,
  status: "open" | "completed",
  posted_by_name, posted_by_oid,
  owner_name, owner_oid, owner_email,     // null if unclaimed
  claimed_at, closed_at, created_at,      // ISO strings or null
  updates: [{ id, author_name, author_oid, text, timestamp }]
}
```

### Announcement
```js
{
  id, title, body,
  author_name, author_oid,
  pinned: bool,
  created_at
}
```

### Member (guild card)
```js
{
  oid,               // matches session/leaderboard oid
  name,
  avatar,            // filename or null (uses initials fallback)
  expertise: [],     // string tags, max 5
  stretch: [],       // string tags, max 3
  talk_about: [],    // freeform strings, max 3
}
```

### Leaderboard entry
```js
{ oid, name, xp }
```

---

## Key Utilities (quest-data.jsx)

| Function | Purpose |
|---|---|
| `nanoId()` | 10-char alphanumeric ID |
| `relativeTime(isoString)` | "2 hours ago", "yesterday" etc. |
| `formatDate(isoString)` | Full readable date |
| `getRank(xp)` | Returns rank label from config XP thresholds |
| `blobStorage.load()` | Async — fetch all app data |
| `blobStorage.save(data)` | Async — write full app data |

---

## Config Shape (window.SW_CONFIG)

```js
window.SW_CONFIG = {
  API_URL: 'https://your-function.azurewebsites.net/api/data',
  // optional overrides:
  network_name: 'South West Test & Learn Network',
  season_label: 'Season 3 — The Reorganisation Arc',
}
```

If `API_URL` is absent or empty, the app silently falls back to localStorage. This is the dev/offline mode.

---

## Azure Function (api/function.js)

- Node.js HTTP trigger, Azure Functions v4 programming model
- `GET` → reads `sw-data.json` from blob container, returns JSON with CORS headers
- `POST` → accepts JSON body, writes to `sw-data.json`, returns `{ ok: true }`
- Environment variables needed: `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER`
- No authentication on the function itself (rely on obscurity of URL + SAS for now; can add Entra auth later)

---

## What Not To Do

- Don't add a build system. If the complexity demands one, that's a separate conversation.
- Don't use ES module syntax (`import`/`export`) in any `Site/` file.
- Don't add new npm dependencies to the frontend — use CDN if a library is genuinely needed.
- Don't split state into multiple stores or contexts — keep it in App.
- Don't hardcode colours — use CSS variables.
- Don't break the existing RPG aesthetic. New UI must feel like it belongs in the same guild hall.
