/* =========================================================
   APP part 2 — detail modals, swim lane board, main App, mount
   ========================================================= */
const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM } = React;

/* ============ EXPERIMENT DETAIL (modal) ============ */
function ExperimentDetail({ item, user, allMembers, onAddUpdate, onAdvanceStatus, onShareFinding, onClose, onMemberClick }) {
  const [updText, setUpdText] = uS("");
  const [updErr, setUpdErr] = uS("");
  const [finding, setFinding] = uS(item.finding || "");
  const [outcome, setOutcome] = uS(item.outcome || "");
  const [confirmShare, setConfirmShare] = uS(false);

  const isTeam = user && item.team_oids && item.team_oids.includes(user.oid);
  const isPoster = user && item.posted_by_oid === user.oid;
  const canAdvance = isTeam || isPoster;
  const done = item.status === "finding-shared" || item.status === "parked";

  const STATUSES = ["proposed", "designing", "running", "wrapping-up", "finding-shared"];
  const curIdx = STATUSES.indexOf(item.status);

  const submitUpdate = () => {
    const t = updText.trim();
    if (!t) { setUpdErr("An update cannot be empty."); return; }
    if (t.length > 500) { setUpdErr("Must be 500 characters or fewer."); return; }
    onAddUpdate(item.item_id, t);
    setUpdText(""); setUpdErr("");
  };

  const advanceTo = (status) => {
    if (status === "finding-shared") {
      setConfirmShare(true);
    } else {
      onAdvanceStatus(item.item_id, status);
    }
  };

  const shareFinding = () => {
    if (!finding.trim()) return;
    onShareFinding(item.item_id, finding.trim(), outcome);
  };

  const OUTCOME_OPTS = [
    { value: "worked",        label: "It worked" },
    { value: "didnt",         label: "Didn't work" },
    { value: "inconclusive",  label: "Inconclusive" },
    { value: "too-early",     label: "Too early to say" },
  ];

  const nextStatus = curIdx >= 0 && curIdx < STATUSES.length - 2 ? STATUSES[curIdx + 1] : null;
  const NEXT_LABEL = {
    designing:      "Move to Designing",
    running:        "Move to Running",
    "wrapping-up":  "Start Wrapping Up",
    "finding-shared": "Share Finding",
  };

  const foot = done ? (
    <button className="btn stone block" onClick={onClose}>Close</button>
  ) : canAdvance ? (
    item.status === "wrapping-up" ? (
      confirmShare ? (
        <>
          <button className="btn stone" onClick={() => setConfirmShare(false)}>Back</button>
          <button className="btn" onClick={shareFinding} disabled={!finding.trim()}>
            <Icon.Check style={{ width: 16, height: 16 }} /> Confirm — Share Finding &amp; Award XP
          </button>
        </>
      ) : (
        <>
          <button className="btn stone" onClick={() => onAdvanceStatus(item.item_id, "parked")} title="Park this experiment — it stalled, not failed">
            Park
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={() => setConfirmShare(true)}>
            <Icon.Check style={{ width: 16, height: 16 }} /> Share Finding &amp; Award XP
          </button>
        </>
      )
    ) : nextStatus ? (
      <>
        {item.status !== "proposed" && (
          <button className="btn stone" onClick={() => onAdvanceStatus(item.item_id, "parked")} title="Park this experiment">
            Park
          </button>
        )}
        <button className="btn" style={{ flex: 1 }} onClick={() => advanceTo(nextStatus)}>
          <Icon.ArrowRight style={{ width: 16, height: 16 }} /> {NEXT_LABEL[nextStatus] || nextStatus}
        </button>
      </>
    ) : (
      <button className="btn stone block" onClick={onClose}>Close</button>
    )
  ) : (
    <button className="btn stone block" onClick={onClose}>Close</button>
  );

  return (
    <Modal title={item.title} onClose={onClose} labelId="exp-detail-title"
      sub={
        <span style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <StatusPill status={item.status} />
          <XpBadge amount={item.xp_reward} />
        </span>
      }
      foot={foot}>

      {/* meta */}
      <div className="card-meta" style={{ marginBottom: 14, paddingTop: 0 }}>
        <span style={{ fontSize: 14, color: "var(--parch-dim)" }}>
          Posted by{" "}
          <button className="name-link" onClick={() => onMemberClick && onMemberClick(item.posted_by_oid)}>{item.posted_by_name}</button>
          {" "}&middot; {timeAgo(item.created_at)}
        </span>
      </div>

      {/* question */}
      {item.question && (
        <>
          <div className="detail-section-label">The Question</div>
          <p className="detail-desc" style={{ fontStyle: "italic" }}>{item.question}</p>
        </>
      )}

      {/* description */}
      {item.description && (
        <>
          <div className="detail-section-label">Context &amp; Method</div>
          <p className="detail-desc">{item.description}</p>
        </>
      )}

      {/* method tags */}
      {item.method_tags && item.method_tags.length > 0 && (
        <>
          <div className="detail-section-label">Methods</div>
          <MethodTags tags={item.method_tags} max={10} />
          <WhoCanHelp methodTags={item.method_tags} allMembers={allMembers} onMemberClick={onMemberClick} />
        </>
      )}

      {/* team */}
      {item.team_oids && item.team_oids.length > 0 && (
        <>
          <div className="detail-section-label">Team</div>
          <div className="avatar-strip" style={{ flexWrap: "wrap", gap: 10 }}>
            {item.team_oids.map((oid, i) => (
              <button key={oid} className="avatar-strip-btn team-member-chip"
                onClick={() => onMemberClick && onMemberClick(oid)}
                title={item.team_names[i]}>
                <Avatar oid={oid} name={item.team_names[i]} cls="mini-avatar" />
                <span style={{ fontSize: 13, marginLeft: 6, color: "var(--parch-dim)" }}>{item.team_names[i]}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* reward */}
      {item.reward && (
        <div className="locked-field" style={{ marginTop: 10, background: "rgba(92,205,92,.06)", borderColor: "var(--status-found-hi)" }}>
          <Icon.Trophy style={{ color: "var(--status-found-hi)", width: 18, height: 18 }} />
          <span style={{ fontSize: 14 }}><strong style={{ color: "var(--status-found-hi)" }}>Reward:</strong> {item.reward}</span>
        </div>
      )}

      {/* challenge link */}
      {item.challenge_id && (
        <div className="locked-field" style={{ marginTop: 14 }}>
          <Icon.Lightning style={{ color: "var(--amber)" }} />
          <span style={{ fontSize: 14 }}>Responding to a network challenge</span>
        </div>
      )}

      {/* wrapping-up: finding input */}
      {item.status === "wrapping-up" && canAdvance && (
        <>
          <div className="detail-section-label" style={{ marginTop: 18 }}>Share Your Finding</div>
          <div className="field">
            <label htmlFor="exp-finding">What did you find out?
              <span className="hint">{finding.length}/600</span></label>
            <textarea id="exp-finding" className="textarea" maxLength={600} value={finding}
              onChange={(e) => setFinding(e.target.value)}
              placeholder="Summarise what you learned — even if it didn't work as expected..." />
          </div>
          <div className="field">
            <label htmlFor="exp-outcome">Outcome</label>
            <select id="exp-outcome" className="select" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="">Select outcome...</option>
              {OUTCOME_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </>
      )}

      {/* finding (read-only once shared) */}
      {item.status === "finding-shared" && item.finding && (
        <>
          <div className="detail-section-label">Finding</div>
          <div className="finding-box">
            {item.outcome && (
              <div className={"outcome-badge outcome-badge--" + item.outcome} style={{ marginBottom: 10, display: "inline-flex" }}>
                {{ worked: "It worked", didnt: "Didn't work", inconclusive: "Inconclusive", "too-early": "Too early" }[item.outcome] || item.outcome}
              </div>
            )}
            <p style={{ margin: 0, color: "var(--parch)", fontSize: 16, lineHeight: 1.6 }}>{item.finding}</p>
          </div>
        </>
      )}

      {/* update log */}
      <div className="detail-section-label">Update Log {item.updates && item.updates.length > 0 ? "· " + item.updates.length : ""}</div>
      {(!item.updates || item.updates.length === 0) ? (
        <p className="log-empty">No updates yet.</p>
      ) : (
        <ul className="log">
          {item.updates.map((u) => (
            <li className="log-item" key={u.id}>
              <div className="log-meta">
                <button className="name-link log-author" onClick={() => onMemberClick && onMemberClick(u.author_oid)}>{u.author_name}</button>
                <span className="log-time">{timeAgo(u.timestamp)}</span>
              </div>
              <p className="log-text">{u.text}</p>
            </li>
          ))}
        </ul>
      )}

      {user && !done && (
        <div style={{ marginTop: 18 }}>
          <div className="field" style={{ marginBottom: 8 }}>
            <label htmlFor="exp-upd">Add an Update <span className="hint">{updText.length}/500</span></label>
            <textarea id="exp-upd" className="textarea" style={{ minHeight: 90 }} value={updText}
              maxLength={500}
              placeholder="Report progress, share a blocker, note a discovery..."
              onChange={(e) => { setUpdText(e.target.value); setUpdErr(""); }} />
            {updErr && <div className="field-error" role="alert">{updErr}</div>}
          </div>
          <button className="btn sm" onClick={submitUpdate}><Icon.Chat style={{ width: 15, height: 15 }} /> Post Update</button>
        </div>
      )}
    </Modal>
  );
}

/* ============ SESSION DETAIL (modal) ============ */
function SessionDetail({ item, user, onSignUp, onWithdraw, onAddUpdate, onMarkHappened, onShareOutput, onClose, onMemberClick }) {
  const [updText, setUpdText] = uS("");
  const [updErr, setUpdErr] = uS("");
  const [output, setOutput] = uS(item.output || "");

  const isHost = user && item.host_oid === user.oid;
  const isAttendee = user && item.attendee_oids && item.attendee_oids.includes(user.oid);
  const done = item.status === "output-shared";
  const formatLabel = { "in-person": "In Person", remote: "Remote", async: "Async" };

  const submitUpdate = () => {
    const t = updText.trim();
    if (!t) { setUpdErr("An update cannot be empty."); return; }
    if (t.length > 500) { setUpdErr("Must be 500 characters or fewer."); return; }
    onAddUpdate(item.item_id, t);
    setUpdText(""); setUpdErr("");
  };

  const foot = done ? (
    <button className="btn stone block" onClick={onClose}>Close</button>
  ) : isHost && item.status === "happened" ? (
    <button className="btn" style={{ flex: 1 }} onClick={() => onShareOutput(item.item_id, output.trim())}
      disabled={!output.trim()}>
      <Icon.Check style={{ width: 16, height: 16 }} /> Share Output &amp; Award XP
    </button>
  ) : isHost && item.status === "scheduled" ? (
    <button className="btn" style={{ flex: 1 }} onClick={() => onMarkHappened(item.item_id)}>
      <Icon.Check style={{ width: 16, height: 16 }} /> Mark as Happened
    </button>
  ) : user && !isAttendee && !isHost ? (
    <button className="btn block" onClick={() => onSignUp(item.item_id)}>
      <Icon.Hand style={{ width: 16, height: 16 }} /> Sign Up
    </button>
  ) : user && isAttendee ? (
    <>
      <button className="btn stone" onClick={() => onWithdraw(item.item_id)}>Withdraw</button>
      <button className="btn stone" onClick={onClose}>Close</button>
    </>
  ) : (
    <button className="btn stone block" onClick={onClose}>Close</button>
  );

  return (
    <Modal title={item.title} onClose={onClose} labelId="sess-detail-title"
      sub={
        <span style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <StatusPill status={item.status} />
        </span>
      }
      foot={foot}>

      <div className="card-meta" style={{ marginBottom: 14, paddingTop: 0 }}>
        <span style={{ fontSize: 14, color: "var(--parch-dim)" }}>
          Hosted by{" "}
          <button className="name-link" onClick={() => onMemberClick && onMemberClick(item.host_oid)}>{item.host_name}</button>
        </span>
        {item.session_date && (
          <span style={{ fontSize: 14, color: "var(--parch-dim)" }}>
            <Icon.Calendar style={{ width: 14, height: 14 }} /> {fullDate(item.session_date)}
          </span>
        )}
        {item.format && (
          <span className="session-format-badge">{formatLabel[item.format] || item.format}</span>
        )}
      </div>

      {item.topic && (
        <>
          <div className="detail-section-label">Topic</div>
          <p className="detail-desc" style={{ fontStyle: "italic" }}>{item.topic}</p>
        </>
      )}

      {/* attendees */}
      {item.attendee_oids && item.attendee_oids.length > 0 && (
        <>
          <div className="detail-section-label">Attendees ({item.attendee_oids.length})</div>
          <div className="avatar-strip" style={{ flexWrap: "wrap", gap: 10 }}>
            {item.attendee_oids.map((oid, i) => (
              <button key={oid} className="avatar-strip-btn team-member-chip"
                onClick={() => onMemberClick && onMemberClick(oid)}
                title={item.attendee_names[i]}>
                <Avatar oid={oid} name={item.attendee_names[i]} cls="mini-avatar" />
                <span style={{ fontSize: 13, marginLeft: 6, color: "var(--parch-dim)" }}>{item.attendee_names[i]}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* output entry (host only, after happened) */}
      {isHost && (item.status === "happened" || item.status === "output-shared") && (
        <>
          <div className="detail-section-label">Session Output</div>
          {done ? (
            <div className="finding-box">
              <p style={{ margin: 0, color: "var(--parch)", fontSize: 16, lineHeight: 1.6 }}>{item.output}</p>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="sess-output">What came out of this session?
                <span className="hint">{output.length}/800</span></label>
              <textarea id="sess-output" className="textarea" maxLength={800} value={output}
                onChange={(e) => setOutput(e.target.value)}
                placeholder="Key decisions, insights, actions, questions raised..." />
            </div>
          )}
        </>
      )}

      {/* output read-only for non-host */}
      {!isHost && done && item.output && (
        <>
          <div className="detail-section-label">Session Output</div>
          <div className="finding-box">
            <p style={{ margin: 0, color: "var(--parch)", fontSize: 16, lineHeight: 1.6 }}>{item.output}</p>
          </div>
        </>
      )}

      {/* challenge link */}
      {item.challenge_id && (
        <div className="locked-field" style={{ marginTop: 14 }}>
          <Icon.Lightning style={{ color: "var(--amber)" }} />
          <span style={{ fontSize: 14 }}>Responding to a network challenge</span>
        </div>
      )}

      {/* update log */}
      <div className="detail-section-label">Update Log {item.updates && item.updates.length > 0 ? "· " + item.updates.length : ""}</div>
      {(!item.updates || item.updates.length === 0) ? (
        <p className="log-empty">No updates yet.</p>
      ) : (
        <ul className="log">
          {item.updates.map((u) => (
            <li className="log-item" key={u.id}>
              <div className="log-meta">
                <button className="name-link log-author" onClick={() => onMemberClick && onMemberClick(u.author_oid)}>{u.author_name}</button>
                <span className="log-time">{timeAgo(u.timestamp)}</span>
              </div>
              <p className="log-text">{u.text}</p>
            </li>
          ))}
        </ul>
      )}

      {user && !done && (
        <div style={{ marginTop: 18 }}>
          <div className="field" style={{ marginBottom: 8 }}>
            <label htmlFor="sess-upd">Add an Update <span className="hint">{updText.length}/500</span></label>
            <textarea id="sess-upd" className="textarea" style={{ minHeight: 90 }} value={updText}
              maxLength={500}
              placeholder="Share a note about this session..."
              onChange={(e) => { setUpdText(e.target.value); setUpdErr(""); }} />
            {updErr && <div className="field-error" role="alert">{updErr}</div>}
          </div>
          <button className="btn sm" onClick={submitUpdate}><Icon.Chat style={{ width: 15, height: 15 }} /> Post Update</button>
        </div>
      )}
    </Modal>
  );
}

/* ============ CHALLENGE DETAIL (modal) ============ */
function ChallengeDetail({ item, allItems, user, onClose, onMemberClick, onRespondExperiment, onRespondSession }) {
  const responses = allItems
    ? allItems.filter((i) => item.response_ids && item.response_ids.includes(i.item_id))
    : [];
  const experiments = responses.filter((i) => i.item_type === "experiment");
  const sessions    = responses.filter((i) => i.item_type === "session");

  return (
    <Modal title={item.title} onClose={onClose} labelId="chal-detail-title"
      sub={<StatusPill status={item.status} />}
      foot={
        user && item.status === "open" ? (
          <>
            <button className="btn stone" onClick={onClose}>Close</button>
            <button className="btn stone" onClick={() => onRespondSession(item.item_id)}>
              <Icon.Calendar style={{ width: 15, height: 15 }} /> Propose Session
            </button>
            <button className="btn" onClick={() => onRespondExperiment(item.item_id)}>
              <Icon.Beaker style={{ width: 15, height: 15 }} /> Respond with Experiment
            </button>
          </>
        ) : (
          <button className="btn stone block" onClick={onClose}>Close</button>
        )
      }>

      <div className="card-meta" style={{ marginBottom: 14, paddingTop: 0 }}>
        <span style={{ fontSize: 14, color: "var(--parch-dim)" }}>
          Posted by{" "}
          <button className="name-link" onClick={() => onMemberClick && onMemberClick(item.posted_by_oid)}>{item.posted_by_name}</button>
          {" "}&middot; {timeAgo(item.created_at)}
        </span>
      </div>

      <div className="detail-section-label">The Challenge</div>
      <p className="detail-desc" style={{ fontStyle: "italic" }}>{item.question}</p>

      {experiments.length > 0 && (
        <>
          <div className="detail-section-label">Experiments Responding ({experiments.length})</div>
          <div className="response-mini-list">
            {experiments.map((exp) => (
              <div key={exp.item_id} className="response-mini-item">
                <StatusPill status={exp.status} />
                <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--parch)" }}>{exp.title}</span>
                {exp.team_oids && exp.team_oids.length > 0 && (
                  <AvatarStrip oids={exp.team_oids} names={exp.team_names} max={3} onMemberClick={onMemberClick} />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {sessions.length > 0 && (
        <>
          <div className="detail-section-label">Sessions Responding ({sessions.length})</div>
          <div className="response-mini-list">
            {sessions.map((sess) => (
              <div key={sess.item_id} className="response-mini-item">
                <StatusPill status={sess.status} />
                <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--parch)" }}>{sess.title}</span>
                <button className="name-link" style={{ fontSize: 13 }}
                  onClick={() => onMemberClick && onMemberClick(sess.host_oid)}>{sess.host_name}</button>
              </div>
            ))}
          </div>
        </>
      )}

      {experiments.length === 0 && sessions.length === 0 && (
        <p className="log-empty" style={{ marginTop: 8 }}>No responses yet. Be the first to take this on.</p>
      )}
    </Modal>
  );
}

/* ============ SWIM LANE ============ */
function SwimLane({ laneType, title, items, allItems, user, allMembers, onOpen, onAdd, onMemberClick }) {
  const laneClass = {
    experiment: "swim-lane--experiment",
    session:    "swim-lane--session",
    finding:    "swim-lane--finding",
    challenge:  "swim-lane--challenge",
  }[laneType] || "";

  const laneIcon = {
    experiment: <Icon.Beaker />,
    session:    <Icon.Calendar />,
    finding:    <Icon.Trophy />,
    challenge:  <Icon.Lightning />,
  }[laneType] || <Icon.Board />;

  const addLabel = {
    experiment: "New Experiment",
    session:    "New Session",
    challenge:  "New Challenge",
    finding:    null,
  }[laneType];

  return (
    <section className={"swim-lane " + laneClass} aria-label={title + " swim lane"}>
      <div className="lane-header">
        <span className="lane-icon">{laneIcon}</span>
        <span className="lane-title">{title}</span>
        <span className="lane-count">{items.length}</span>
        <span className="lane-spacer" />
        {addLabel && user && (
          <button className="lane-add-btn" onClick={onAdd}>
            <Icon.Plus style={{ width: 14, height: 14 }} /> {addLabel}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="lane-empty">
          {laneType === "finding" ? "No findings shared yet." : "Nothing here yet."}
          {addLabel && user && (
            <button className="linklike" style={{ marginLeft: 10 }} onClick={onAdd}>
              + Add one
            </button>
          )}
        </div>
      ) : (
        <div className="lane-grid">
          {items.map((item) => {
            if (laneType === "experiment") {
              return <ExperimentCard key={item.item_id} item={item} onOpen={onOpen} onMemberClick={onMemberClick} />;
            }
            if (laneType === "session") {
              return <SessionCard key={item.item_id} item={item} onOpen={onOpen} onMemberClick={onMemberClick} />;
            }
            if (laneType === "finding") {
              return <FindingCard key={item.item_id} item={item} onOpen={onOpen} onMemberClick={onMemberClick} />;
            }
            if (laneType === "challenge") {
              return <ChallengeCard key={item.item_id} item={item} allItems={allItems} onOpen={onOpen} onMemberClick={onMemberClick} />;
            }
            return null;
          })}
        </div>
      )}
    </section>
  );
}

/* ============ GUILD MEMBERS SECTION ============ */
function MembersSection({ allMembers, board, config, user, onEdit }) {
  const [search, setSearch] = uS("");
  const [skillFilter, setSkillFilter] = uS("any");
  const [showSuggestions, setShowSuggestions] = uS(false);
  const [activeIdx, setActiveIdx] = uS(-1);
  const inputRef = uR(null);
  const listRef = uR(null);

  const SKILL_FILTERS = [
    { key: "any",      label: "All Members" },
    { key: "strength", label: "Strengths" },
    { key: "mentor",   label: "Can Mentor" },
    { key: "stretch",  label: "Stretch Goals" },
  ];

  const suggestions = uM(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const seen = new Set();
    const results = [];
    const push = (text, kind) => {
      const key = text.toLowerCase();
      if (!seen.has(key) && key.includes(q)) { seen.add(key); results.push({ text, kind }); }
    };
    allMembers.forEach((m) => {
      push(m.name, "member");
      if (m.role_team) push(m.role_team, "role");
    });
    (SKILLS || []).forEach((cat) => cat.tools.forEach((tool) => push(tool, "skill")));
    return results.slice(0, 8);
  }, [allMembers, search]);

  const KIND_LABEL = { member: "Member", role: "Role", skill: "Skill" };
  const KIND_CLASS = { member: "sugg-kind--member", role: "sugg-kind--role", skill: "sugg-kind--skill" };

  const pick = (text) => {
    setSearch(text);
    setShowSuggestions(false);
    setActiveIdx(-1);
    inputRef.current && inputRef.current.focus();
  };

  const onKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); pick(suggestions[activeIdx].text); }
    else if (e.key === "Escape") { setShowSuggestions(false); setActiveIdx(-1); }
  };

  uE(() => {
    const handler = (e) => {
      if (listRef.current && !listRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        const hasType = Object.values(m.skills || {}).some((v) => v === skillFilter);
        if (!hasType) return false;
      }
      return true;
    });
  }, [allMembers, search, skillFilter]);

  const highlight = (text) => {
    const q = search.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="sugg-mark">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <>
      <p className="flavour">The Adventurers of the South West</p>
      <div className="divider"><span className="rule" /><Icon.Shield /><span className="rule r" /></div>

      <div className="member-controls">
        <div className="member-search-wrap" style={{ position: "relative" }}>
          <Icon.Search className="member-search-icon" />
          <input
            ref={inputRef}
            className="input member-search"
            placeholder="Search by name, role or skill..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); setActiveIdx(-1); }}
            onFocus={() => search.trim().length >= 2 && setShowSuggestions(true)}
            onKeyDown={onKeyDown}
            aria-label="Search members"
            aria-autocomplete="list"
            aria-expanded={showSuggestions && suggestions.length > 0}
            autoComplete="off"
          />
          {search && (
            <button className="member-search-clear linklike" onClick={() => { setSearch(""); setShowSuggestions(false); }} aria-label="Clear search">&#x2715;</button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="sugg-list" ref={listRef} role="listbox" aria-label="Suggestions">
              {suggestions.map((s, i) => (
                <li key={s.text} role="option" aria-selected={i === activeIdx}
                  className={"sugg-item" + (i === activeIdx ? " sugg-item--active" : "")}
                  onMouseDown={(e) => { e.preventDefault(); pick(s.text); }}>
                  <span className="sugg-text">{highlight(s.text)}</span>
                  <span className={"sugg-kind " + KIND_CLASS[s.kind]}>{KIND_LABEL[s.kind]}</span>
                </li>
              ))}
            </ul>
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
  const [items, setItems] = uS([]);
  const [board, setBoard] = uS({});
  const [mobileView, setMobileView] = uS("board"); // board | leaderboard
  const [celebrate, setCelebrate] = uS(null);
  const [toast, setToast] = uS(null);
  const [activeSection, setActiveSection] = uS("board");
  const [members, setMembers] = uS([]);
  const [editingMember, setEditingMember] = uS(false);
  const [viewingMember, setViewingMember] = uS(null);

  // modal state
  const [openItemId, setOpenItemId] = uS(null);
  const [posting, setPosting] = uS(null); // null | "experiment" | "session" | "challenge"
  const [postChallengeId, setPostChallengeId] = uS(null); // pre-link challenge when responding

  /* ---- mount ---- */
  uE(() => {
    (async () => {
      let { items: its, leaderboard: lb } = await Store.loadAll();
      if (!its || its.length === 0) {
        its = seedItems();
        await Promise.all(its.map((i) => Store.saveItem(i)));
      }
      if (!lb || Object.keys(lb).length === 0) {
        lb = seedLeaderboard(its);
        await Store.saveLeaderboard(lb);
      }
      const [mbrs, sess] = await Promise.all([Store.loadMembers(), Store.get("sw-session")]);
      setConfig(DEFAULT_CONFIG);
      setItems(its);
      setBoard(lb);
      setMembers(mbrs || []);
      if (sess) setUser(sess);
      setLoading(false);
    })();
  }, []);

  /* ---- poll every 30 s ---- */
  uE(() => {
    const id = setInterval(async () => {
      const [{ items: its, leaderboard: lb }, mbrs] = await Promise.all([
        Store.loadAll(),
        Store.loadMembers(),
      ]);
      if (its) setItems(its);
      if (lb) setBoard(lb);
      if (mbrs) setMembers(mbrs);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const signIn = async (acct) => {
    await Store.set("sw-session", acct);
    setUser(acct);
    setBoard((b) => {
      if (b[acct.oid]) return b;
      const nb = { ...b, [acct.oid]: { oid: acct.oid, name: acct.name, xp: 0 } };
      Store.saveLeaderboard(nb);
      return nb;
    });
  };
  const signOut = async () => { await Store.set("sw-session", null); setUser(null); setOpenItemId(null); setPosting(null); };

  /* ---- item actions ---- */
  const createItem = (item) => {
    // if this responds to a challenge, wire it up
    if (item.challenge_id) {
      setItems((prev) => {
        const updated = prev.map((i) => {
          if (i.item_id === item.challenge_id && i.item_type === "challenge") {
            const up = { ...i, response_ids: [...(i.response_ids || []), item.item_id] };
            Store.saveItem(up);
            return up;
          }
          return i;
        });
        return [item, ...updated];
      });
    } else {
      setItems((prev) => [item, ...prev]);
    }
    Store.saveItem(item);
    // award XP for posting a challenge
    if (item.item_type === "challenge") {
      awardXp(item.posted_by_oid, item.posted_by_name, 25);
    }
    // ensure poster appears on leaderboard
    setBoard((b) => {
      const oid = item.posted_by_oid || item.host_oid;
      const name = item.posted_by_name || item.host_name;
      if (!oid || b[oid]) return b;
      const nb = { ...b, [oid]: { oid, name, xp: 0 } };
      Store.saveLeaderboard(nb);
      return nb;
    });
    setPosting(null);
    setPostChallengeId(null);
    showToast(item.item_type === "experiment" ? "Experiment posted!" : item.item_type === "session" ? "Session proposed!" : "Challenge posted!");
  };

  const awardXp = (oid, name, amount) => {
    setBoard((b) => {
      const nb = { ...b };
      if (!nb[oid]) nb[oid] = { oid, name, xp: 0 };
      nb[oid] = { ...nb[oid], xp: nb[oid].xp + amount };
      Store.saveLeaderboard(nb);
      return nb;
    });
  };

  const updateItem = (updated) => {
    setItems((prev) => prev.map((i) => i.item_id === updated.item_id ? updated : i));
    Store.saveItem(updated);
  };

  const addUpdate = (itemId, text) => {
    const orig = items.find((i) => i.item_id === itemId);
    if (!orig) return;
    const upd = { id: nano(), author_name: user.name, author_oid: user.oid, text, timestamp: new Date().toISOString() };
    updateItem({ ...orig, updates: [...(orig.updates || []), upd], updated_at: new Date().toISOString() });
  };

  const advanceStatus = (itemId, newStatus) => {
    const orig = items.find((i) => i.item_id === itemId);
    if (!orig) return;
    updateItem({ ...orig, status: newStatus, updated_at: new Date().toISOString() });
    showToast("Status updated.");
  };

  const shareFinding = (itemId, finding, outcome) => {
    const orig = items.find((i) => i.item_id === itemId);
    if (!orig) return;
    const now = new Date().toISOString();
    const updated = { ...orig, status: "finding-shared", finding, outcome, closed_at: now, updated_at: now };
    updateItem(updated);
    // award XP to all team members
    (orig.team_oids || []).forEach((oid, i) => {
      awardXp(oid, (orig.team_names || [])[i] || oid, orig.xp_reward);
    });
    setOpenItemId(null);
    setCelebrate({ xp: orig.xp_reward * (orig.team_oids ? orig.team_oids.length : 1) });
  };

  const sessionSignUp = (itemId) => {
    const orig = items.find((i) => i.item_id === itemId);
    if (!orig || !user) return;
    if (orig.attendee_oids && orig.attendee_oids.includes(user.oid)) return;
    const updated = {
      ...orig,
      attendee_oids: [...(orig.attendee_oids || []), user.oid],
      attendee_names: [...(orig.attendee_names || []), user.name],
      updated_at: new Date().toISOString(),
    };
    updateItem(updated);
    showToast("Signed up for " + orig.title + "!");
  };

  const sessionWithdraw = (itemId) => {
    const orig = items.find((i) => i.item_id === itemId);
    if (!orig || !user) return;
    const idx = (orig.attendee_oids || []).indexOf(user.oid);
    if (idx < 0) return;
    const oids  = orig.attendee_oids.filter((_, i) => i !== idx);
    const names = orig.attendee_names.filter((_, i) => i !== idx);
    updateItem({ ...orig, attendee_oids: oids, attendee_names: names, updated_at: new Date().toISOString() });
    showToast("Withdrawn from session.");
  };

  const sessionMarkHappened = (itemId) => {
    const orig = items.find((i) => i.item_id === itemId);
    if (!orig) return;
    updateItem({ ...orig, status: "happened", updated_at: new Date().toISOString() });
    showToast("Marked as happened.");
  };

  const sessionShareOutput = (itemId, output) => {
    const orig = items.find((i) => i.item_id === itemId);
    if (!orig || !output) return;
    const now = new Date().toISOString();
    updateItem({ ...orig, status: "output-shared", output, updated_at: now });
    // award XP: host 75, each attendee 25
    awardXp(orig.host_oid, orig.host_name, orig.xp_reward);
    (orig.attendee_oids || []).forEach((oid, i) => {
      awardXp(oid, (orig.attendee_names || [])[i] || oid, 25);
    });
    setOpenItemId(null);
    setCelebrate({ xp: orig.xp_reward });
    showToast("Output shared! XP awarded.");
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

  /* ---- computed ---- */
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
      <p style={{ letterSpacing: ".2em", textTransform: "uppercase", fontSize: 14 }}>Loading the network board...</p>
    </div></div>;
  }

  if (!user) return <SignIn config={config} onSignedIn={signIn} />;

  /* ---- swim lane bucketing ---- */
  const experimentLane = items.filter((i) => i.item_type === "experiment" && i.status !== "finding-shared" && i.status !== "parked");
  const sessionLane    = items.filter((i) => i.item_type === "session"    && i.status !== "output-shared");
  const findingLane    = items.filter((i) =>
    (i.item_type === "experiment" && i.status === "finding-shared") ||
    (i.item_type === "session"    && i.status === "output-shared")
  );
  const challengeLane  = items.filter((i) => i.item_type === "challenge" && i.status === "open");

  const myXp = board[user.oid] ? board[user.oid].xp : 0;
  const maxXp = Math.max(1, ...Object.values(board).map((r) => r.xp));

  const showLeaderboardMobile = config.features.leaderboard && mobileView === "leaderboard" && activeSection === "board";
  const myMember = allMembers.find((m) => m.oid === user.oid) || null;

  /* ---- open item ---- */
  const openItem = openItemId ? items.find((i) => i.item_id === openItemId) || null : null;

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
            <button className="user-avatar-btn" onClick={() => setViewingMember(user.oid)} title="View my guild card">
              <Avatar oid={user.oid} name={user.name} cls="avatar" />
            </button>
            <span className="user-meta">
              <button className="name-link user-name" onClick={() => setViewingMember(user.oid)}>{user.name}</button>
              <span className="user-rank">{rankFor(myXp, config.xp_ranks)} &middot; {myXp.toLocaleString()} XP</span>
            </span>
            <button className="linklike" onClick={signOut}>Sign out</button>
          </div>
        </div>
        <nav className="section-nav" aria-label="Main sections">
          <button className={"sn-btn" + (activeSection === "board" ? " active" : "")}
            onClick={() => setActiveSection("board")}>
            <Icon.Board style={{ width: 16, height: 16 }} /> Board
          </button>
          <button className={"sn-btn" + (activeSection === "members" ? " active" : "")}
            onClick={() => setActiveSection("members")}>
            <Icon.Shield style={{ width: 16, height: 16 }} /> Guild
          </button>
        </nav>
      </header>

      <main className="wrap" style={{ flex: 1 }}>

        {/* ======== BOARD SECTION ======== */}
        {activeSection === "board" && (
          showLeaderboardMobile ? (
            <section aria-label="Leaderboard">
              <p className="flavour">Hall of Adventurers</p>
              <div className="divider"><span className="rule" /><Icon.Trophy /><span className="rule r" /></div>
              <Leaderboard board={board} ranks={config.xp_ranks} meOid={user.oid} maxXp={maxXp} onMemberClick={setViewingMember} />
              <div style={{ height: 24 }} />
            </section>
          ) : (
            <>
              <p className="flavour">{config.flavour_text}</p>
              <div className="divider"><span className="rule" /><Icon.Gem /><span className="rule r" /></div>

              <div className="board-intro">
                <p className="board-intro-text">
                  A shared board for optional test-and-learn work across the South West network.
                  Browse what colleagues are running, join an experiment, sign up for a session,
                  or post a challenge to the group.
                </p>
              </div>

              <div className={"board-layout" + (config.features.leaderboard ? " with-side" : "")}>
                <div className="swim-board">
                  <SwimLane laneType="experiment" title="Experiments" items={experimentLane} allItems={items}
                    user={user} allMembers={allMembers}
                    onOpen={(item) => setOpenItemId(item.item_id)}
                    onAdd={() => { setPostChallengeId(null); setPosting("experiment"); }}
                    onMemberClick={setViewingMember} />
                  <SwimLane laneType="session" title="Sessions" items={sessionLane} allItems={items}
                    user={user} allMembers={allMembers}
                    onOpen={(item) => setOpenItemId(item.item_id)}
                    onAdd={() => { setPostChallengeId(null); setPosting("session"); }}
                    onMemberClick={setViewingMember} />
                  <SwimLane laneType="finding" title="Findings" items={findingLane} allItems={items}
                    user={user} allMembers={allMembers}
                    onOpen={(item) => setOpenItemId(item.item_id)}
                    onAdd={null}
                    onMemberClick={setViewingMember} />
                  <SwimLane laneType="challenge" title="Challenges" items={challengeLane} allItems={items}
                    user={user} allMembers={allMembers}
                    onOpen={(item) => setOpenItemId(item.item_id)}
                    onAdd={() => setPosting("challenge")}
                    onMemberClick={setViewingMember} />
                </div>

                {config.features.leaderboard && (
                  <aside className="side-panel" aria-label="Leaderboard">
                    <h2><Icon.Trophy /> Leaderboard</h2>
                    <p className="sp-sub">Ranked by total XP earned</p>
                    <Leaderboard board={board} ranks={config.xp_ranks} meOid={user.oid} maxXp={maxXp} compact onMemberClick={setViewingMember} />
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
        <span className="dot">&bull;</span>
        <span>Test &amp; Learn Board v{config.version}</span>
        <span className="dot">&bull;</span>
        <span>{experimentLane.length + sessionLane.length} active items</span>
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

      {/* ---- detail modals ---- */}
      {openItem && openItem.item_type === "experiment" && (
        <ExperimentDetail
          item={openItem} user={user} allMembers={allMembers}
          onAddUpdate={addUpdate}
          onAdvanceStatus={advanceStatus}
          onShareFinding={shareFinding}
          onClose={() => setOpenItemId(null)}
          onMemberClick={setViewingMember} />
      )}
      {openItem && openItem.item_type === "session" && (
        <SessionDetail
          item={openItem} user={user}
          onSignUp={sessionSignUp}
          onWithdraw={sessionWithdraw}
          onAddUpdate={addUpdate}
          onMarkHappened={sessionMarkHappened}
          onShareOutput={sessionShareOutput}
          onClose={() => setOpenItemId(null)}
          onMemberClick={setViewingMember} />
      )}
      {openItem && openItem.item_type === "challenge" && (
        <ChallengeDetail
          item={openItem} allItems={items} user={user}
          onClose={() => setOpenItemId(null)}
          onMemberClick={setViewingMember}
          onRespondExperiment={(cid) => { setOpenItemId(null); setPostChallengeId(cid); setPosting("experiment"); }}
          onRespondSession={(cid)    => { setOpenItemId(null); setPostChallengeId(cid); setPosting("session"); }} />
      )}

      {/* ---- post modals ---- */}
      {posting === "experiment" && (
        <PostExperiment user={user} challengeId={postChallengeId}
          onClose={() => { setPosting(null); setPostChallengeId(null); }}
          onCreate={createItem} />
      )}
      {posting === "session" && (
        <PostSession user={user} challengeId={postChallengeId}
          onClose={() => { setPosting(null); setPostChallengeId(null); }}
          onCreate={createItem} />
      )}
      {posting === "challenge" && (
        <PostChallenge user={user}
          onClose={() => setPosting(null)}
          onCreate={createItem} />
      )}

      {/* ---- member card modal ---- */}
      {editingMember && myMember && (
        <EditMemberCard member={myMember} onClose={() => setEditingMember(false)} onSave={saveMember} />
      )}
      {viewingMember && (() => {
        const vm = allMembers.find((m) => m.oid === viewingMember);
        if (!vm) return null;
        return (
          <MemberCardModal
            member={vm}
            xp={(board[vm.oid] || {}).xp || 0}
            ranks={config.xp_ranks}
            isMe={vm.oid === user.oid}
            onEdit={() => { setViewingMember(null); setEditingMember(true); }}
            onClose={() => setViewingMember(null)}
          />
        );
      })()}

      {celebrate && (
        <QuestComplete xp={celebrate.xp} onDone={() => setCelebrate(null)} />
      )}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
