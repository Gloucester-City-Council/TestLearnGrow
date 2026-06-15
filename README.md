# Activity Board

A white-label activity tracking board for teams and communities. Built on Azure Static Web Apps with Entra ID authentication, blob storage, and no build tools.

The app lives in `Site/v2/` and targets **WCAG 2.2 AAA** conformance (see `DEPLOYMENT.md`).

---

## What is this?

A shared board for running a **Test–Learn–Grow** practice in the open. Instead of
improvement work happening in scattered documents and inboxes, a team uses the
board to: post **experiments** with a hypothesis and a success measure written
*before* the test starts, run **sessions** people can sign up to, set
**challenges** others can respond to — and then carry the findings that worked
forward to a deliberate scale decision.

It is deliberately a thin presentation layer over that method: the value is in the
gates (a test must have a success measure, a scale decision must record its
evidence) and in making the work visible, not in heavy machinery. It is
white-label — every label, colour, and points rule is configurable — so the same
board serves any organisation that wants to test, learn, and grow.

**New here? Start with the [user guide](docs/guide.md)** — what each activity is,
the experiment lifecycle, points, and roles.

---

## What it does

- **Board** — view experiments, sessions, and challenges in one place
- **Item actions** — advance statuses, sign up for sessions, join teams, share findings
- **Members** — profiles with expertise and learning goals
- **Leaderboard** — optional points system with configurable ranks
- **Admin** — branding, terminology, features, and colour palette editable from the UI with live WCAG AAA contrast validation

---

## Technology

| Layer | Choice |
|---|---|
| Frontend | Plain HTML5, vanilla JS ES modules, hand-written CSS |
| Auth | Azure Static Web Apps built-in Entra ID |
| API | Azure Functions v4 (Node.js) |
| Storage | Azure Blob Storage (JSON blobs, one per item) |
| Build | None — no bundler, no transpilation, no CDN dependencies |

---

## Repository layout

```
Site/
└── v2/                  # the app — self-contained, relative paths
    ├── index.html       # Home — your next steps, fresh learning, board
    ├── item.html        # Activity detail (?id=…)
    ├── new-*.html       # Create experiment/session/challenge
    ├── edit-item.html   # Edit any owned item
    ├── members.html     # Members list with search
    ├── member.html      # Guild card (?id=oid)
    ├── member-edit.html # Edit own guild card
    ├── leaderboard.html # Points leaderboard
    ├── admin.html       # Admin-only config editor
    ├── signin.html      # Entra sign-in / mock picker
    ├── 404.html
    ├── css/             # tokens.css, base.css, components.css
    ├── js/              # api, auth, config-loader, data, dom, shell, forms, contrast, onboarding, guild-card, tag-field
    └── js/pages/        # per-page modules
api/
├── function.js          # HTTP routes
├── auth.js              # parsePrincipal, isAdmin, authorizeItemWrite
├── points.js            # awardPointsForTransition (idempotent)
├── config-store.js      # validateConfig (schema + WCAG AAA contrast)
├── contrast.js          # luminance/ratio math
└── tests/               # 26 node:test unit tests
```

---

## Quick start (local dev)

```bash
npm install -g @azure/static-web-apps-cli

# Copy and edit the local config
cp Site/v2/config.example.js Site/v2/config.js
# Set AUTH_MODE: 'mock' for local dev without real Entra auth

# Start local server
swa start Site --api-location api
# Browse http://localhost:4280/v2/

# Run API tests
cd api && node --test tests/auth.test.js tests/points.test.js tests/config.test.js
```

---

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) — covers storage account, SWA Standard plan, Entra app registration, secrets, and tenant ID configuration.

---

## Accessibility

See [`ACCESSIBILITY.md`](ACCESSIBILITY.md) — full WCAG 2.2 A/AA/AAA conformance matrix, manual test checklist, and content style guide.

---

## Contributing

See [`CLAUDE.md`](CLAUDE.md) for code conventions and the AAA accessibility checklist required on every PR.
