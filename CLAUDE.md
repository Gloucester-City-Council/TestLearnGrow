# CLAUDE.md — SW Side Quests Codebase Guide

This file is for AI-assisted development. It describes how the codebase is structured, the patterns in use, and the conventions to follow when making changes.

---

## Project Overview

A single-page web app for the South West Test & Learn Network. The current MVP is a fun RPG-themed quest board with mock sign-in, localStorage persistence, quest updates, XP, and a leaderboard. No build tools — CDN React + Babel, runs directly in a browser. The design output code lives in `Site/` (capital `S`).

Planned but not yet present: announcements (Phase 3), guild member profiles (Phase 4), Azure Blob persistence and Azure Function API (Phase 1). See `BUILD.md` for the full phase plan.

---

## File Structure & Responsibilities

### `Site/` — All frontend

| File | Role |
|---|---|
| `index.html` | Entry point. Loads CDN scripts (React, Babel), then the JSX files in order, then mounts the app. |
| `quest-data.jsx` | Data layer. Local storage abstraction (`Store`), seed data, mock accounts, avatar map, and utility functions. Phase 1 replaces this with `blobStorage`. |
| `quest-components.jsx` | Shared presentational components. Icons (SVG), Avatar, XpBadge, StatusBadge, QuestCard, Modal, Leaderboard, QuestComplete celebration, Toast. No business logic. |
| `quest-app-1.jsx` | Modal forms for the MVP: `SignIn` and `PostQuest`. Phase 3–4 add `PostAnnouncement` and `EditMemberCard`. |
| `quest-app-2.jsx` | Root App component. All MVP state, filtering, data loading, and action handlers live here. Phase 3–4 add multi-section navigation. |
| `quest-styles.css` | Complete theme. CSS variables at `:root`, then layout, then per-component blocks. Responsive via media queries. No CSS-in-JS. |
| `config.js` | Git-ignored future Phase 1 local config. It should export `window.SW_CONFIG = { API_URL: '...' }`, but the current HTML does not load it yet. Wire it in before relying on it. |
| `config.example.js` | Committed template for `config.js`. |

### `api/` — Planned (Phase 1)

Not present yet. Phase 1 adds:

| File | Role |
|---|---|
| `function.js` | HTTP trigger. `GET /api/data` reads blob, `POST /api/data` writes blob. Holds Azure Storage credentials in environment variables only. |
| `host.json` | Azure Functions host config (version, logging). |

---

## Tech Stack Rules

- **No build tools.** No npm, no webpack, no vite. Everything runs in-browser via CDN.
- **CDN scripts** are loaded in `index.html` in this order: React → ReactDOM → Babel → app JSX files. If Phase 1 adds `config.js`, load it before `quest-data.jsx` and make the script optional/failure-tolerant for local dev.
- **JSX is transpiled at runtime** by Babel Standalone. Files must have `type="text/babel"` in the script tag.
- **No ES modules** (`import`/`export`) in frontend JSX — components are global variables accessed directly. Functions and components defined in earlier-loaded files are available in later-loaded files.
- **CSS variables** for all colours and spacing. Never hardcode hex values in component styles — reference variables such as `var(--gold)` and `var(--card)`.

---

## State & Data Flow

```
Store.get()
    ↓
App (quest-app-2.jsx) — holds all state: quests, leaderboard, session, filter, modal state
    ↓
Props passed down to section components and modals
    ↓
User action → handler in App → derive next state → Store.set(key, value) + setState
```

- **All state lives in App.** No context, no Redux. Props only.
- **Every write** updates React state and persists the changed key through `Store.set`.
- **`Store`** is defined in `quest-data.jsx`. It checks for `window.storage` first, then falls back to localStorage under `sw::` keys.
- **Current config caveat:** `config.example.js` exists, but `index.html` does not yet load `config.js`, and `Store` does not consume `window.SW_CONFIG` yet. Do not assume API-backed storage works until Phase 1 wires this.

**Planned change (Phase 1):** replace the per-key `Store` shape with `blobStorage.load()` / `blobStorage.save(fullData)`, using `window.SW_CONFIG.API_URL` when configured and localStorage fallback when absent. Include a one-time migration/fallback path for existing per-key localStorage demo data.

---

## Component Conventions

- **Functional components only.** No class components.
- **Hooks:** `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback` — all from `React.*` (not destructured imports, since there are no modules).
- **Modal pattern:** All modals use the shared `Modal` component from `quest-components.jsx`. Pass `onClose` prop; Modal handles Escape key and focus trap.
- **Icons:** Use `Icon.*` components from `quest-components.jsx`. Add new icons there as SVG components, not inline in feature files.
- **IDs:** Use `nano()` from `quest-data.jsx` for all new record IDs.
- **Timestamps:** Always store as ISO strings (`new Date().toISOString()`). Display using `timeAgo()` or `fullDate()` from `quest-data.jsx`.

---

## Styling Conventions

- **CSS variables** defined in `:root` in `quest-styles.css`. Key ones:
  - `--bg`, `--bg-2`, `--card`, `--card-2`, `--callout`
  - `--gold`, `--amber`, `--amber-hi`, `--xp`, `--xp-hi`
  - `--scroll`, `--scroll-2`, `--ink`, `--ink-dim`
  - `--font-display` (Cinzel), `--font-body` (IM Fell English), `--font-pixel` (Press Start 2P), `--font-num` (VT323)
- **Add new component styles** at the bottom of `quest-styles.css` in a clearly labelled block.
- **Responsive breakpoints:** `@media (max-width: 980px)` for tablet/mobile layout switches, `@media (max-width: 768px)` for single-column. Match existing breakpoints.
- **Animations:** Define keyframes at top of new style block. Respect `prefers-reduced-motion`.
- **Corner brackets** on cards/modals: reuse the existing `.corner` span pattern (`tl`, `tr`, `bl`, `br`) already in the CSS.

---

## Data Schemas

All schemas below use *planned (Phase N)* to flag fields or records not yet present in the codebase.

### Quest

```js
{
  quest_id, title, description,
  type: "bounty" | "idea" | "learning",   // planned (Phase 2); default "bounty" for existing records
  xp_reward: 50 | 100 | 250 | 500,
  status: "open" | "completed",
  posted_by_name, posted_by_oid,
  owner_name, owner_oid, owner_email,     // null if unclaimed
  claimed_at, closed_at, created_at,      // ISO strings or null
  updates: [{ id, author_name, author_oid, text, timestamp }]
}
```

### Announcement — planned (Phase 3)

```js
{
  id, title, body,
  author_name, author_oid,
  pinned: bool,
  created_at
}
```

### Member (guild card) — planned (Phase 4)

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
| `nano()` | Generates a short alphanumeric ID |
| `timeAgo(isoString)` | "2 hours ago", "1 day ago" etc. |
| `fullDate(isoString)` | Full readable date |
| `rankFor(xp, ranks)` | Returns rank label from config XP thresholds |
| `Store.get(key)` | Async — read one app key from `window.storage` or localStorage |
| `Store.set(key, value)` | Async — write one app key to `window.storage` or localStorage |

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

Planned Phase 1 behaviour: if `API_URL` is absent or empty, the app should silently fall back to localStorage — this is the intended default dev/offline mode. Current MVP behaviour is localStorage-only because `config.js` is not loaded yet.

---

## Planned Azure Function — planned (Phase 1)

`api/function.js`:
- Node.js HTTP trigger, Azure Functions v4 programming model
- `GET` → reads `sw-data.json` from blob container, returns JSON with CORS headers
- `POST` → accepts JSON body, writes to `sw-data.json`, returns `{ ok: true }`
- Environment variables required: `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER`
- No authentication on the function itself (URL obscurity + SAS for now; Entra auth can be added later)

---

## What Not To Do

- Don't add a build system. If the complexity demands one, that's a separate conversation.
- Don't rename `Site/` to lowercase `site/` without updating every command, doc, and deployment path; casing matters in this environment.
- Don't use ES module syntax (`import`/`export`) in any `Site/` file.
- Don't add new npm dependencies to the frontend — use CDN if a library is genuinely needed.
- Don't split state into multiple stores or contexts — keep it in App.
- Don't hardcode colours — use CSS variables.
- Don't break the existing RPG aesthetic. New UI must feel like it belongs in the same guild hall.
