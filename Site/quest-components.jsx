/* =========================================================
   ICONS + PRESENTATIONAL COMPONENTS
   ========================================================= */
const { useEffect, useRef, useState } = React;

/* ---------- inline SVG icons (stroke = currentColor) ---------- */
const Icon = {
  Crest: (p) => (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...p}>
      <path d="M32 4l24 8v18c0 14-10 24-24 30C18 54 8 44 8 30V12L32 4z" fill="#1a1510" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M32 12l16 5.5V30c0 9.6-6.6 17-16 21-9.4-4-16-11.4-16-21V17.5L32 12z" stroke="currentColor" strokeWidth="1.5" opacity=".5"/>
      <path d="M32 20l3.4 7 7.6.8-5.7 5 1.7 7.4L32 43l-7 4.2 1.7-7.4-5.7-5 7.6-.8L32 20z" fill="currentColor"/>
    </svg>
  ),
  Scroll: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M5 4h11a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H7a2 2 0 0 1-2-2V4z"/>
      <path d="M5 4a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1h2"/>
      <path d="M9 9h6M9 13h6"/>
    </svg>
  ),
  Gem: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M6 3h12l3 6-9 12L3 9l3-6z"/>
      <path d="M3 9h18M9 3l-3 6 6 12 6-12-3-6" opacity=".5"/>
    </svg>
  ),
  Chat: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M4 5h16v11H9l-5 4V5z"/>
    </svg>
  ),
  Trophy: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/>
      <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/>
      <path d="M12 13v4M9 20h6M10 17h4l1 3H9l1-3z"/>
    </svg>
  ),
  Board: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="3" y="4" width="18" height="16" rx="1"/>
      <path d="M7 9h4M7 13h7M7 17h5"/>
    </svg>
  ),
  Flag: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M5 21V4M5 4l9 1.5L11 9l3 3.5L5 14"/>
    </svg>
  ),
  Hand: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11M12 11V4.5a1.5 1.5 0 0 1 3 0V11M15 11V6.5a1.5 1.5 0 0 1 3 0V13c0 4-2.5 7-6.5 7S6 17.5 6 14l-1.6-2.6a1.4 1.4 0 0 1 2.2-1.7L9 12"/>
    </svg>
  ),
  Lock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="5" y="11" width="14" height="9" rx="1"/>
      <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M4 12l5 5L20 6"/>
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" {...p}>
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  MS: (p) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
      <rect x="2" y="2" width="9.5" height="9.5" fill="#f25022"/>
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7fba00"/>
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00a4ef"/>
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#ffb900"/>
    </svg>
  ),
  Medal: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="12" cy="15" r="6" fill="currentColor" opacity=".18"/>
      <circle cx="12" cy="15" r="6"/>
      <path d="M9 3l3 6 3-6" />
    </svg>
  ),
  Shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 3l8 3v5c0 5.5-3.5 10-8 12C7.5 21 4 16.5 4 11V6l8-3z"/>
      <path d="M9 12l2 2 4-4" opacity=".7"/>
    </svg>
  ),
  Edit: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="11" cy="11" r="7"/>
      <line x1="16.5" y1="16.5" x2="22" y2="22"/>
    </svg>
  ),
  Beaker: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M9 3h6M9 3v8l-5 9h16L15 11V3"/>
      <path d="M7 17h10" opacity=".5"/>
    </svg>
  ),
  Calendar: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  Users: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="9" cy="7" r="4"/>
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <path d="M16 3a4 4 0 0 1 0 8M21 21v-2a4 4 0 0 0-3-3.87"/>
    </svg>
  ),
  Lightning: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  ArrowRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  ),
};

/* ---------- initials avatar ---------- */
function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0].toUpperCase();
}

/* ---------- portrait avatar (falls back to initials) ---------- */
function Avatar({ oid, name, cls = "avatar" }) {
  const src = (typeof avatarFor === "function") ? avatarFor(oid) : null;
  if (src) {
    return (
      <span className={cls + " has-img"} aria-hidden="true">
        <img src={src} alt="" loading="lazy" />
      </span>
    );
  }
  return <span className={cls} aria-hidden="true">{initials(name)}</span>;
}

/* ---------- XP badge ---------- */
function XpBadge({ amount }) {
  const epic = amount >= 500;
  return (
    <span className={"xp-badge" + (epic ? " epic" : "")}>
      <Icon.Gem />
      {amount} XP
    </span>
  );
}

/* ---------- status pill for new item types ---------- */
const STATUS_PILL_CONFIG = {
  proposed:         { label: "Proposed",       cls: "proposed" },
  designing:        { label: "Designing",      cls: "designing" },
  running:          { label: "Running",        cls: "running" },
  "wrapping-up":    { label: "Wrapping Up",    cls: "wrapping" },
  "finding-shared": { label: "Finding Shared", cls: "found" },
  parked:           { label: "Parked",         cls: "parked" },
  scheduled:        { label: "Scheduled",      cls: "scheduled" },
  happened:         { label: "Happened",       cls: "happened" },
  "output-shared":  { label: "Output Shared",  cls: "found" },
  open:             { label: "Open",           cls: "challenge-open" },
  closed:           { label: "Closed",         cls: "parked" },
};

function StatusPill({ status }) {
  const cfg = STATUS_PILL_CONFIG[status] || { label: status, cls: "proposed" };
  return <span className={"status-pill status-pill--" + cfg.cls}>{cfg.label}</span>;
}

/* ---------- method tags strip ---------- */
function MethodTags({ tags, max }) {
  if (!tags || tags.length === 0) return null;
  const limit = max || 3;
  const shown = tags.slice(0, limit);
  const extra = tags.length - limit;
  return (
    <div className="method-tags">
      {shown.map((t) => <span key={t} className="method-tag">{t}</span>)}
      {extra > 0 && <span className="method-tag method-tag--more">+{extra}</span>}
    </div>
  );
}

/* ---------- avatar strip ---------- */
function AvatarStrip({ oids, names, max, onMemberClick }) {
  const limit = max || 4;
  const shown = (oids || []).slice(0, limit);
  const extra = (oids || []).length - limit;
  return (
    <div className="avatar-strip">
      {shown.map((oid, i) => (
        <button key={oid} className="avatar-strip-btn" title={(names || [])[i] || oid}
          onClick={(e) => { e.stopPropagation(); onMemberClick && onMemberClick(oid); }}>
          <Avatar oid={oid} name={(names || [])[i]} cls="mini-avatar" />
        </button>
      ))}
      {extra > 0 && <span className="avatar-strip-extra">+{extra}</span>}
    </div>
  );
}

/* ---------- CardStats: compact difficulty + effort + deadline strip ---------- */
function DifficultyPips({ level }) {
  if (!level) return null;
  const pips = [1, 2, 3, 4, 5];
  return (
    <span className="difficulty-pips" aria-label={"Complexity level " + level + " of 5"}>
      {pips.map((n) => (
        <span key={n} className={"difficulty-pip" + (n <= level ? " difficulty-pip--filled" : "")} />
      ))}
    </span>
  );
}

function DeadlineTag({ deadline }) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  const overdue = d < new Date();
  return (
    <span className={"deadline-tag" + (overdue ? " deadline-tag--overdue" : "")}>
      {overdue ? "Overdue" : fullDate(deadline)}
    </span>
  );
}

function CardStats({ item }) {
  const hasDiff = item.difficulty != null;
  const hasEffort = item.effort;
  const hasDeadline = item.deadline;
  if (!hasDiff && !hasEffort && !hasDeadline) return null;
  return (
    <div className="card-stats">
      {hasDiff && <DifficultyPips level={item.difficulty} />}
      {hasEffort && <span className="effort-tag">{item.effort}</span>}
      {hasDeadline && <DeadlineTag deadline={item.deadline} />}
    </div>
  );
}

/* ---------- ExperimentCard ---------- */
function ExperimentCard({ item, onOpen, onMemberClick }) {
  const hasTeam = item.team_oids && item.team_oids.length > 0;
  return (
    <button className="quest-card parchment item-card item-card--experiment"
      onClick={() => onOpen(item)}
      aria-label={"Open experiment: " + item.title + ". Status: " + item.status + "."}>
      <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
      <div className="card-top">
        <h3 className="quest-title">{item.title}</h3>
        <StatusPill status={item.status} />
      </div>
      <CardStats item={item} />
      {item.question && <p className="item-question">{item.question}</p>}
      <MethodTags tags={item.method_tags} />
      <div className="card-meta">
        {hasTeam
          ? <AvatarStrip oids={item.team_oids} names={item.team_names} onMemberClick={onMemberClick} />
          : <span className="poster" style={{ fontSize: 13, fontStyle: "italic" }}>No team yet</span>
        }
        <XpBadge amount={item.xp_reward} />
        {item.updates && item.updates.length > 0 && (
          <span className="updates"><Icon.Chat style={{ width: 15, height: 15 }} /> {item.updates.length}</span>
        )}
      </div>
    </button>
  );
}

/* ---------- SessionCard ---------- */
function SessionCard({ item, onOpen, onMemberClick }) {
  const formatLabel = { "in-person": "In Person", remote: "Remote", async: "Async" };
  return (
    <button className="quest-card parchment item-card item-card--session"
      onClick={() => onOpen(item)}
      aria-label={"Open session: " + item.title + ". Status: " + item.status + "."}>
      <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
      <div className="card-top">
        <h3 className="quest-title">{item.title}</h3>
        <StatusPill status={item.status} />
      </div>
      <CardStats item={item} />
      {item.topic && <p className="item-question">{item.topic}</p>}
      <div className="session-meta-row">
        {item.session_date && (
          <span className="session-date-badge">
            <Icon.Calendar style={{ width: 13, height: 13 }} />
            {fullDate(item.session_date)}
          </span>
        )}
        {item.format && (
          <span className="session-format-badge">{formatLabel[item.format] || item.format}</span>
        )}
      </div>
      <div className="card-meta">
        <button className="name-link host-chip"
          onClick={(e) => { e.stopPropagation(); onMemberClick && onMemberClick(item.host_oid); }}>
          <Avatar oid={item.host_oid} name={item.host_name} cls="mini-avatar" />
          {item.host_name}
        </button>
        {item.attendee_oids && item.attendee_oids.length > 0 && (
          <AvatarStrip oids={item.attendee_oids} names={item.attendee_names} max={3} onMemberClick={onMemberClick} />
        )}
      </div>
    </button>
  );
}

/* ---------- ChallengeCard ---------- */
function ChallengeCard({ item, allItems, onOpen, onMemberClick }) {
  const responses = allItems
    ? allItems.filter((i) => item.response_ids && item.response_ids.includes(i.item_id))
    : [];
  const expCount  = responses.filter((i) => i.item_type === "experiment").length;
  const sessCount = responses.filter((i) => i.item_type === "session").length;
  const respText = [
    expCount  > 0 && (expCount  + " experiment"  + (expCount  !== 1 ? "s" : "")),
    sessCount > 0 && (sessCount + " session"      + (sessCount !== 1 ? "s" : "")),
  ].filter(Boolean).join(", ");

  return (
    <button className="quest-card parchment item-card item-card--challenge"
      onClick={() => onOpen(item)}
      aria-label={"Open challenge: " + item.title + "."}>
      <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
      <div className="card-top">
        <span className="challenge-label"><Icon.Lightning style={{ width: 14, height: 14 }} /> Challenge</span>
        <StatusPill status={item.status} />
      </div>
      <h3 className="quest-title challenge-question">{item.question}</h3>
      <div className="card-meta">
        <button className="name-link" style={{ fontSize: 13 }}
          onClick={(e) => { e.stopPropagation(); onMemberClick && onMemberClick(item.posted_by_oid); }}>
          {item.posted_by_name}
        </button>
        {respText && <span className="response-count">{respText}</span>}
      </div>
    </button>
  );
}

/* ---------- FindingCard (for the Findings swim lane) ---------- */
function FindingCard({ item, onOpen, onMemberClick }) {
  const outcomeLabel = { worked: "It worked", didnt: "Didn't work", inconclusive: "Inconclusive", "too-early": "Too early" };
  if (item.item_type === "experiment") {
    return (
      <button className="quest-card parchment item-card item-card--finding"
        onClick={() => onOpen(item)}
        aria-label={"View finding: " + item.title}>
        <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
        <div className="card-top">
          <h3 className="quest-title">{item.title}</h3>
          {item.outcome && <span className={"outcome-badge outcome-badge--" + item.outcome}>{outcomeLabel[item.outcome] || item.outcome}</span>}
        </div>
        {item.finding && <p className="item-finding">{item.finding}</p>}
        <div className="card-meta">
          {item.team_oids && item.team_oids.length > 0 && (
            <AvatarStrip oids={item.team_oids} names={item.team_names} onMemberClick={onMemberClick} />
          )}
          <span className="log-time">{fullDate(item.closed_at || item.updated_at)}</span>
        </div>
      </button>
    );
  }
  return (
    <button className="quest-card parchment item-card item-card--finding"
      onClick={() => onOpen(item)}
      aria-label={"View session output: " + item.title}>
      <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
      <div className="card-top">
        <h3 className="quest-title">{item.title}</h3>
        <span className="session-format-badge">Session</span>
      </div>
      {item.output && <p className="item-finding">{item.output}</p>}
      <div className="card-meta">
        <button className="name-link host-chip"
          onClick={(e) => { e.stopPropagation(); onMemberClick && onMemberClick(item.host_oid); }}>
          <Avatar oid={item.host_oid} name={item.host_name} cls="mini-avatar" />
          {item.host_name}
        </button>
        <span className="log-time">{fullDate(item.updated_at)}</span>
      </div>
    </button>
  );
}

/* ---------- modal shell w/ focus trap ---------- */
function Modal({ title, sub, onClose, children, foot, labelId }) {
  const lid = labelId || "modal-title";
  const ref = useRef(null);
  const prevFocus = useRef(null);

  useEffect(() => {
    prevFocus.current = document.activeElement;
    const root = ref.current;
    const focusables = () => Array.from(root.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.disabled && el.offsetParent !== null);
    const first = focusables()[0];
    if (first) first.focus();

    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (prevFocus.current && prevFocus.current.focus) prevFocus.current.focus();
    };
  }, []);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal parchment" role="dialog" aria-modal="true" aria-labelledby={lid} ref={ref}>
        <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
        <div className="modal-head">
          <div>
            <h2 id={lid}>{title}</h2>
            {sub && <div className="sub">{sub}</div>}
          </div>
          <button className="x-close" onClick={onClose} aria-label="Close dialog">&#x2715;</button>
        </div>
        <div className="modal-body">{children}</div>
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  );
}

/* ---------- leaderboard rows ---------- */
function Leaderboard({ board, ranks, meOid, maxXp, compact, onMemberClick }) {
  const rows = Object.values(board).sort((a, b) => b.xp - a.xp);
  const top = maxXp || (rows[0] ? rows[0].xp : 1);
  const [animate, setAnimate] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimate(true), 60); return () => clearTimeout(t); }, []);
  if (rows.length === 0) return <p className="log-empty">No one has earned XP yet.</p>;
  return (
    <ol className="leaderboard-list">
      {rows.map((r, i) => (
        <li key={r.oid} className={"lb-row" + (r.oid === meOid ? " me" : "")}>
          <div className="lb-rank">{i + 1}</div>
          <button className="lb-member-btn" onClick={() => onMemberClick && onMemberClick(r.oid)}
            title={"View " + r.name + "'s guild card"} disabled={!onMemberClick}>
            <Avatar oid={r.oid} name={r.name} cls="lb-avatar" />
          </button>
          <div className="lb-main">
            <div className="lb-name">
              <button className="name-link" onClick={() => onMemberClick && onMemberClick(r.oid)} disabled={!onMemberClick}>
                {r.name}
              </button>
              {r.oid === meOid && <span className="you-tag">YOU</span>}
            </div>
            <div className="lb-title">{rankFor(r.xp, ranks)}</div>
            {!compact && (
              <div className="lb-bar-track" role="img" aria-label={r.xp + " XP"}>
                <div className="lb-bar-fill" style={{ width: animate ? Math.max(4, (r.xp / top) * 100) + "%" : "0%" }} />
              </div>
            )}
          </div>
          <div className="lb-xp">{r.xp.toLocaleString()}<small>XP</small></div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- quest/finding complete celebration ---------- */
function QuestComplete({ xp, title, onDone }) {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    const t = setTimeout(onDone, reduced ? 1500 : 2600);
    return () => clearTimeout(t);
  }, []);
  const sparks = reduced ? [] : Array.from({ length: 18 }, (_, i) => {
    const ang = (i / 18) * Math.PI * 2;
    const dist = 120 + Math.random() * 220;
    return { dx: Math.cos(ang) * dist + "px", dy: Math.sin(ang) * dist + "px", d: Math.random() * 0.4 };
  });
  return (
    <div className="qc-overlay" role="alert" aria-live="assertive">
      <div className="qc-rays" />
      {sparks.map((s, i) => (
        <span key={i} className="qc-spark" style={{ "--dx": s.dx, "--dy": s.dy, animationDelay: s.d + "s" }} />
      ))}
      <div className="qc-banner">
        <p className="qc-title">Finding Shared!</p>
        <p className="qc-sub">+{xp} XP Awarded</p>
      </div>
    </div>
  );
}

/* ---------- toast ---------- */
function Toast({ msg }) {
  return <div className="toast" role="status"><Icon.Check style={{ width: 16, height: 16 }} /> {msg}</div>;
}

/* ---------- member card ---------- */
function MemberCard({ member, xp, ranks, isMe, onEdit, inModal }) {
  const skills = member.skills || {};
  const strengths = Object.keys(skills).filter((k) => skills[k] === "strength");
  const mentors   = Object.keys(skills).filter((k) => skills[k] === "mentor");
  const stretches = Object.keys(skills).filter((k) => skills[k] === "stretch");
  const hasSkills = strengths.length || mentors.length || stretches.length;
  const hasAbout  = member.what_to_know || member.how_i_work_best || member.how_to_get_best;
  const empty     = !hasSkills && !hasAbout && !member.role_team;

  const inner = (
    <>
      <div className="trump-header">
        <Avatar oid={member.oid} name={member.name} cls="trump-avatar" />
        <div className="trump-header-text">
          <div className="trump-name">{member.name}</div>
          {member.role_team && <div className="trump-role">{member.role_team}</div>}
          <div className="trump-rank-row">
            <span className="trump-rank-label">{rankFor(xp || 0, ranks)}</span>
            <span className="trump-xp">{(xp || 0).toLocaleString()} XP</span>
          </div>
        </div>
        {isMe && (
          <button className="trump-edit-btn" onClick={onEdit} aria-label="Edit your guild card">
            <Icon.Edit style={{ width: 13, height: 13 }} /> Edit
          </button>
        )}
      </div>

      {strengths.length > 0 && (
        <div className="trump-band trump-band--strength">
          <div className="trump-band-label"><span className="trump-band-pip" />Core Strengths</div>
          <div className="trump-tags">
            {strengths.map((s) => <span key={s} className="trump-tag trump-tag--strength">{s}</span>)}
          </div>
        </div>
      )}
      {mentors.length > 0 && (
        <div className="trump-band trump-band--mentor">
          <div className="trump-band-label"><span className="trump-band-pip" />Happy to Mentor</div>
          <div className="trump-tags">
            {mentors.map((s) => <span key={s} className="trump-tag trump-tag--mentor">{s}</span>)}
          </div>
        </div>
      )}
      {stretches.length > 0 && (
        <div className="trump-band trump-band--stretch">
          <div className="trump-band-label"><span className="trump-band-pip" />Stretch Goals</div>
          <div className="trump-tags">
            {stretches.map((s) => <span key={s} className="trump-tag trump-tag--stretch">{s}</span>)}
          </div>
        </div>
      )}

      {hasAbout && (
        <div className="trump-band trump-band--about">
          <div className="trump-band-label"><span className="trump-band-pip" />Working With Me</div>
          {member.what_to_know && (
            <div className="trump-about-row">
              <span className="trump-about-key">What to know</span>
              <span className="trump-about-val">{member.what_to_know}</span>
            </div>
          )}
          {member.how_i_work_best && (
            <div className="trump-about-row">
              <span className="trump-about-key">How I work best</span>
              <span className="trump-about-val">{member.how_i_work_best}</span>
            </div>
          )}
          {member.how_to_get_best && (
            <div className="trump-about-row">
              <span className="trump-about-key">To get the best from me</span>
              <span className="trump-about-val">{member.how_to_get_best}</span>
            </div>
          )}
        </div>
      )}

      {empty && (
        <div className="trump-empty">
          {isMe ? (
            <>
              <p>Your guild card is blank. Tell the guild what you know, what you can teach, and how to work with you.</p>
              <button className="btn sm" onClick={onEdit}><Icon.Edit style={{ width: 14, height: 14 }} /> Complete My Card</button>
            </>
          ) : (
            <p>This adventurer has not yet filled in their guild card.</p>
          )}
        </div>
      )}

      {(member.preferred_contact || member.availability) && (
        <div className="trump-footer">
          {member.preferred_contact && (
            <span>
              {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.preferred_contact.trim())
                ? <a href={"mailto:" + member.preferred_contact.trim()} className="trump-contact-link">{member.preferred_contact}</a>
                : member.preferred_contact}
            </span>
          )}
          {member.availability && <span>{member.availability}</span>}
        </div>
      )}
    </>
  );

  if (inModal) return inner;
  return (
    <div className={"trump-card parchment" + (empty ? " trump-card--empty" : "")}>
      <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
      {inner}
    </div>
  );
}

/* ---------- member card modal ---------- */
function MemberCardModal({ member, xp, ranks, isMe, onEdit, onClose }) {
  return (
    <Modal title={member.name} labelId="member-view-title"
      sub={member.role_team && <span style={{ color: "var(--muted)", fontSize: 15 }}>{member.role_team}</span>}
      onClose={onClose}
      foot={
        isMe
          ? <><button className="btn stone" onClick={onClose}>Close</button>
              <button className="btn" onClick={() => { onClose(); onEdit(); }}>
                <Icon.Edit style={{ width: 15, height: 15 }} /> Edit My Card
              </button></>
          : <button className="btn stone block" onClick={onClose}>Close</button>
      }>
      <MemberCard member={member} xp={xp} ranks={ranks} isMe={false} onEdit={onEdit} inModal />
    </Modal>
  );
}

/* ---------- "who can help" strip ---------- */
function WhoCanHelp({ methodTags, allMembers, onMemberClick }) {
  if (!methodTags || methodTags.length === 0 || !allMembers) return null;
  const helpers = allMembers.filter((m) => {
    const skills = m.skills || {};
    return methodTags.some((tag) => skills[tag] === "strength" || skills[tag] === "mentor");
  });
  if (helpers.length === 0) return null;
  return (
    <div className="who-help">
      <span className="who-help-label">Who can help?</span>
      <div className="who-help-avatars">
        {helpers.map((m) => (
          <button key={m.oid} className="avatar-strip-btn" title={m.name}
            onClick={() => onMemberClick && onMemberClick(m.oid)}>
            <Avatar oid={m.oid} name={m.name} cls="mini-avatar" />
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  Icon, initials, Avatar, XpBadge, StatusPill, MethodTags, AvatarStrip,
  DifficultyPips, DeadlineTag, CardStats,
  ExperimentCard, SessionCard, ChallengeCard, FindingCard,
  Modal, Leaderboard, QuestComplete, Toast,
  MemberCard, MemberCardModal, WhoCanHelp,
});
