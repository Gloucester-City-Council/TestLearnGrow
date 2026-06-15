# CLAUDE.md — Activity Board Codebase Guide

This file is for AI-assisted development. It describes codebase structure, conventions, and the non-negotiable rules that apply to every change.

---

## Project overview

A white-label activity board deployable for any organisation. Built in `Site/v2/` as plain HTML5 + vanilla JS ES modules + hand-written CSS, targeting WCAG 2.2 AAA. The Azure Functions API lives in `api/`.

---

## File structure

```
Site/v2/                  # The rebuilt app (self-contained, relative paths)
  css/tokens.css          # All custom properties — palette, spacing, type
  css/base.css            # Reset, typography, skip link, focus, forms, print
  css/components.css      # Header, nav, breadcrumb, cards, chips, tables, etc.
  js/api.js               # apiGet/apiPost fetch wrappers
  js/auth.js              # getSession(), requireSignIn(), mock support
  js/config-loader.js     # DEFAULT_CONFIG, loadConfig(), t(), applyTheme()
  js/contrast.js          # luminance/ratio (ES module; mirrors api/contrast.js)
  js/data.js              # loadItems/saveItem/loadMembers/etc., nano/timeAgo/fullDate
  js/dom.js               # el() (no innerHTML), renderRegion(), announce(), moveFocus()
  js/forms.js             # validate(), showErrors(), draft save/load
  js/shell.js             # Nav aria-current, theme toggle, sign-out, user info
  js/mock-accounts.js     # MOCK_ACCOUNTS for local dev
  js/pages/               # One module per page: board, item, members, …
  config.js               # window.SW_CONFIG (git-ignored in production; committed as mock for dev)
  config.example.js       # Template to copy to config.js
api/
  function.js             # Azure Functions HTTP routes
  auth.js                 # parsePrincipal, isAdmin, authorizeItemWrite
  points.js               # awardPointsForTransition (idempotent)
  config-store.js         # validateConfig (schema + contrast), effectiveConfig, redactConfig
  contrast.js             # CommonJS copy of luminance/ratio for server-side validation
  tests/                  # 26 node:test unit tests
```

---

## Non-negotiable rules

### 1 — No innerHTML for user-supplied data

**Never** use `innerHTML`, `insertAdjacentHTML`, or `outerHTML` to render data that could contain user input. This prevents XSS.

Use `el()` from `js/dom.js` or set `textContent` directly:

```js
// Good
node.textContent = item.title;
el('p', { text: item.description });

// Bad — never
node.innerHTML = item.title;
container.insertAdjacentHTML('beforeend', `<p>${item.description}</p>`);
```

### 2 — Token-only colours

**Never** hardcode hex values or colour names in component CSS. Use CSS custom properties from `tokens.css`:

```css
/* Good */
color: var(--color-text);
background: var(--color-surface);

/* Bad */
color: #1B1B20;
background: #F4F4F1;
```

The only exception is `#B10000` (error red) in `base.css`, which is intentionally fixed so it always passes on both light and dark backgrounds.

### 3 — ES modules only in Site/v2/

Use `import`/`export` in `Site/v2/js/`. Do **not** use `<script>` tags without `type="module"` for app code. Do **not** use global variables as a communication channel between modules.

### 4 — Shell block must stay in sync

The nav shell (`<!-- shell:start -->` … `<!-- shell:end -->`) must be byte-identical across all pages that include it. CI checks this on every PR. To change the shell, update all pages simultaneously using a search-replace. Do not change only one page.

### 5 — API changes need tests

Any change to `api/auth.js`, `api/points.js`, `api/config-store.js`, or the route logic in `api/function.js` must be accompanied by a test in `api/tests/` and verified with:

```bash
cd api && node --test tests/auth.test.js tests/points.test.js tests/config.test.js
```

### 6 — No build tools

Do not add webpack, Vite, Rollup, TypeScript compilation, Babel, or any other build step. The frontend runs directly in the browser. If a library is genuinely needed, load it from a CDN with a known SRI hash — discuss first.

---

## AAA accessibility checklist (required on every PR)

Before marking a PR ready, confirm:

- [ ] All new interactive elements reachable and activatable by keyboard
- [ ] All new buttons have `min-height: 44px; min-width: 44px`
- [ ] All new dynamic content updates use `announce()` or `role="alert"` / `role="status"`
- [ ] All new links are self-describing (no "click here" or "read more")
- [ ] All new form fields have `<label for>` and `<span class="form-hint">` where needed
- [ ] Error states use GOV.UK pattern: error summary + inline field error + `aria-invalid`
- [ ] New status information does not rely on colour alone
- [ ] Any terminal/irreversible action uses the inline confirm widget pattern (`role="alertdialog"`)
- [ ] No new hardcoded colours — only CSS custom properties
- [ ] No new `innerHTML` / `insertAdjacentHTML` with user data

---

## Terminology

Config-driven terminology is accessed via `t(config, 'items.experiment.plural')`. **Never** hardcode item type labels in JS or HTML — always go through `t()`. This is what makes the app white-label.

---

## Auth and permissions

Client-side permission checks are for UX only (hiding/showing buttons). The server enforces all permissions via `api/auth.js:authorizeItemWrite()`. Do not rely on client-side checks for security.

When in doubt about whether a user action is allowed, let the server reject it with a 403, catch it in the page module, and surface it as a `status-message--error`.

---

## Data schemas

Item schemas are defined in `api/tests/auth.test.js` (experiment, session, challenge fixtures). The `migrateItem()` function in `Site/v2/js/data.js` normalises legacy `quest_id` → `item_id` and ensures array fields exist. Always pass items through `migrateItem()` before using them.

---

## What not to do

- Do not rename `Site/` to `site/` — casing matters in Linux and in Azure deployment config.
- Do not add new `api/` endpoints without server-side auth (`parsePrincipal`, `isAdmin` where appropriate).
- Do not add CSS animations without a `prefers-reduced-motion: reduce` guard.
- Do not introduce sticky or fixed-position headers — this violates WCAG 2.4.12.
- Do not add `justify` to text alignment — this violates WCAG 1.4.8.
- Do not use `tabindex` > 0.
- Do not use `setTimeout` or `setInterval` for DOM updates that could be triggered by user action instead.
