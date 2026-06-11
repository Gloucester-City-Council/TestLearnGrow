# Accessibility conformance

The `Site/v2/` application targets **WCAG 2.2 Level AAA** conformance. This document records the status of every applicable success criterion, with implementation notes and a manual test checklist.

**Conformance scope:** All pages under `Site/v2/` served from Azure Static Web Apps.  
**Language:** English (`lang="en"` on every `<html>` element).  
**Last audit:** Automated (axe-core, pa11y-ci) + manual (keyboard + screen reader walkthrough).

---

## How to read this table

| Status | Meaning |
|---|---|
| **Met** | Implementation in place; verified |
| **N/A** | Not applicable to this site (reason given) |

---

## Level A

| SC | Title | Status | Notes |
|---|---|---|---|
| 1.1.1 | Non-text content | Met | Avatar initials carry `aria-hidden`; all functional images have `alt`. No decorative images. |
| 1.2.1 | Audio-only and Video-only | N/A | No audio or video content. |
| 1.2.2 | Captions (Prerecorded) | N/A | No video content. |
| 1.2.3 | Audio Description or Media Alternative | N/A | No video content. |
| 1.3.1 | Info and Relationships | Met | Semantic HTML5 throughout: `<header>`, `<nav>`, `<main>`, `<section aria-labelledby>`, `<table>` with `<caption>` and `scope`, `<fieldset>`/`<legend>` for grouped controls, `<label for>` on every input. |
| 1.3.2 | Meaningful Sequence | Met | DOM order matches visual order; no CSS reordering that would change reading sequence. |
| 1.3.3 | Sensory Characteristics | Met | Status chips always carry the status word as text — colour is purely redundant (1.4.1 also). Instructions do not rely on shape, size, or position alone. |
| 1.4.1 | Use of Colour | Met | Status chips: text label always present. Error states: text label + border + icon. Focus: 3 px outline, not colour alone. |
| 1.4.2 | Audio Control | N/A | No audio. |
| 2.1.1 | Keyboard | Met | All interactive elements reachable and operable by keyboard. No mouse-only interactions. Tag removal `×` buttons and colour pickers are keyboard-accessible. |
| 2.1.2 | No Keyboard Trap | Met | No custom focus traps. The sign-in redirect is a full navigation, not a trap. |
| 2.1.4 | Character Key Shortcuts | N/A | No single-character keyboard shortcuts. |
| 2.2.1 | Timing Adjustable | N/A | No time limits imposed. |
| 2.2.2 | Pause, Stop, Hide | N/A | No moving, blinking, or auto-updating content by default. The opt-in auto-refresh is user-initiated, toggleable, and off by default. |
| 2.3.1 | Three Flashes or Below Threshold | N/A | No flashing content. |
| 2.4.1 | Bypass Blocks | Met | Skip link is the first focusable element on every page, targeting `#main`. |
| 2.4.2 | Page Titled | Met | Each page has a unique `<title>` in the form `Page Name — Org Name`. The org name is updated from config without a page reload. |
| 2.4.3 | Focus Order | Met | DOM order is logical; no `tabindex` > 0 used. Programmatic focus moves (`moveFocus()`) go to headings or form summaries after dynamic updates. |
| 2.4.4 | Link Purpose (In Context) | Met | All card links have `<span class="sr-only">View experiment: </span>` prefixes; all action links are self-describing. |
| 2.5.1 | Pointer Gestures | N/A | No multi-point gestures required for any function. |
| 2.5.2 | Pointer Cancellation | Met | All actions on `click` (mouseup equivalent); no `mousedown`/`pointerdown` activation. |
| 2.5.3 | Label in Name | Met | Visible button and link text matches or starts the accessible name. |
| 2.5.4 | Motion Actuation | N/A | No device-motion-activated functions. |
| 3.1.1 | Language of Page | Met | `lang="en"` on every `<html>` element. |
| 3.2.1 | On Focus | Met | No context changes on focus. |
| 3.2.2 | On Input | Met | No context changes on input, only on explicit submit/click. Theme toggle is explicit. |
| 3.2.6 | Consistent Help | Met | Contact/help is not applicable; navigation is consistent across pages. |
| 3.3.1 | Error Identification | Met | GOV.UK-style error summary identifies each field in error by name; inline errors adjacent to each field. |
| 3.3.2 | Labels or Instructions | Met | Every input has a `<label for>`. Hints via `<span class="form-hint">` linked with `aria-describedby`. |
| 3.3.7 | Redundant Entry | Met | No form asks for information already entered in the same session. |
| 4.1.1 | Parsing | Met | Valid HTML5 markup throughout; no duplicate IDs. |
| 4.1.2 | Name, Role, Value | Met | All custom widgets (`aria-pressed` toggle, `role="alertdialog"` confirm, `aria-live` regions, `aria-current="page"`) follow ARIA patterns. |
| 4.1.3 | Status Messages | Met | All dynamic status messages use `role="status"` or `aria-live="polite"`. Error summaries use `role="alert"`. The shared `#live-region` announces board refreshes. |

---

## Level AA

| SC | Title | Status | Notes |
|---|---|---|---|
| 1.2.4 | Captions (Live) | N/A | No live audio content. |
| 1.2.5 | Audio Description (Prerecorded) | N/A | No video content. |
| 1.3.4 | Orientation | Met | No CSS locks orientation. |
| 1.3.5 | Identify Input Purpose | Met | `autocomplete="name"` and `autocomplete="email"` on member-edit. `autocomplete="off"` on search/date fields where autofill would be unhelpful. |
| 1.4.3 | Contrast (Minimum) | Met | All text ≥ 4.5:1 (normal), ≥ 3:1 (large). All pairs actually ≥ 7:1 (see AAA 1.4.6). |
| 1.4.4 | Resize Text | Met | `font-size: 100%` on `<html>` respects user browser font-size preference. All sizes in `rem`. No clipping at 200% zoom. |
| 1.4.5 | Images of Text | N/A | No images of text used. |
| 1.4.10 | Reflow | Met | Single-column layout at 320 px / 400% zoom; no horizontal scrolling. CSS Grid with `auto-fill` and `min(100%, Npx)` columns. |
| 1.4.11 | Non-text Contrast | Met | Form borders, focus rings, and UI components meet 3:1 against adjacent colours. |
| 1.4.12 | Text Spacing | Met | `line-height: 1.6`, paragraph spacing via margins. No fixed-height containers that would clip text if letter/word/line spacing is overridden by users. |
| 1.4.13 | Content on Hover or Focus | Met | No content appears only on hover. All tooltips/additional content is triggered by explicit interaction. |
| 2.4.5 | Multiple Ways | Met | Global navigation + search on members page + back/breadcrumb links. |
| 2.4.6 | Headings and Labels | Met | One `<h1>` per page; section headings describe their content; all labels are descriptive. |
| 2.4.7 | Focus Visible | Met | `:focus-visible` shows 3 px outline + 2 px offset on all interactive elements. |
| 2.5.7 | Dragging Movements | N/A | No drag-only interactions. |
| 2.5.8 | Target Size (Minimum) | Met | All interactive elements `min-height: 44px; min-width: 44px` (exceeds 24×24 minimum). |
| 3.1.2 | Language of Parts | Met | No multi-language content; all text is English. |
| 3.2.3 | Consistent Navigation | Met | Shell block (`<!-- shell:start/end -->`) is byte-identical across all pages. CI grep enforces this on every PR. |
| 3.2.4 | Consistent Identification | Met | Same icon/label patterns used for equivalent functions across pages. |
| 3.3.3 | Error Suggestion | Met | Inline field errors provide specific correction guidance (e.g. "Finding must be at least 10 characters"). |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | Met | All item saves are editable; terminal status transitions require inline confirmation (see AAA 3.3.6). |
| 3.3.8 | Accessible Authentication (Minimum) | Met | Sign-in is a single link to Entra; no cognitive function test required on our pages. MFA is at Entra's discretion; users can use authenticator apps. |

---

## Level AAA

| SC | Title | Status | Notes |
|---|---|---|---|
| 1.2.6 | Sign Language | N/A | No pre-recorded audio content. |
| 1.2.7 | Extended Audio Description | N/A | No video content. |
| 1.2.8 | Media Alternative (Prerecorded) | N/A | No audio/video content. |
| 1.2.9 | Audio-only (Live) | N/A | No live audio content. |
| 1.3.6 | Identify Purpose | Met | ARIA landmark regions on every page: `<header>`, `<nav aria-label>`, `<main>`, `<section aria-labelledby>`. `role="status"`, `role="alert"`, `role="alertdialog"` on dynamic messages. |
| 1.4.6 | Contrast (Enhanced) | Met | All text ≥ 7:1. Status chip pairs verified: lowest is 7.8:1. Focus ring 9.6:1. Admin palette editor enforces this on save. |
| 1.4.7 | Low or No Background Audio | N/A | No audio content. |
| 1.4.8 | Visual Presentation | Met | `max-width: 70ch` on body text; `text-align: left` (no justified text); `line-height: 1.6`; system font stack (user can override font in browser); background/foreground set by CSS variables honoring `prefers-color-scheme`. |
| 1.4.9 | Images of Text (No Exception) | N/A | No images of text. |
| 2.1.3 | Keyboard (No Exception) | Met | All functionality available by keyboard including colour picker (keyboard-navigable `<input type="color">`), tag widget, dynamic rank/skill rows, and confirm dialogs. |
| 2.2.3 | No Timing | Met | No time-limited functions anywhere in the application. |
| 2.2.4 | Interruptions | Met | No auto-updating content by default. Board auto-refresh is opt-in, user-toggled, off by default, and can be disabled at any time. |
| 2.2.5 | Re-authenticating | Met | All form inputs autosave to `sessionStorage` on every `input`/`change` event under `sw::draft::` keys. After Entra re-authentication redirects back, the draft is restored from sessionStorage before the user can see the form. |
| 2.2.6 | Timeouts | Met | No server-side session timeout that would lose form data. Entra token refresh is transparent. |
| 2.3.2 | Three Flashes (No Exception) | N/A | No flashing or animation that could trigger photosensitivity. |
| 2.3.3 | Animation from Interactions | Met | All CSS transitions are gated by `--transition: 0ms` under `prefers-reduced-motion: reduce`. `scroll-behavior: auto` also applied. |
| 2.4.8 | Location | Met | Breadcrumb navigation present on all non-root pages; `aria-current="page"` on the current breadcrumb item and nav link. |
| 2.4.9 | Link Purpose (Link Only) | Met | All links are self-describing without surrounding context. Card links prefix the accessible name with `"View <type>: "` via `.sr-only`. |
| 2.4.10 | Section Headings | Met | Every major content section has a heading. `<h2>` used for page sections, `<h3>` for sub-sections within forms. |
| 2.4.11 | Focus Not Obscured (Minimum) | Met | No sticky header. `<header>` is in normal flow; focus indicator is never hidden behind it. |
| 2.4.12 | Focus Not Obscured (Enhanced) | Met | No element obscures the focus indicator even partially. |
| 2.4.13 | Focus Appearance | Met | Focus indicator: 3 px solid outline, 2 px offset, ≥ `--color-focus` (9.6:1 on bg). Outline area ≥ perimeter of component. |
| 2.5.5 | Target Size (Enhanced) | Met | All interactive elements `min-height: 44px; min-width: 44px` in CSS. Inline `×` tag-removal buttons are explicitly sized to 44 px minimum. |
| 2.5.6 | Concurrent Input Mechanisms | Met | No input modality restrictions. Touch, mouse, keyboard, and switch all work. |
| 3.1.3 | Unusual Words | N/A | No jargon or unusual words used in the UI. White-label terminology is plain English by default; org can set their own. |
| 3.1.4 | Abbreviations | Met | No unexpanded abbreviations in the UI. OID/AAD are only in developer-facing documentation, not in user-facing copy. |
| 3.1.5 | Reading Level | Met | See content style guide below. |
| 3.1.6 | Pronunciation | N/A | No ambiguous pronunciation in UI text. |
| 3.2.5 | Change on Request | Met | No context changes occur without explicit user action. Navigation, form submission, and sign-in redirect are all user-initiated. |
| 3.3.5 | Help | Met | Form hints (`<span class="form-hint">`) explain each field. Error messages provide specific correction guidance. The admin panel explains the admin list security model. |
| 3.3.6 | Error Prevention (All) | Met | Terminal status transitions (finding-shared, output-shared, close challenge) use an inline `role="alertdialog"` confirm widget showing the consequences before executing. Forms are reversible: items can be re-edited after saving. |
| 3.3.9 | Accessible Authentication (Enhanced) | Met | Sign-in page presents a single link — no CAPTCHA, no word recognition, no image selection on our pages. Entra MFA uses authenticator apps (not CAPTCHAs). |

---

## Content style guide (3.1.5)

All copy in the default UI and error messages follows these rules:

- **Sentences**: maximum 25 words.
- **Paragraphs**: maximum 5 sentences.
- **No idioms or figures of speech**: use literal language.
- **Abbreviations**: expand on first use, or avoid entirely in user-facing strings.
- **Active voice**: "Enter your title" not "The title field must be completed".
- **Plain verbs**: "Save", "Edit", "Sign in" — not "Submit", "Modify", "Authenticate".
- **Error messages**: state the problem and what to do: "Enter a finding of at least 10 characters".

Admin-entered content (org name, intro text, item descriptions) is outside the conformance scope of the software, but the admin panel copy itself follows these rules.

---

## Manual test checklist

Run these checks before each release. Record pass/fail in a dated column.

### Keyboard walkthrough (every page)

- [ ] Skip link appears on first Tab press and moves focus to `#main`
- [ ] All interactive elements reachable by Tab in logical order
- [ ] Focus indicator visible on every focused element
- [ ] No keyboard traps (Escape closes confirm dialogs)
- [ ] Enter/Space activates buttons and links correctly
- [ ] Board auto-refresh toggle works by keyboard

### Screen reader smoke test (NVDA + Firefox or VoiceOver + Safari)

- [ ] Page `<title>` announced on load
- [ ] Skip link announced correctly
- [ ] Nav `aria-current="page"` announced
- [ ] Form labels read before inputs
- [ ] Error summary announced on form submit failure; focus moves to it
- [ ] `aria-live` board updates announced after refresh
- [ ] Confirm dialog (`role="alertdialog"`) announced immediately
- [ ] Status chip text (not just colour) announced

### Zoom and reflow

- [ ] Browser at 400% zoom (or 320 px viewport width): no horizontal scrollbar on any page
- [ ] Text resized to 200% in browser settings: no content cut off

### Colour and contrast

- [ ] Admin palette editor: save blocked when any pair fails
- [ ] Light theme: all text readable (visually verify against `#FFFFFF` bg)
- [ ] Dark theme: toggle and verify dark palette
- [ ] High-contrast mode (`prefers-contrast: more`): run in OS high-contrast

### Forms

- [ ] New experiment: validation fires on submit, not on blur
- [ ] Error summary links move focus to the correct field
- [ ] Draft restored after simulated re-auth (clear session, reload page)
- [ ] Cancel returns to board without saving

### Authentication

- [ ] Unauthenticated `/api/quests` returns 401 and page redirects to signin
- [ ] Mock mode: each test account signs in and out correctly
- [ ] Admin-only pages redirect non-admins appropriately

---

## Automated testing setup

```bash
# Unit tests (no browser required)
cd api && node --test tests/auth.test.js tests/points.test.js tests/config.test.js

# Start local server for pa11y
npm install -g @azure/static-web-apps-cli
swa start Site --api-location api

# Run pa11y-ci (in a second terminal)
npx pa11y-ci --config .pa11yci.json
```
