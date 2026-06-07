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

/* ---------- quest state derivation ---------- */
function questState(q) {
  if (q.status === "completed") return "completed";
  return q.owner_oid ? "claimed" : "available";
}

/* ---------- status badge ---------- */
function StatusBadge({ quest }) {
  const s = questState(quest);
  if (s === "completed")
    return <span className="badge status-completed"><Icon.Check style={{ width: 12, height: 12 }} /> Completed</span>;
  if (s === "available")
    return <span className="badge status-available"><Icon.Flag style={{ width: 12, height: 12 }} /> Unclaimed</span>;
  return <span className="badge status-claimed">◆ In Progress</span>;
}

/* ---------- quest card ---------- */
function QuestCard({ quest, onOpen }) {
  const s = questState(quest);
  const done = s === "completed";
  const available = s === "available";
  const stateText = done ? "Completed" : available ? "Unclaimed — awaiting a hero" : "In progress";
  return (
    <button className={"quest-card parchment" + (done ? " completed" : "") + (available ? " available" : "")}
      onClick={() => onOpen(quest)}
      aria-label={`Open quest: ${quest.title}. ${stateText}. Reward ${quest.xp_reward} XP.`}>
      <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
      <div className="card-top">
        <h3 className="quest-title">{quest.title}</h3>
        <StatusBadge quest={quest} />
      </div>
      <p className="quest-desc">{quest.description}</p>
      <div className="card-meta">
        {available ? (
          <>
            <span className="claim-cta"><Icon.Hand /> Claim this quest</span>
            <span className="poster">Posted by {quest.posted_by_name}</span>
          </>
        ) : (
          <span className="owner"><Avatar oid={quest.owner_oid} name={quest.owner_name} cls="mini-avatar" />{quest.owner_name}</span>
        )}
        <XpBadge amount={quest.xp_reward} />
        {quest.updates && quest.updates.length > 0 && (
          <span className="updates"><Icon.Chat /> {quest.updates.length} {quest.updates.length === 1 ? "update" : "updates"}</span>
        )}
      </div>
    </button>
  );
}

/* ---------- modal shell w/ focus trap ---------- */
function Modal({ title, sub, onClose, children, foot, labelId = "modal-title" }) {
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
      <div className="modal parchment" role="dialog" aria-modal="true" aria-labelledby={labelId} ref={ref}>
        <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
        <div className="modal-head">
          <div>
            <h2 id={labelId}>{title}</h2>
            {sub && <div className="sub">{sub}</div>}
          </div>
          <button className="x-close" onClick={onClose} aria-label="Close dialog">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  );
}

/* ---------- leaderboard rows ---------- */
function Leaderboard({ board, ranks, meOid, maxXp, compact }) {
  const rows = Object.values(board).sort((a, b) => b.xp - a.xp);
  const top = maxXp || (rows[0] ? rows[0].xp : 1);
  const [animate, setAnimate] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimate(true), 60); return () => clearTimeout(t); }, []);
  if (rows.length === 0) return <p className="log-empty">No adventurers have earned XP yet. Close a quest to claim your place.</p>;
  return (
    <ol className="leaderboard-list">
      {rows.map((r, i) => (
        <li key={r.oid} className={"lb-row" + (r.oid === meOid ? " me" : "")}>
          <div className="lb-rank">{i + 1}</div>
          <Avatar oid={r.oid} name={r.name} cls="lb-avatar" />
          <div className="lb-main">
            <div className="lb-name">
              {r.name}
              {r.oid === meOid && <span className="you-tag">YOU</span>}
            </div>
            <div className="lb-title">{rankFor(r.xp, ranks)}</div>
            {!compact && (
              <div className="lb-bar-track" role="img" aria-label={`${r.xp} XP`}>
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

/* ---------- quest complete celebration ---------- */
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
        <p className="qc-title">Quest Complete!</p>
        <p className="qc-sub">+{xp} XP Awarded</p>
      </div>
    </div>
  );
}

/* ---------- toast ---------- */
function Toast({ msg }) {
  return <div className="toast" role="status"><Icon.Check style={{ width: 16, height: 16 }} /> {msg}</div>;
}

Object.assign(window, {
  Icon, initials, Avatar, XpBadge, StatusBadge, QuestCard, Modal, Leaderboard, QuestComplete, Toast, questState,
});
