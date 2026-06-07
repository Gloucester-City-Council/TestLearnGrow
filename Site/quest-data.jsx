/* =========================================================
   DATA LAYER — schemas, storage, mock Entra auth, seed data
   Storage: window.storage if present, else localStorage shim.
   ========================================================= */

/* ---------- tiny id ---------- */
function nano(n = 10) {
  const a = "useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";
  let s = "";
  for (let i = 0; i < n; i++) s += a[(Math.random() * a.length) | 0];
  return s;
}

/* ---------- blob storage: single JSON document via Azure Function API ---------- */
const blobStorage = (() => {
  function apiUrl() {
    return (typeof window !== "undefined" && window.SW_CONFIG && window.SW_CONFIG.API_URL)
      ? window.SW_CONFIG.API_URL
      : null;
  }

  async function load() {
    const url = apiUrl();
    if (url) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === "object" && !data.error) return data;
        }
      } catch (e) { /* fall through to localStorage */ }
    }
    // localStorage fallback — migrate from old per-key format if present
    try {
      const raw = localStorage.getItem("sw::blob-doc");
      if (raw) return JSON.parse(raw);
      // migrate old separate keys into the full-document shape
      const quests = JSON.parse(localStorage.getItem("sw::sw-quests") || "null");
      const leaderboard = JSON.parse(localStorage.getItem("sw::sw-leaderboard") || "null");
      const config = JSON.parse(localStorage.getItem("sw::sw-schema-config") || "null");
      const schema = JSON.parse(localStorage.getItem("sw::sw-schema-quest") || "null");
      if (quests || leaderboard) {
        const doc = { quests: quests || [], leaderboard: leaderboard || {}, config: config || null, schema: schema || null, announcements: [], members: [] };
        localStorage.setItem("sw::blob-doc", JSON.stringify(doc));
        return doc;
      }
    } catch (e) {}
    return {};
  }

  async function save(doc) {
    const url = apiUrl();
    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(doc),
        });
        if (res.ok) return;
      } catch (e) { /* fall through to localStorage */ }
    }
    try { localStorage.setItem("sw::blob-doc", JSON.stringify(doc)); } catch (e) {}
  }

  return { load, save };
})();

/* ---------- Store: key/value interface backed by the blob document ----------
   Mapping of legacy per-key names → blob document field names.
   sw-session is always per-device (localStorage only — never in the shared blob). */
const KEY_MAP = {
  "sw-quests":       "quests",
  "sw-leaderboard":  "leaderboard",
  "sw-schema-config":"config",
  "sw-schema-quest": "schema",
};

const Store = (() => {
  let _cache = null;
  let _loading = null;

  async function _ensureLoaded() {
    if (_cache !== null) return;
    if (_loading) { await _loading; return; }
    let resolve;
    _loading = new Promise(r => { resolve = r; });
    blobStorage.load().then(doc => { _cache = doc; _loading = null; resolve(); });
    await _loading;
  }

  return {
    async get(key) {
      if (key === "sw-session") {
        try { const raw = localStorage.getItem("sw::sw-session"); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
      }
      await _ensureLoaded();
      const docKey = KEY_MAP[key] || key;
      return (_cache[docKey] !== undefined) ? _cache[docKey] : null;
    },
    async set(key, value) {
      if (key === "sw-session") {
        try { localStorage.setItem("sw::sw-session", JSON.stringify(value)); } catch (e) {}
        return;
      }
      await _ensureLoaded();
      const docKey = KEY_MAP[key] || key;
      _cache[docKey] = value;
      await blobStorage.save(_cache);
    },
  };
})();

/* ---------- default schemas (from build plan) ---------- */
const DEFAULT_QUEST_SCHEMA = {
  version: "1.0",
  fields: {
    title: { type: "string", required: true, maxLength: 80, label: "Quest Title" },
    description: { type: "string", required: true, maxLength: 1000, label: "Quest Description", ui: "textarea" },
    xp_reward: {
      type: "enum", required: true, label: "XP Reward",
      options: [
        { value: 50, label: "50 XP — Minor Errand" },
        { value: 100, label: "100 XP — Side Quest" },
        { value: 250, label: "250 XP — Major Quest" },
        { value: 500, label: "500 XP — EPIC QUEST" },
      ],
    },
  },
  update_fields: {
    text: { type: "string", required: true, maxLength: 500, label: "Quest Update", ui: "textarea" },
  },
};

const DEFAULT_CONFIG = {
  version: "1.0",
  network_name: "South West Test & Learn Network",
  season_label: "Season 3 — The Reorganisation Arc",
  flavour_text: "Adventurers of the South West, your quests await.",
  auth: {
    client_id: "YOUR_ENTRA_CLIENT_ID",
    tenant_id: "YOUR_ENTRA_TENANT_ID",
    redirect_uri: "https://your-hosted-url",
  },
  xp_ranks: [
    { min: 0, label: "Apprentice" },
    { min: 100, label: "Journeyman" },
    { min: 500, label: "Guild Master" },
    { min: 1500, label: "Legend" },
  ],
  features: { leaderboard: true, quest_updates: true, xp_on_update: false, claimable: true },
};

/* ---------- avatar portraits (pixel-art guild crests) ----------
   Keyed by oid so quest owners / leaderboard / chip all resolve the
   same portrait. AVATARS[oid] -> image path, else null (initials). */
const AVATARS = {
  "oid-eleanor-9f2a": "avatars/eleanor.png",
  "oid-tomas-4b7c":   "avatars/tomas.png",
  "oid-priya-1d8e":   "avatars/priya.png",
  "oid-gideon-7c3b":  "avatars/gideon.png",
  "oid-marlow-2e9d":  "avatars/marlow.png",
  "oid-briar-5a1f":   "avatars/briar.png",
  "oid-hugh-8b4c":    "avatars/hugh.png",
};
function avatarFor(oid) { return (oid && AVATARS[oid]) || null; }

/* ---------- mock Entra accounts (the guild roster) ---------- */
/* In production these come from MSAL ID token claims. Here we simulate
   the account picker so quest ownership (oid) is still verifiable. */
const MOCK_ACCOUNTS = [
  { name: "Eleanor Pryce",   username: "e.pryce@swtln.gov.uk",   oid: "oid-eleanor-9f2a" },
  { name: "Tomas Aldridge",  username: "t.aldridge@swtln.gov.uk", oid: "oid-tomas-4b7c" },
  { name: "Priya Nayar",     username: "p.nayar@swtln.gov.uk",    oid: "oid-priya-1d8e" },
  { name: "Gideon Ashworth", username: "g.ashworth@swtln.gov.uk", oid: "oid-gideon-7c3b" },
  { name: "Marlow Finch",    username: "m.finch@swtln.gov.uk",    oid: "oid-marlow-2e9d" },
  { name: "Briar Stroud",    username: "b.stroud@swtln.gov.uk",   oid: "oid-briar-5a1f" },
  { name: "Hugh Pemberton",  username: "h.pemberton@swtln.gov.uk", oid: "oid-hugh-8b4c" },
];

function rankFor(xp, ranks) {
  let label = ranks[0] ? ranks[0].label : "Adventurer";
  for (const r of ranks) if (xp >= r.min) label = r.label;
  return label;
}
function nextRank(xp, ranks) {
  for (const r of ranks) if (xp < r.min) return r;
  return null;
}

/* ---------- seed quests (workplace RPG cheese) ----------
   owner_oid === null  => unclaimed bounty (awaiting a hero)
   owner_oid set       => claimed; only the owner may complete it
   posted_by_*         => who set the bounty (always recorded) */
function seedQuests() {
  const now = Date.now();
  const ago = (h) => new Date(now - h * 3600 * 1000).toISOString();
  const unclaimed = { owner_name: "", owner_oid: null, owner_email: "", claimed_at: null };
  return [
    {
      quest_id: nano(), title: "Slay the Spreadsheet of Doom",
      description: "A cursed workbook with forty-two linked tabs has been terrorising the quarterly report. Its VLOOKUPs reach into nothing. Cleanse it, document the formulae, and replace it with something a mortal can maintain.",
      posted_by_name: "Eleanor Pryce", posted_by_oid: "oid-eleanor-9f2a",
      owner_name: "Eleanor Pryce", owner_oid: "oid-eleanor-9f2a", owner_email: "e.pryce@swtln.gov.uk",
      status: "open", created_at: ago(52), claimed_at: ago(50), closed_at: null, xp_reward: 250,
      updates: [
        { id: nano(), author_name: "Eleanor Pryce", author_oid: "oid-eleanor-9f2a", text: "Mapped the dependency tree. It is worse than the prophecies foretold. 11 of the tabs feed nothing.", timestamp: ago(40) },
        { id: nano(), author_name: "Tomas Aldridge", author_oid: "oid-tomas-4b7c", text: "I have a Power Query pattern that could banish three of these tabs at once. Sending a scroll.", timestamp: ago(20) },
      ],
    },
    {
      quest_id: nano(), title: "Decipher the Ancient Procurement Scrolls",
      description: "The framework agreement runs to 180 pages of arcane runes. Somewhere within is the clause that tells us whether we can buy the thing. Read it. Translate it for the council. Emerge with your sanity, ideally. No hero has yet taken this up.",
      posted_by_name: "Priya Nayar", posted_by_oid: "oid-priya-1d8e",
      ...unclaimed,
      status: "open", created_at: ago(74), closed_at: null, xp_reward: 500,
      updates: [
        { id: nano(), author_name: "Priya Nayar", author_oid: "oid-priya-1d8e", text: "Posting this as a bounty — I simply have not the hours. 500 XP to whoever braves it.", timestamp: ago(73) },
      ],
    },
    {
      quest_id: nano(), title: "Recover the Lost Stakeholder",
      description: "A key stakeholder has not been seen since the last reorg. They hold the only sign-off on the discovery phase. Track them through the org chart, secure 30 minutes of their time, and return with a decision.",
      posted_by_name: "Tomas Aldridge", posted_by_oid: "oid-tomas-4b7c",
      owner_name: "Tomas Aldridge", owner_oid: "oid-tomas-4b7c", owner_email: "t.aldridge@swtln.gov.uk",
      status: "open", created_at: ago(30), claimed_at: ago(30), closed_at: null, xp_reward: 100,
      updates: [
        { id: nano(), author_name: "Tomas Aldridge", author_oid: "oid-tomas-4b7c", text: "Spotted them in a corridor near Procurement. They vanished into a meeting before I could speak.", timestamp: ago(12) },
      ],
    },
    {
      quest_id: nano(), title: "Forge the Test & Learn Playbook",
      description: "Our experiments keep being re-invented from scratch. Gather the patterns that work, the ones that don't, and the templates, into one playbook the whole network can wield. Awaiting a hero with a tidy mind.",
      posted_by_name: "Tomas Aldridge", posted_by_oid: "oid-tomas-4b7c",
      ...unclaimed,
      status: "open", created_at: ago(8), closed_at: null, xp_reward: 250,
      updates: [],
    },
    {
      quest_id: nano(), title: "Onboard the New Apprentice",
      description: "A fresh adventurer joins the guild on Monday. Prepare their kit: accounts, access, a friendly face, and the unwritten lore of where the good coffee is hidden.",
      posted_by_name: "Eleanor Pryce", posted_by_oid: "oid-eleanor-9f2a",
      owner_name: "Eleanor Pryce", owner_oid: "oid-eleanor-9f2a", owner_email: "e.pryce@swtln.gov.uk",
      status: "completed", created_at: ago(180), claimed_at: ago(178), closed_at: ago(96), xp_reward: 100,
      updates: [
        { id: nano(), author_name: "Eleanor Pryce", author_oid: "oid-eleanor-9f2a", text: "Laptop and accounts ready a full day early. A new record for this guild.", timestamp: ago(120) },
        { id: nano(), author_name: "Priya Nayar", author_oid: "oid-priya-1d8e", text: "I have agreed to be their mentor. The coffee map has been handed down.", timestamp: ago(100) },
      ],
    },
    {
      quest_id: nano(), title: "Tame the Wild Inbox",
      description: "The shared mailbox has grown sentient. 1,400 unread messages stir within. Triage the horde, set up rules to hold the line, and establish a rota so it never rises again.",
      posted_by_name: "Priya Nayar", posted_by_oid: "oid-priya-1d8e",
      owner_name: "Priya Nayar", owner_oid: "oid-priya-1d8e", owner_email: "p.nayar@swtln.gov.uk",
      status: "completed", created_at: ago(220), claimed_at: ago(219), closed_at: ago(150), xp_reward: 50,
      updates: [
        { id: nano(), author_name: "Priya Nayar", author_oid: "oid-priya-1d8e", text: "Down to zero unread. Rules deployed. The mailbox sleeps once more.", timestamp: ago(151) },
      ],
    },
    {
      quest_id: nano(), title: "Banish the Phantom Meeting",
      description: "A recurring invite haunts twelve calendars. No one knows who summoned it, what it is for, or why it cannot be cancelled. Investigate its origins, find the necromancer who created it, and lay it to rest.",
      posted_by_name: "Gideon Ashworth", posted_by_oid: "oid-gideon-7c3b",
      owner_name: "Gideon Ashworth", owner_oid: "oid-gideon-7c3b", owner_email: "g.ashworth@swtln.gov.uk",
      status: "open", created_at: ago(16), claimed_at: ago(15), closed_at: null, xp_reward: 100,
      updates: [
        { id: nano(), author_name: "Gideon Ashworth", author_oid: "oid-gideon-7c3b", text: "Traced the invite to an organiser who left the guild in 2019. The plot thickens.", timestamp: ago(6) },
      ],
    },
    {
      quest_id: nano(), title: "Repair the Broken Dashboard",
      description: "The reporting dashboard shows only error glyphs where numbers should be. The council grows restless. Diagnose the failing data pipe, mend it, and restore the flow of truth before the next board meeting.",
      posted_by_name: "Hugh Pemberton", posted_by_oid: "oid-hugh-8b4c",
      owner_name: "Hugh Pemberton", owner_oid: "oid-hugh-8b4c", owner_email: "h.pemberton@swtln.gov.uk",
      status: "completed", created_at: ago(140), claimed_at: ago(139), closed_at: ago(60), xp_reward: 250,
      updates: [
        { id: nano(), author_name: "Hugh Pemberton", author_oid: "oid-hugh-8b4c", text: "The data pipe flows once more. A rogue schema change was the culprit. Truth is restored.", timestamp: ago(61) },
      ],
    },
    {
      quest_id: nano(), title: "Chart the Uncharted User Journey",
      description: "Somewhere between the form and the confirmation page, our users vanish into the mist. Map every step of the journey, mark where adventurers are lost, and bring back a chart the whole guild can follow.",
      posted_by_name: "Eleanor Pryce", posted_by_oid: "oid-eleanor-9f2a",
      ...unclaimed,
      status: "open", created_at: ago(3), closed_at: null, xp_reward: 50,
      updates: [],
    },
  ];
}

function seedLeaderboard(quests) {
  /* derive from completed quests so the board and leaderboard agree */
  const lb = {};
  const ensure = (oid, name) => { if (!lb[oid]) lb[oid] = { oid, name, xp: 0 }; };
  ensure("oid-eleanor-9f2a", "Eleanor Pryce");
  ensure("oid-tomas-4b7c", "Tomas Aldridge");
  ensure("oid-priya-1d8e", "Priya Nayar");
  ensure("oid-gideon-7c3b", "Gideon Ashworth");
  ensure("oid-marlow-2e9d", "Marlow Finch");
  ensure("oid-briar-5a1f", "Briar Stroud");
  ensure("oid-hugh-8b4c", "Hugh Pemberton");
  for (const q of quests) {
    if (q.status === "completed" && q.owner_oid) { ensure(q.owner_oid, q.owner_name); lb[q.owner_oid].xp += q.xp_reward; }
  }
  /* a little extra history so the board feels lived-in */
  lb["oid-eleanor-9f2a"].xp += 400;
  lb["oid-tomas-4b7c"].xp += 150;
  lb["oid-priya-1d8e"].xp += 600;
  lb["oid-gideon-7c3b"].xp += 1250;
  lb["oid-hugh-8b4c"].xp += 850;
  lb["oid-briar-5a1f"].xp += 300;
  lb["oid-marlow-2e9d"].xp += 50;
  return lb;
}

/* ---------- relative time ---------- */
function timeAgo(iso) {
  const then = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "moments ago";
  const m = Math.floor(s / 60); if (m < 60) return m + (m === 1 ? " minute ago" : " minutes ago");
  const h = Math.floor(m / 60); if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
  const d = Math.floor(h / 24); if (d < 30) return d + (d === 1 ? " day ago" : " days ago");
  const mo = Math.floor(d / 30); return mo + (mo === 1 ? " month ago" : " months ago");
}
function fullDate(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
  catch (e) { return iso; }
}

Object.assign(window, {
  nano, blobStorage, Store, DEFAULT_QUEST_SCHEMA, DEFAULT_CONFIG, MOCK_ACCOUNTS, AVATARS, avatarFor,
  rankFor, nextRank, seedQuests, seedLeaderboard, timeAgo, fullDate,
});
