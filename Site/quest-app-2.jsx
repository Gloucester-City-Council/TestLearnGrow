/* =========================================================
   APP part 2 — quest detail, main App, mount
   ========================================================= */
const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM } = React;

/* ============ QUEST DETAIL (modal) ============ */
function QuestDetail({ quest, user, schema, config, onAddUpdate, onCloseQuest, onClaim, onRelease, onClose }) {
  const state = questState(quest);
  const done = state === "completed";
  const available = state === "available";
  const isOwner = user && quest.owner_oid === user.oid;
  const claimable = config.features.claimable;
  const [confirming, setConfirming] = uS(false);
  const [updText, setUpdText] = uS("");
  const [updErr, setUpdErr] = uS("");
  const updDef = schema.update_fields.text;
  const allowUpdates = config.features.quest_updates && !done && user;

  const submitUpdate = () => {
    const t = updText.trim();
    if (!t) { setUpdErr("An update cannot be empty."); return; }
    if (t.length > updDef.maxLength) { setUpdErr(`Must be ${updDef.maxLength} characters or fewer.`); return; }
    onAddUpdate(quest.quest_id, t);
    setUpdText(""); setUpdErr("");
  };

  const foot = done ? (
    <button className="btn stone block" onClick={onClose}>Close</button>
  ) : available && claimable ? (
    <button className="btn block" onClick={() => onClaim(quest)}>
      <Icon.Hand style={{ width: 18, height: 18 }} /> Claim This Quest
    </button>
  ) : isOwner ? (
    confirming ? (
      <>
        <button className="btn stone" onClick={() => setConfirming(false)}>Not yet</button>
        <button className="btn danger" onClick={() => onCloseQuest(quest)}>
          <Icon.Check style={{ width: 16, height: 16 }} /> Confirm — Award {quest.xp_reward} XP
        </button>
      </>
    ) : (
      <>
        {claimable && (
          <button className="btn stone" onClick={() => onRelease(quest)} title="Return this quest to the open pool">Release</button>
        )}
        <button className="btn" style={{ flex: 1 }} onClick={() => setConfirming(true)}>
          <Icon.Trophy style={{ width: 16, height: 16 }} /> Complete &amp; Claim {quest.xp_reward} XP
        </button>
      </>
    )
  ) : (
    <button className="btn stone block" onClick={onClose}>Close</button>
  );

  return (
    <Modal title={quest.title} onClose={onClose} labelId="detail-title"
      sub={<span style={{ display: "inline-flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <StatusBadge quest={quest} /><XpBadge amount={quest.xp_reward} />
      </span>}
      foot={foot}>

      <div className="card-meta" style={{ marginBottom: 16, paddingTop: 0 }}>
        {available ? (
          <span className="poster" style={{ fontSize: 14 }}>Posted by {quest.posted_by_name} · {timeAgo(quest.created_at)}</span>
        ) : (
          <span className="owner"><Avatar oid={quest.owner_oid} name={quest.owner_name} cls="mini-avatar" />{quest.owner_name}{quest.posted_by_oid && quest.posted_by_oid !== quest.owner_oid && <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>&nbsp;· posted by {quest.posted_by_name}</span>}</span>
        )}
        <span style={{ color: "var(--muted)", fontSize: 14 }}>
          {done ? `Completed ${fullDate(quest.closed_at)}` : available ? "Awaiting a hero" : `Claimed ${timeAgo(quest.claimed_at || quest.created_at)}`}
        </span>
      </div>

      <p className="detail-desc">{quest.description}</p>

      {available && claimable && (
        <div className="locked-field" style={{ marginTop: 16, borderColor: "var(--gold)", borderStyle: "solid", background: "var(--callout)" }}>
          <Icon.Flag style={{ color: "var(--amber)" }} />
          <span>This bounty is <strong style={{ color: "var(--amber)" }}>unclaimed</strong>. Claim it to take ownership — only the claimant can complete it and earn the <strong style={{ color: "var(--xp-hi)" }}>{quest.xp_reward} XP</strong>.</span>
        </div>
      )}

      {confirming && !done && (
        <div className="locked-field" style={{ marginTop: 16, borderColor: "var(--gold)", borderStyle: "solid", background: "var(--callout)" }}>
          <Icon.Trophy style={{ color: "var(--amber)" }} />
          <span>Sealing this quest awards <strong style={{ color: "var(--xp-hi)" }}>{quest.xp_reward} XP</strong> to your name on the leaderboard. This cannot be undone.</span>
        </div>
      )}

      {config.features.quest_updates && (
        <>
          <div className="detail-section-label">Quest Log {quest.updates.length > 0 && `· ${quest.updates.length}`}</div>
          {quest.updates.length === 0 ? (
            <p className="log-empty">No updates yet. Be the first to report from the field.</p>
          ) : (
            <ul className="log">
              {quest.updates.map((u) => (
                <li className="log-item" key={u.id}>
                  <div className="log-meta">
                    <span className="log-author">{u.author_name}</span>
                    <span className="log-time">{timeAgo(u.timestamp)}</span>
                  </div>
                  <p className="log-text">{u.text}</p>
                </li>
              ))}
            </ul>
          )}

          {allowUpdates && (
            <div style={{ marginTop: 18 }}>
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="upd">
                  Add an Update
                  <span className="hint">{updText.length}/{updDef.maxLength}</span>
                </label>
                <textarea id="upd" className="textarea" style={{ minHeight: 90 }} value={updText}
                  maxLength={updDef.maxLength}
                  placeholder="Report your progress, adventurer…"
                  onChange={(e) => { setUpdText(e.target.value); setUpdErr(""); }} />
                {updErr && <div className="field-error" role="alert">{updErr}</div>}
              </div>
              <button className="btn sm" onClick={submitUpdate}><Icon.Chat style={{ width: 15, height: 15 }} /> Post Update</button>
            </div>
          )}
          {done && <p className="log-empty" style={{ marginTop: 14 }}>This quest is sealed. The log is closed.</p>}
        </>
      )}
    </Modal>
  );
}

/* ============ GUILD MEMBERS SECTION ============ */
function MembersSection({ allMembers, board, config, user, onEdit }) {
  const [search, setSearch] = uS("");
  const [skillFilter, setSkillFilter] = uS("any"); // any | strength | mentor | stretch

  const SKILL_FILTERS = [
    { key: "any",      label: "All Members" },
    { key: "strength", label: "Strengths" },
    { key: "mentor",   label: "Can Mentor" },
    { key: "stretch",  label: "Stretch Goals" },
  ];

  const filtered = uM(() => {
    const q = search.trim().toLowerCase();
    return allMembers.filter((m) => {
      if (q) {
        const inName = m.name.toLowerCase().includes(q);
        const inRole = (m.role_team || "").toLowerCase().includes(q);
        const inSkills = Object.keys(m.skills || {}).some((tool) => tool.toLowerCase().includes(q));
        if (!inName && !inRole && !inSkills) return false;
      }
      if (skillFilter !== "any") {
        const typeMap = { strength: "strength", mentor: "mentor", stretch: "stretch" };
        const wanted = typeMap[skillFilter];
        const hasType = Object.values(m.skills || {}).some((v) => v === wanted);
        if (!hasType) return false;
      }
      return true;
    });
  }, [allMembers, search, skillFilter]);

  return (
    <>
      <p className="flavour">The Adventurers of the South West</p>
      <div className="divider"><span className="rule" /><Icon.Shield /><span className="rule r" /></div>

      <div className="member-controls">
        <div className="member-search-wrap">
          <Icon.Search className="member-search-icon" />
          <input
            className="input member-search"
            placeholder="Search by name, role or skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search members"
          />
          {search && (
            <button className="member-search-clear linklike" onClick={() => setSearch("")} aria-label="Clear search">✕</button>
          )}
        </div>
        <div className="tabs member-skill-tabs" role="tablist" aria-label="Filter by skill type">
          {SKILL_FILTERS.map(({ key, label }) => (
            <button key={key} role="tab" aria-selected={skillFilter === key}
              className={"tab member-skill-tab" + (skillFilter === key ? " skill-tab--" + key : "")}
              onClick={() => setSkillFilter(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <Icon.Shield />
          <h3>No members found</h3>
          <p>Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="trump-grid">
          {filtered.map((m) => (
            <MemberCard
              key={m.oid}
              member={m}
              xp={(board[m.oid] || {}).xp || 0}
              ranks={config.xp_ranks}
              isMe={m.oid === user.oid}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
      <div style={{ height: 40 }} />
    </>
  );
}

/* ============ MAIN APP ============ */
function App() {
  const [loading, setLoading] = uS(true);
  const [user, setUser] = uS(null);
  const [config, setConfig] = uS(null);
  const [schema, setSchema] = uS(null);
  const [quests, setQuests] = uS([]);
  const [board, setBoard] = uS({});
  const [filter, setFilter] = uS("ALL");
  const [openQuestId, setOpenQuestId] = uS(null);
  const [posting, setPosting] = uS(false);
  const [mobileView, setMobileView] = uS("board"); // board | leaderboard
  const [celebrate, setCelebrate] = uS(null);
  const [toast, setToast] = uS(null);
  const [activeSection, setActiveSection] = uS("board");
  const [members, setMembers] = uS([]);
  const [editingMember, setEditingMember] = uS(false);

  /* ---- mount: load all data; seed once if blob/localStorage is empty ---- */
  uE(() => {
    (async () => {
      let { quests: qs, leaderboard: lb } = await Store.loadAll();
      if (!qs || qs.length === 0) {
        qs = seedQuests();
        await Promise.all(qs.map((q) => Store.saveQuest(q)));
      }
      if (!lb || Object.keys(lb).length === 0) {
        lb = seedLeaderboard(qs);
        await Store.saveLeaderboard(lb);
      }
      const [mbrs, sess] = await Promise.all([Store.loadMembers(), Store.get("sw-session")]);
      setConfig(DEFAULT_CONFIG); setSchema(DEFAULT_QUEST_SCHEMA); setQuests(qs); setBoard(lb);
      setMembers(mbrs || []);
      if (sess) setUser(sess);
      setLoading(false);
    })();
  }, []);

  /* ---- poll every 30 s for updates from other users ---- */
  uE(() => {
    const id = setInterval(async () => {
      const [{ quests: qs, leaderboard: lb }, mbrs] = await Promise.all([
        Store.loadAll(),
        Store.loadMembers(),
      ]);
      if (qs) setQuests(qs);
      if (lb) setBoard(lb);
      if (mbrs) setMembers(mbrs);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const signIn = async (acct) => {
    await Store.set("sw-session", acct);
    setUser(acct);
    /* ensure they appear on the leaderboard roster */
    setBoard((b) => {
      if (b[acct.oid]) return b;
      const nb = { ...b, [acct.oid]: { oid: acct.oid, name: acct.name, xp: 0 } };
      Store.saveLeaderboard(nb);
      return nb;
    });
  };
  const signOut = async () => { await Store.set("sw-session", null); setUser(null); setOpenQuestId(null); setPosting(false); };

  const createQuest = (q) => {
    setQuests([q, ...quests]);
    Store.saveQuest(q);
    setPosting(false);
    showToast("Quest posted to the board!");
  };

  const addUpdate = (qid, text) => {
    const orig = quests.find((q) => q.quest_id === qid);
    const upd = { id: nano(), author_name: user.name, author_oid: user.oid, text, timestamp: new Date().toISOString() };
    const updated = { ...orig, updates: [...orig.updates, upd] };
    setQuests(quests.map((q) => q.quest_id === qid ? updated : q));
    Store.saveQuest(updated);
    if (config.features.xp_on_update) {
      // optional flag — off by default per config
    }
  };

  const claimQuest = (quest) => {
    if (!user) return;
    const claimed = { ...quest, owner_name: user.name, owner_oid: user.oid, owner_email: user.username, claimed_at: new Date().toISOString() };
    setQuests(quests.map((q) => q.quest_id === quest.quest_id ? claimed : q));
    Store.saveQuest(claimed);
    setBoard((b) => {
      if (b[user.oid]) return b;
      const nb = { ...b, [user.oid]: { oid: user.oid, name: user.name, xp: 0 } };
      Store.saveLeaderboard(nb);
      return nb;
    });
    showToast(`Quest claimed — "${quest.title}" is yours!`);
  };

  const releaseQuest = (quest) => {
    if (!user || quest.owner_oid !== user.oid) return;
    const released = { ...quest, owner_name: "", owner_oid: null, owner_email: "", claimed_at: null };
    setQuests(quests.map((q) => q.quest_id === quest.quest_id ? released : q));
    Store.saveQuest(released);
    showToast("Quest released back to the open pool.");
  };

  const closeQuest = (quest) => {
    if (!user || quest.owner_oid !== user.oid) return;
    const closed = { ...quest, status: "completed", closed_at: new Date().toISOString() };
    setQuests(quests.map((q) => q.quest_id === quest.quest_id ? closed : q));
    Store.saveQuest(closed);
    const nb = { ...board };
    if (!nb[quest.owner_oid]) nb[quest.owner_oid] = { oid: quest.owner_oid, name: quest.owner_name, xp: 0 };
    nb[quest.owner_oid] = { ...nb[quest.owner_oid], xp: nb[quest.owner_oid].xp + quest.xp_reward };
    setBoard(nb);
    Store.saveLeaderboard(nb);
    setOpenQuestId(null);
    setCelebrate({ xp: quest.xp_reward, title: quest.title });
  };

  const saveMember = (updated) => {
    setMembers((ms) => {
      const idx = ms.findIndex((m) => m.oid === updated.oid);
      return idx >= 0 ? ms.map((m) => m.oid === updated.oid ? updated : m) : [...ms, updated];
    });
    Store.saveMember(updated);
    setEditingMember(false);
    showToast("Guild card updated!");
  };

  /* ---- computed members list — synthesises blank cards for anyone not yet saved ---- */
  const allMembers = uM(() => {
    const byOid = {};
    (members || []).forEach((m) => { byOid[m.oid] = m; });
    const oids = new Set([
      ...MOCK_ACCOUNTS.map((a) => a.oid),
      ...Object.keys(board),
    ]);
    return Array.from(oids).map((oid) => byOid[oid] || {
      oid,
      name: MOCK_ACCOUNTS.find((a) => a.oid === oid)?.name || board[oid]?.name || "Adventurer",
      role_team: "", skills: {}, what_to_know: "", how_i_work_best: "", how_to_get_best: "",
      preferred_contact: MOCK_ACCOUNTS.find((a) => a.oid === oid)?.username || "",
      availability: "", updated_at: null,
    });
  }, [members, board]);

  if (loading) {
    return <div className="signin-stage"><div style={{ textAlign: "center", color: "var(--gold)", fontFamily: "var(--font-display)" }}>
      <div className="crest-lg" style={{ color: "var(--amber)" }}><Icon.Crest /></div>
      <p style={{ letterSpacing: ".2em", textTransform: "uppercase", fontSize: 14 }}>Loading the quest board…</p>
    </div></div>;
  }

  if (!user) return <SignIn config={config} onSignedIn={signIn} />;

  const counts = {
    ALL: quests.length,
    AVAILABLE: quests.filter((q) => questState(q) === "available").length,
    CLAIMED: quests.filter((q) => questState(q) === "claimed").length,
    COMPLETED: quests.filter((q) => questState(q) === "completed").length,
  };
  const FILTERS = ["ALL", "AVAILABLE", "CLAIMED", "COMPLETED"];
  const shown = quests.filter((q) =>
    filter === "ALL" ? true : questState(q) === filter.toLowerCase()
  );
  const openQuest = quests.find((q) => q.quest_id === openQuestId) || null;
  const myXp = board[user.oid] ? board[user.oid].xp : 0;
  const maxXp = Math.max(1, ...Object.values(board).map((r) => r.xp));

  const showLeaderboardMobile = config.features.leaderboard && mobileView === "leaderboard" && activeSection === "board";
  const myMember = allMembers.find((m) => m.oid === user.oid) || null;

  return (
    <div className="app-shell">
      {/* ---- banner ---- */}
      <header className="banner">
        <div className="banner-inner">
          <div className="crest"><Icon.Crest /></div>
          <div className="title-block">
            <h1 className="network-name">{config.network_name}</h1>
            <p className="season-label">{config.season_label}</p>
          </div>
          <div className="user-chip">
            <Avatar oid={user.oid} name={user.name} cls="avatar" />
            <span className="user-meta">
              <span className="user-name">{user.name}</span>
              <span className="user-rank">{rankFor(myXp, config.xp_ranks)} · {myXp.toLocaleString()} XP</span>
            </span>
            <button className="linklike" onClick={signOut}>Sign out</button>
          </div>
        </div>
        {/* ---- section nav ---- */}
        <nav className="section-nav" aria-label="Main sections">
          <button className={"sn-btn" + (activeSection === "board" ? " active" : "")}
            onClick={() => setActiveSection("board")}>
            <Icon.Board style={{ width: 16, height: 16 }} /> Quest Board
          </button>
          <button className={"sn-btn" + (activeSection === "members" ? " active" : "")}
            onClick={() => setActiveSection("members")}>
            <Icon.Shield style={{ width: 16, height: 16 }} /> Guild Members
          </button>
        </nav>
      </header>

      <main className="wrap" style={{ flex: 1 }}>

        {/* ======== QUEST BOARD SECTION ======== */}
        {activeSection === "board" && (
          showLeaderboardMobile ? (
            <section aria-label="Leaderboard">
              <p className="flavour">Hall of Adventurers</p>
              <div className="divider"><span className="rule" /><Icon.Trophy /><span className="rule r" /></div>
              <Leaderboard board={board} ranks={config.xp_ranks} meOid={user.oid} maxXp={maxXp} />
              <div style={{ height: 24 }} />
            </section>
          ) : (
            <>
              <p className="flavour">{config.flavour_text}</p>
              <div className="divider"><span className="rule" /><Icon.Gem /><span className="rule r" /></div>

              <div className="controls">
                <div className="tabs" role="tablist" aria-label="Filter quests">
                  {FILTERS.map((f) => (
                    <button key={f} role="tab" aria-selected={filter === f} className="tab"
                      onClick={() => setFilter(f)}>
                      {f}<span className="count">{counts[f]}</span>
                    </button>
                  ))}
                </div>
                <span className="spacer" />
                <button className="btn post-btn" onClick={() => setPosting(true)}>
                  <Icon.Plus style={{ width: 16, height: 16 }} /> Post New Quest
                </button>
              </div>

              <div className={"board-layout" + (config.features.leaderboard ? " with-side" : "")}>
                <div className="quest-grid">
                  {shown.length === 0 ? (
                    <div className="empty">
                      <Icon.Scroll />
                      <h3>No quests here yet</h3>
                      <p>{filter === "COMPLETED" ? "No quests have been sealed. The glory awaits."
                        : filter === "AVAILABLE" ? "No unclaimed bounties right now. Post one for the guild."
                        : filter === "CLAIMED" ? "Nothing is in progress. Claim a bounty to begin."
                        : "The board is quiet. Be the one to post the first quest."}</p>
                    </div>
                  ) : shown.map((q) => (
                    <QuestCard key={q.quest_id} quest={q} onOpen={(qq) => setOpenQuestId(qq.quest_id)} />
                  ))}
                </div>

                {config.features.leaderboard && (
                  <aside className="side-panel" aria-label="Leaderboard">
                    <h2><Icon.Trophy /> Leaderboard</h2>
                    <p className="sp-sub">Ranked by total XP earned</p>
                    <Leaderboard board={board} ranks={config.xp_ranks} meOid={user.oid} maxXp={maxXp} compact />
                  </aside>
                )}
              </div>
            </>
          )
        )}

        {/* ======== GUILD MEMBERS SECTION ======== */}
        {activeSection === "members" && (
          <MembersSection
            allMembers={allMembers}
            board={board}
            config={config}
            user={user}
            onEdit={() => setEditingMember(true)}
          />
        )}

      </main>

      {/* ---- footer ---- */}
      <footer className="footer">
        <span>{config.network_name}</span>
        <span className="dot">•</span>
        <span>Schema <code>v{schema.version}</code> · Config <code>v{config.version}</code></span>
        <span className="dot">•</span>
        <span>Quest Board</span>
      </footer>

      {/* ---- mobile bottom nav ---- */}
      <nav className="bottom-nav" aria-label="Sections">
        <button className="bn-btn" aria-current={activeSection === "board" && mobileView === "board"}
          onClick={() => { setActiveSection("board"); setMobileView("board"); }}>
          <Icon.Board /> Board
        </button>
        {config.features.leaderboard && (
          <button className="bn-btn" aria-current={activeSection === "board" && mobileView === "leaderboard"}
            onClick={() => { setActiveSection("board"); setMobileView("leaderboard"); }}>
            <Icon.Trophy /> Ranks
          </button>
        )}
        <button className="bn-btn" aria-current={activeSection === "members"}
          onClick={() => setActiveSection("members")}>
          <Icon.Shield /> Guild
        </button>
      </nav>

      {/* ---- modals + overlays ---- */}
      {openQuest && (
        <QuestDetail quest={openQuest} user={user} schema={schema} config={config}
          onAddUpdate={addUpdate} onCloseQuest={closeQuest} onClaim={claimQuest} onRelease={releaseQuest}
          onClose={() => setOpenQuestId(null)} />
      )}
      {posting && (
        <PostQuest schema={schema} user={user} claimable={config.features.claimable}
          onClose={() => setPosting(false)} onCreate={createQuest} />
      )}
      {editingMember && myMember && (
        <EditMemberCard member={myMember} onClose={() => setEditingMember(false)} onSave={saveMember} />
      )}
      {celebrate && (
        <QuestComplete xp={celebrate.xp} title={celebrate.title} onDone={() => setCelebrate(null)} />
      )}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
