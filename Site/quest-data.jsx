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

/* ---------- blob storage: per-item blobs + leaderboard via Azure Function API ---------- */
const blobStorage = (() => {
  function base() {
    return (typeof window !== "undefined" && window.SW_CONFIG && window.SW_CONFIG.API_URL)
      ? window.SW_CONFIG.API_URL
      : null;
  }

  async function loadAll() {
    const b = base();
    if (b) {
      try {
        const res = await fetch(b + "/quests", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) return data;
          if (data.items) return data.items;
          return data;
        }
      } catch (e) { /* fall through */ }
    }
    // localStorage fallback — also migrates old formats
    try {
      const raw = localStorage.getItem("sw::items");
      if (raw) return JSON.parse(raw);
      // migrate from old sw::quests key
      const oldQuests = localStorage.getItem("sw::quests");
      if (oldQuests) {
        const arr = JSON.parse(oldQuests);
        return arr.map(migrateItem);
      }
      const oldDoc = localStorage.getItem("sw::blob-doc");
      if (oldDoc) {
        const d = JSON.parse(oldDoc);
        if (d.quests) return d.quests.map(migrateItem);
      }
    } catch (e) {}
    return null;
  }

  async function saveItem(item) {
    const b = base();
    const id = item.item_id;
    if (b) {
      try {
        const res = await fetch(`${b}/quests/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (res.ok) return;
      } catch (e) { /* fall through */ }
    }
    try {
      const raw = localStorage.getItem("sw::items");
      const arr = raw ? JSON.parse(raw) : [];
      const idx = arr.findIndex((q) => q.item_id === id);
      if (idx >= 0) arr[idx] = item; else arr.unshift(item);
      localStorage.setItem("sw::items", JSON.stringify(arr));
    } catch (e) {}
  }

  async function loadLeaderboard() {
    const b = base();
    if (b) {
      try {
        const res = await fetch(b + "/leaderboard", { cache: "no-store" });
        if (res.ok) return await res.json();
      } catch (e) { /* fall through */ }
    }
    try {
      const raw = localStorage.getItem("sw::leaderboard");
      if (raw) return JSON.parse(raw);
      const oldDoc = localStorage.getItem("sw::blob-doc");
      if (oldDoc) { const d = JSON.parse(oldDoc); if (d.leaderboard) return d.leaderboard; }
      const legacy = localStorage.getItem("sw::sw-leaderboard");
      if (legacy) return JSON.parse(legacy);
    } catch (e) {}
    return null;
  }

  async function saveLeaderboard(lb) {
    const b = base();
    if (b) {
      try {
        const res = await fetch(b + "/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lb),
        });
        if (res.ok) return;
      } catch (e) { /* fall through */ }
    }
    try { localStorage.setItem("sw::leaderboard", JSON.stringify(lb)); } catch (e) {}
  }

  async function loadMembers() {
    const b = base();
    if (b) {
      try {
        const res = await fetch(b + "/members", { cache: "no-store" });
        if (res.ok) return await res.json();
      } catch (e) { /* fall through */ }
    }
    try {
      const raw = localStorage.getItem("sw::members");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  async function saveMember(member) {
    const b = base();
    if (b) {
      try {
        const res = await fetch(`${b}/members/${member.oid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(member),
        });
        if (res.ok) return;
      } catch (e) { /* fall through */ }
    }
    try {
      const raw = localStorage.getItem("sw::members");
      const arr = raw ? JSON.parse(raw) : [];
      const idx = arr.findIndex((m) => m.oid === member.oid);
      if (idx >= 0) arr[idx] = member; else arr.push(member);
      localStorage.setItem("sw::members", JSON.stringify(arr));
    } catch (e) {}
  }

  return { loadAll, saveItem, loadLeaderboard, saveLeaderboard, loadMembers, saveMember };
})();

/* ---------- migrate a legacy quest record to item schema ---------- */
function migrateItem(q) {
  if (q.item_type) {
    // backfill new fields added after initial launch
    return {
      difficulty: null,
      effort:     null,
      reward:     null,
      deadline:   null,
      ...q,
    };
  }
  return {
    item_id: q.quest_id || q.item_id || nano(),
    item_type: "experiment",
    title: q.title || "",
    question: q.description || "",
    description: "",
    method_tags: [],
    difficulty: null,
    effort: null,
    reward: null,
    deadline: null,
    status: q.status === "completed" ? "finding-shared" : "proposed",
    posted_by_name: q.posted_by_name || "",
    posted_by_oid: q.posted_by_oid || null,
    team_oids: q.owner_oid ? [q.owner_oid] : [],
    team_names: q.owner_name ? [q.owner_name] : [],
    finding: "",
    outcome: "",
    challenge_id: null,
    xp_reward: q.xp_reward || 100,
    created_at: q.created_at || new Date().toISOString(),
    updated_at: q.created_at || new Date().toISOString(),
    closed_at: q.closed_at || null,
    updates: q.updates || [],
  };
}

/* ---------- Store ---------- */
const Store = {
  async loadAll() {
    const [items, leaderboard] = await Promise.all([
      blobStorage.loadAll(),
      blobStorage.loadLeaderboard(),
    ]);
    return { items, leaderboard };
  },
  saveItem:        (item)   => blobStorage.saveItem(item),
  saveLeaderboard: (lb)     => blobStorage.saveLeaderboard(lb),
  loadMembers:     ()       => blobStorage.loadMembers(),
  saveMember:      (member) => blobStorage.saveMember(member),
  async get(key) {
    if (key === "sw-session") {
      try { const raw = localStorage.getItem("sw::sw-session"); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    }
    return null;
  },
  async set(key, value) {
    if (key === "sw-session") {
      try { localStorage.setItem("sw::sw-session", JSON.stringify(value)); } catch (e) {}
    }
  },
};

/* ---------- default config ---------- */
const DEFAULT_CONFIG = {
  version: "2.0",
  network_name: "South West Test & Learn Network",
  season_label: "Season 3 — The Reorganisation Arc",
  flavour_text: "Test boldly. Learn together. Share what you find.",
  auth: {
    client_id: "YOUR_ENTRA_CLIENT_ID",
    tenant_id: "YOUR_ENTRA_TENANT_ID",
    redirect_uri: "https://your-hosted-url",
  },
  xp_ranks: [
    { min: 0,    label: "Apprentice" },
    { min: 100,  label: "Journeyman" },
    { min: 500,  label: "Guild Master" },
    { min: 1500, label: "Legend" },
  ],
  features: { leaderboard: true },
};

/* ---------- skills & tools matrix ---------- */
const SKILLS = [
  { category: "Strategy & Direction", tools: [
    "Vision, storytelling, narrative, case for change",
    "Design principles",
    "Blueprints, target operating models, future state mapping",
  ]},
  { category: "Insight & Diagnosis", tools: [
    "Root cause analysis",
    "Fishbone / cause and effect analysis",
    "5 whys",
    "Process mapping",
    "Journey mapping",
    "Demand reduction",
    "Value mapping",
    "Data & analysis",
    "Dashboards",
    "KPIs & measures",
    "Integration",
  ]},
  { category: "Design & Innovation", tools: [
    "User stories",
    "Architecture (service, data, technology)",
    "Pilots",
    "Prototypes",
    "Hackathons",
    "AI",
    "Power Apps",
    "Digital development",
  ]},
  { category: "Delivery & Execution", tools: [
    "Cadence",
    "Kanban",
    "Scrums",
    "Sprints",
    "Stand ups",
    "Reviews",
    "Retros",
    "Project, programme and change management",
    "Risk identification, analysis and management",
    "Benefits realisation",
  ]},
  { category: "People & Culture", tools: [
    "Peer challenge",
    "Coaching and mentoring",
    "Behavioural frameworks",
    "Psychological safety practices",
  ]},
];

/* ---------- avatars ---------- */
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

/* ---------- mock Entra accounts ---------- */
const MOCK_ACCOUNTS = [
  { name: "Eleanor Pryce",   username: "e.pryce@swtln.gov.uk",    oid: "oid-eleanor-9f2a" },
  { name: "Tomas Aldridge",  username: "t.aldridge@swtln.gov.uk", oid: "oid-tomas-4b7c" },
  { name: "Priya Nayar",     username: "p.nayar@swtln.gov.uk",    oid: "oid-priya-1d8e" },
  { name: "Gideon Ashworth", username: "g.ashworth@swtln.gov.uk", oid: "oid-gideon-7c3b" },
  { name: "Marlow Finch",    username: "m.finch@swtln.gov.uk",    oid: "oid-marlow-2e9d" },
  { name: "Briar Stroud",    username: "b.stroud@swtln.gov.uk",   oid: "oid-briar-5a1f" },
  { name: "Hugh Pemberton",  username: "h.pemberton@swtln.gov.uk",oid: "oid-hugh-8b4c" },
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

/* ---------- seed items ---------- */
function seedItems() {
  const now = Date.now();
  const ago = (h) => new Date(now - h * 3600 * 1000).toISOString();

  const challenge1Id = nano();
  const challenge2Id = nano();

  const items = [
    /* ===== CHALLENGE 1 ===== */
    {
      item_id: challenge1Id,
      item_type: "challenge",
      title: "Making data visible to frontline teams",
      question: "How might we get performance data into the hands of the people who can act on it, in a form they actually use — without adding another dashboard nobody looks at?",
      posted_by_name: "Eleanor Pryce", posted_by_oid: "oid-eleanor-9f2a",
      response_ids: [],
      status: "open",
      created_at: ago(120),
    },

    /* ===== CHALLENGE 2 ===== */
    {
      item_id: challenge2Id,
      item_type: "challenge",
      title: "Reducing avoidable contact in adult social care",
      question: "We know roughly 30% of contacts to our duty team could be prevented if people had better information earlier. What approaches are others testing? What's working?",
      posted_by_name: "Gideon Ashworth", posted_by_oid: "oid-gideon-7c3b",
      response_ids: [],
      status: "open",
      created_at: ago(200),
    },

    /* ===== EXPERIMENT 1 — finding-shared ===== */
    {
      item_id: nano(),
      item_type: "experiment",
      title: "Weekly data digest for neighbourhood teams",
      question: "Will a one-page weekly summary, designed with the team, increase the number of staff who can recall at least one key metric?",
      description: "Co-designed a digest format with four neighbourhood staff over two workshops, then ran it for six weeks. Measure: before/after quiz on three key indicators.",
      method_tags: ["Dashboards", "Journey mapping", "KPIs & measures"],
      difficulty: 2,
      effort: "half day",
      reward: "Showcase at Season 3 retro + 100 XP",
      deadline: null,
      status: "finding-shared",
      posted_by_name: "Eleanor Pryce", posted_by_oid: "oid-eleanor-9f2a",
      team_oids: ["oid-eleanor-9f2a", "oid-hugh-8b4c"],
      team_names: ["Eleanor Pryce", "Hugh Pemberton"],
      finding: "Recall improved from 14% to 71% over six weeks. Staff said the format (one side of A4, three numbers, one story) was the key factor. The dashboard still exists but now has a human layer in front of it.",
      outcome: "worked",
      challenge_id: challenge1Id,
      xp_reward: 100,
      created_at: ago(500),
      updated_at: ago(80),
      closed_at: ago(80),
      updates: [
        { id: nano(), author_name: "Eleanor Pryce", author_oid: "oid-eleanor-9f2a", text: "Week 3 check-in: early signs are positive. Team said 'I actually read it on the bus' — that's new.", timestamp: ago(200) },
        { id: nano(), author_name: "Hugh Pemberton", author_oid: "oid-hugh-8b4c", text: "Data pipeline built to auto-generate the digest each Monday. Adds about 4 minutes of effort per week.", timestamp: ago(150) },
      ],
    },

    /* ===== EXPERIMENT 2 — running ===== */
    {
      item_id: nano(),
      item_type: "experiment",
      title: "AI triage assistant for duty calls",
      question: "Can an AI-assisted summary reduce the average time a duty worker spends logging a new contact by at least 40%?",
      description: "Testing a lightly prompted LLM that listens to a call recording and drafts a structured summary for the worker to review and edit. Workers spend about 8 minutes per contact on logging currently.",
      method_tags: ["AI", "Process mapping", "KPIs & measures"],
      difficulty: 4,
      effort: "1-2 days",
      reward: "100 XP + learning shared at next show & tell",
      deadline: new Date(now + 30 * 24 * 3600 * 1000).toISOString(),
      status: "running",
      posted_by_name: "Tomas Aldridge", posted_by_oid: "oid-tomas-4b7c",
      team_oids: ["oid-tomas-4b7c", "oid-priya-1d8e", "oid-marlow-2e9d"],
      team_names: ["Tomas Aldridge", "Priya Nayar", "Marlow Finch"],
      finding: "",
      outcome: "",
      challenge_id: challenge2Id,
      xp_reward: 100,
      created_at: ago(300),
      updated_at: ago(24),
      closed_at: null,
      updates: [
        { id: nano(), author_name: "Tomas Aldridge", author_oid: "oid-tomas-4b7c", text: "Pilot started with 3 workers in the Cheltenham duty team. They're using it live from today.", timestamp: ago(72) },
        { id: nano(), author_name: "Priya Nayar", author_oid: "oid-priya-1d8e", text: "First week: average logging time down to 5.1 minutes. Workers editing less than 20% of the draft. Promising.", timestamp: ago(24) },
      ],
    },

    /* ===== EXPERIMENT 3 — designing ===== */
    {
      item_id: nano(),
      item_type: "experiment",
      title: "Peer shadowing to spot process blockers",
      question: "Does a structured half-day peer shadow (cross-team, cross-tier) surface more improvement ideas than a standard process review workshop?",
      description: "Pairs of workers from different teams shadow each other for half a day, then log blockers using a simple observation card.",
      method_tags: ["Process mapping", "Peer challenge", "Root cause analysis"],
      difficulty: 2,
      effort: "half day",
      reward: "Credited in the process improvement report + 100 XP",
      deadline: null,
      status: "designing",
      posted_by_name: "Briar Stroud", posted_by_oid: "oid-briar-5a1f",
      team_oids: ["oid-briar-5a1f"],
      team_names: ["Briar Stroud"],
      finding: "",
      outcome: "",
      challenge_id: null,
      xp_reward: 100,
      created_at: ago(48),
      updated_at: ago(12),
      closed_at: null,
      updates: [],
    },

    /* ===== EXPERIMENT 4 — proposed ===== */
    {
      item_id: nano(),
      item_type: "experiment",
      title: "Plain-English letters reducing repeat enquiries",
      question: "If we rewrite our top-5 most-complained-about letters in plain English, will we see a measurable drop in follow-up contacts within 30 days?",
      description: "Working with a content designer to rewrite five high-volume letters. Measure: 30-day callback rate, compared to a historical baseline.",
      method_tags: ["Demand reduction", "User stories", "KPIs & measures"],
      difficulty: 3,
      effort: "1-2 days",
      reward: "100 XP + content design skills development",
      deadline: new Date(now + 60 * 24 * 3600 * 1000).toISOString(),
      status: "proposed",
      posted_by_name: "Marlow Finch", posted_by_oid: "oid-marlow-2e9d",
      team_oids: [],
      team_names: [],
      finding: "",
      outcome: "",
      challenge_id: challenge2Id,
      xp_reward: 100,
      created_at: ago(6),
      updated_at: ago(6),
      closed_at: null,
      updates: [],
    },

    /* ===== SESSION 1 — scheduled ===== */
    {
      item_id: nano(),
      item_type: "session",
      title: "Show & Tell: What we learned from the AI triage pilot",
      topic: "Early results from the duty logging experiment — what worked, what surprised us, what we'd do differently",
      host_name: "Tomas Aldridge", host_oid: "oid-tomas-4b7c",
      session_date: new Date(now + 7 * 24 * 3600 * 1000).toISOString(),
      format: "remote",
      effort: "1-2 hrs",
      reward: "75 XP for host, 25 XP each attendee",
      deadline: new Date(now + 5 * 24 * 3600 * 1000).toISOString(),
      attendee_oids: ["oid-eleanor-9f2a", "oid-gideon-7c3b", "oid-briar-5a1f"],
      attendee_names: ["Eleanor Pryce", "Gideon Ashworth", "Briar Stroud"],
      output: "",
      status: "scheduled",
      challenge_id: challenge2Id,
      xp_reward: 75,
      created_at: ago(96),
      updated_at: ago(48),
      updates: [],
    },

    /* ===== SESSION 2 — output-shared ===== */
    {
      item_id: nano(),
      item_type: "session",
      title: "Retro: what did Season 2 teach us about running experiments?",
      topic: "A look back at Season 2 — patterns, surprises, what the network should do differently in Season 3",
      host_name: "Eleanor Pryce", host_oid: "oid-eleanor-9f2a",
      session_date: ago(360),
      format: "in-person",
      effort: "half day",
      reward: "XP + shared notes circulated afterwards",
      deadline: null,
      attendee_oids: ["oid-tomas-4b7c", "oid-priya-1d8e", "oid-gideon-7c3b", "oid-marlow-2e9d", "oid-hugh-8b4c"],
      attendee_names: ["Tomas Aldridge", "Priya Nayar", "Gideon Ashworth", "Marlow Finch", "Hugh Pemberton"],
      output: "Three patterns stood out: (1) experiments with a named question before they start close faster and produce cleaner findings; (2) teams of 2-3 outperform solo experimenters; (3) the hardest part is sharing a finding that didn't work — we need to celebrate those more.",
      status: "output-shared",
      challenge_id: null,
      xp_reward: 75,
      created_at: ago(400),
      updated_at: ago(350),
      updates: [],
    },
  ];

  // wire challenge response_ids
  const challengeMap = {};
  items.forEach((item) => {
    if (item.item_type === "challenge") challengeMap[item.item_id] = item;
  });
  items.forEach((item) => {
    if (item.challenge_id && challengeMap[item.challenge_id]) {
      challengeMap[item.challenge_id].response_ids.push(item.item_id);
    }
  });

  return items;
}

function seedLeaderboard(items) {
  const lb = {};
  const ensure = (oid, name) => { if (!lb[oid]) lb[oid] = { oid, name, xp: 0 }; };
  MOCK_ACCOUNTS.forEach((a) => ensure(a.oid, a.name));

  for (const item of items) {
    if (item.item_type === "experiment" && item.status === "finding-shared") {
      for (let i = 0; i < item.team_oids.length; i++) {
        ensure(item.team_oids[i], item.team_names[i]);
        lb[item.team_oids[i]].xp += item.xp_reward;
      }
    }
    if (item.item_type === "session" && item.status === "output-shared") {
      ensure(item.host_oid, item.host_name);
      lb[item.host_oid].xp += item.xp_reward;
      for (let i = 0; i < item.attendee_oids.length; i++) {
        ensure(item.attendee_oids[i], item.attendee_names[i]);
        lb[item.attendee_oids[i]].xp += 25;
      }
    }
    if (item.item_type === "challenge") {
      ensure(item.posted_by_oid, item.posted_by_name);
      lb[item.posted_by_oid].xp += 25;
    }
  }

  lb["oid-eleanor-9f2a"].xp += 400;
  lb["oid-tomas-4b7c"].xp   += 150;
  lb["oid-priya-1d8e"].xp   += 600;
  lb["oid-gideon-7c3b"].xp  += 1250;
  lb["oid-hugh-8b4c"].xp    += 850;
  lb["oid-briar-5a1f"].xp   += 300;
  lb["oid-marlow-2e9d"].xp  += 50;
  return lb;
}

/* ---------- seed member cards ---------- */
function seedMembers() {
  return MOCK_ACCOUNTS.map((a) => ({
    oid: a.oid, name: a.name, role_team: "", skills: {},
    what_to_know: "", how_i_work_best: "", how_to_get_best: "",
    preferred_contact: a.username, availability: "", updated_at: null,
  }));
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
  nano, blobStorage, Store, migrateItem, SKILLS, DEFAULT_CONFIG, MOCK_ACCOUNTS, AVATARS, avatarFor,
  rankFor, nextRank, seedItems, seedLeaderboard, seedMembers, timeAgo, fullDate,
});
