# Architecture notes — known trade-offs

This file records deliberate engineering trade-offs in the v2 app: places where
we chose simplicity over scale or robustness *on purpose*. They are not bugs and
not scheduled work. Each has a trigger condition — revisit only when reality
crosses it. The point of writing them down is so a future reader (human or AI)
knows the ceiling was a choice, not an oversight.

The guiding principle, consistent with the rest of the codebase: the hard
thinking belongs in the gates and the methodology, not in infrastructure we
don't yet need. Storage is plain JSON blobs, there is no build step, and runtime
dependencies are the platform only. We keep it that way until a real workload
says otherwise.

From the v2 code review (2026-06-14).

---

## 1 — List endpoints fan out one blob read per item

`GET /api/quests`, `/api/members`, and `/api/outcomes` list every blob name
under a prefix, then `Promise.all` a download per item
(`api/function.js` — `questsList`, `membersList`, `outcomesList`). Read cost is
**O(n) storage round-trips** in the number of items.

This is fine — and pleasantly simple — at the dozens-to-low-hundreds of items an
activity board actually holds. There is no database to provision, no query layer
to maintain, and a fresh board is just a new blob prefix.

**Why we are not fixing it now:** adding pagination, an index blob, or a real
datastore would be real machinery serving a load that does not exist. It would
trade the codebase's best property (legibility) for headroom we may never use.

**Trigger to revisit:** a board routinely holding several hundred-plus items, or
a measurable, complained-about delay on the board / members / pipeline pages.
First cheap step would be a single rolled-up index blob (one read) refreshed on
write, before reaching for a database.

---

## 2 — Item writes are last-write-wins (no optimistic concurrency)

`POST /api/quests/{id}` reads the current blob, authorizes the change against it,
then uploads with `overwrite: true` (`api/function.js` — `questSave`). There is
no ETag / `If-Match` check, so two near-simultaneous writers to the same item can
clobber one another: last write wins.

For most edits this is invisible — a single owner editing their own item. The one
place it can bite is the **additive self-service path** in
`api/auth.js:authorizeItemWrite()`: e.g. two people joining the same session at
the same instant, where one join could overwrite the other and silently drop an
attendee.

**Why we are not fixing it now:** the collision window is small, the data lost is
low-stakes (a re-join fixes it), and Azure blob conditional writes plus a
client-side retry add real complexity to every write path for a rare event.

**Trigger to revisit:** reports of attendees / team members "disappearing" after
joining, or any future field where a lost concurrent write is genuinely costly.
The fix is bounded: capture the blob ETag on read, pass `ifMatch` on upload, and
on a 412 re-read → re-authorize → retry once.

---

## How to use this file

- Adding a deliberate trade-off? Record it here with its trigger, in the same
  shape: what we did, why it is fine now, what would change our mind.
- Acting on a trigger? Move the item into the relevant build plan as scheduled
  work and strike it from here, so this file only ever lists *live* trade-offs.
