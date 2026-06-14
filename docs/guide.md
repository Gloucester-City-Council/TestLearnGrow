# User guide — what this is and how to use it

A plain-language guide to the Activity Board for the people who use it day to day:
team members, activity owners, and admins. It explains what the board is *for*,
what each activity type means, how an experiment moves through its lifecycle, how
points work, and who is allowed to do what.

> **Terminology is configurable.** This guide uses the default labels —
> *Experiment*, *Session*, *Challenge*, *Member*, *points*. Your board may rename
> any of these (an admin sets them in the config). The behaviour is the same
> whatever they are called.

---

## What the board is for

The board runs a **Test–Learn–Grow** practice in the open. The idea, drawn from
the UK Cabinet Office Test-Learn-Grow programme and Lean Startup's
Build–Measure–Learn loop, is simple:

1. **Test** — make a clear prediction, try something small, measure the result.
2. **Learn** — share what you found, honestly, whether it worked or not.
3. **Grow** — take the findings that held up and deliberately scale them; park
   the ones that didn't.

The board's job is to make that loop visible and to hold a few useful gates in
place — for example, a test must state how you'll know it worked *before* it
starts, and a decision to scale must record the evidence behind it. Everything
else is kept light on purpose.

---

## The three activity types

Everything on the board is one of three kinds of activity.

| Type | What it is | Lifecycle in short |
|---|---|---|
| **Experiment** | A test of a change, with a hypothesis and a success measure. The heart of the board. | Designing → Running → Wrapping up → Finding shared → Growing → Scaled |
| **Session** | A scheduled event others can sign up to — a workshop, talk, or working session. | Scheduled → Held → Output shared |
| **Challenge** | An open prompt or problem inviting responses from others. | Open → (responses come in) → Closed |

You don't have to use all three. An admin can switch Sessions or Challenges off
for a board that only runs experiments.

---

## The experiment lifecycle in detail

An experiment is designed to make you think before you act and reflect after.

1. **Designing.** You write the test *before* running it: a **hypothesis**
   ("If we do X, we expect Y because Z"), a **predicted outcome**, and — required —
   a **success measure** (how you'll know it worked) plus a **baseline** (the
   starting value). You can't advance without a success measure; that gate is the
   point.
2. **Running.** The test is live.
3. **Wrapping up.** You record the **measured result** against your success
   measure, and a **verdict** — did the prediction hold? A validated verdict
   requires a measured result, so "it felt like it worked" isn't enough.
4. **Finding shared.** The learning is published for everyone. This is a
   milestone — the experiment's team earns points here (see below).
5. **Growing.** Someone decides what to do with a finding that worked: **scale**
   it, **adopt** it, **re-run** it, or **stop**. A scale/adopt decision records
   its **active ingredients** (what actually made it work), an owner, the
   **evidence strength**, and **scale readiness**. Only scale/adopt earn the grow
   reward — parking a dead end as "stop" is honest, not points-worthy.
6. **Scaled.** A later review records whether the finding actually *held* at
   scale — not just that someone intended to scale it.

Off-ramps exist too: an experiment can be **parked**, and learnings can **spawn**
a follow-on experiment (a learning loop) that links back to its parent.
Experiments can also be tied to a **mission/outcome** so their impact ladders up
to something the organisation cares about. The **Pipeline** page shows all
experiments grouped by stage so you can see where work is stuck.

---

## How to use it as a team member

- **Sign in.** Use the org sign-in (Entra ID). On a local/demo board you'll get a
  mock account picker instead.
- **Browse the board.** The home page shows your next steps, fresh learning, and
  the full board. Open any item to see detail.
- **Start something.** Create an experiment, session, or challenge from the
  "new" pages. For an experiment, you'll be asked for the hypothesis and success
  measure up front — that's deliberate.
- **Take part without owning.** You can do a few things on items you don't own:
  - **Sign up / leave** a session (add or remove yourself as an attendee).
  - **Join / leave** an experiment's team.
  - **Post an update** you authored to an item's timeline.
  - **Respond** to a challenge.
  These are *additive* — you can add or remove yourself and append your own
  contributions, but you can't edit other people's content or the item's core
  details.
- **Keep your profile current.** Your **Member card** lists your expertise,
  what you'll mentor on, and your stretch goals, drawn from a skills catalogue.
  It helps people find who can help. Edit your own card any time.
- **Watch the leaderboard.** If points are enabled, the leaderboard shows
  everyone's total and rank.

---

## How points work

Points (if enabled) reward finishing and sharing, not just starting. Defaults:

| Action | Points | Who earns |
|---|---|---|
| Experiment finding shared | 100 | the experiment team |
| Growing (scale/adopt decision) | 100 | the experiment team |
| Hosting a session (output shared) | 75 | the host |
| Attending a session (output shared) | 25 | each attendee |
| Posting a challenge | 25 | the poster |

Two things to know:

- **The server awards points, once.** You never edit the leaderboard directly;
  the API grants points when an item crosses a rewarding transition and stamps it
  so the same milestone can't pay out twice.
- **Values and ranks are configurable.** An admin can change any amount, rename
  "points," set rank thresholds (e.g. Member → Contributor → Regular → Leader), or
  turn points off entirely.

---

## Roles and permissions

There are no complicated roles — just a sensible trust model, enforced by the
server (the UI only hides buttons you can't use; the API is the real gate).

- **Anyone signed in** can create activities, take part additively (join/leave,
  post their own updates, respond to challenges), and edit their own Member card.
- **An item's owner** — the poster, a session's host, or a team member — can edit
  and delete that item fully. Identity and creation fields (who created it, when,
  what type) can never be changed, even by the owner.
- **Admins** can edit any item, manage the leaderboard for corrections, and use
  the **Admin** page to set branding, terminology, enabled features, points
  rules, and the colour theme. Admins are defined by a bootstrap list
  (`ADMIN_EMAILS`) plus an in-config list; the bootstrap admins can't be removed
  from the UI, so a board can't lock everyone out.

---

## For admins: configuring a board

The Admin page edits the live config. The notable guardrail: **theme colours are
validated to WCAG 2.2 AAA contrast on save** — the board will refuse a palette
whose text falls below 7:1 contrast, so you can't accidentally ship an
inaccessible theme. You can change:

- **Branding** — organisation name, tagline, intro text.
- **Terminology** — rename Experiments/Sessions/Challenges, "points," "Members,"
  "Board" to match your own language.
- **Features** — switch Sessions, Challenges, the leaderboard, or Members on/off.
- **Points** — amounts, rank thresholds, or disable points entirely.
- **Theme** — light and dark palettes, contrast-checked.
- **Skills catalogue** — the tools that populate Member cards.

For deployment, storage, and auth setup, see [`DEPLOYMENT.md`](../DEPLOYMENT.md).
For the accessibility commitments, see [`ACCESSIBILITY.md`](../ACCESSIBILITY.md).

---

## Where to go next

- **Developers / contributors:** [`README.md`](../README.md) and
  [`CLAUDE.md`](../CLAUDE.md) (code conventions and the AAA checklist).
- **The method behind the board:** [`docs/tlg-alignment-plan.md`](tlg-alignment-plan.md).
- **Deliberate engineering trade-offs:** [`docs/architecture-notes.md`](architecture-notes.md).
