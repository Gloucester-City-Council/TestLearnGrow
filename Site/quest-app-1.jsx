/* =========================================================
   APP — sign-in, board, detail, post, leaderboard
   ========================================================= */
const { useState: useS, useEffect: useE, useMemo, useCallback } = React;

/* ============ SIGN-IN (mock Entra ID) ============ */
function SignIn({ config, onSignedIn }) {
  const [picking, setPicking] = useS(false);
  const [customName, setCustomName] = useS("");
  const cfg = config || DEFAULT_CONFIG;

  const choose = (acct) => onSignedIn(acct);
  const useCustom = () => {
    const name = customName.trim();
    if (!name) return;
    onSignedIn({ name, username: name.toLowerCase().replace(/\s+/g, ".") + "@swtln.gov.uk", oid: "oid-" + nano(8) });
  };

  return (
    <div className="signin-stage">
      <div className="signin-card parchment">
        <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
        <div className="crest-lg"><Icon.Crest /></div>
        <h1>{cfg.network_name}</h1>
        <p className="season">{cfg.season_label}</p>

        {!picking ? (
          <>
            <p className="blurb">{cfg.flavour_text}</p>
            <button className="ms-btn" onClick={() => setPicking(true)}>
              <Icon.MS className="ms-logo" /> Sign in with Microsoft
            </button>
            <p className="signin-note">
              Access is restricted to network members. You will be identified by your
              <strong> Microsoft work account</strong> so that quest ownership can be verified.
            </p>
          </>
        ) : (
          <>
            <p className="blurb" style={{ marginBottom: 18, fontSize: 16 }}>Pick an account to continue</p>
            <div className="acct-list">
              {MOCK_ACCOUNTS.map((a) => (
                <button key={a.oid} className="acct" onClick={() => choose(a)}>
                  <Avatar oid={a.oid} name={a.name} cls="avatar" />
                  <span>
                    <div className="a-name">{a.name}</div>
                    <div className="a-mail">{a.username}</div>
                  </span>
                </button>
              ))}
            </div>
            <div className="acct-other">
              <div className="detail-section-label" style={{ marginTop: 16 }}>Or join as someone new</div>
              <input className="input" placeholder="Your display name" value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") useCustom(); }}
                aria-label="Your display name" />
              <button className="btn block" onClick={useCustom} disabled={!customName.trim()}>Enter the Guild</button>
            </div>
            <p className="signin-note" style={{ marginTop: 14 }}>
              <button className="linklike" onClick={() => setPicking(false)}>← Back</button>
            </p>
          </>
        )}
        <p className="signin-note" style={{ opacity: .7 }}>
          Demo build — Microsoft Entra sign-in is simulated. In production this is real MSAL.js authentication.
        </p>
      </div>
    </div>
  );
}

/* ============ schema-driven field ============ */
function SchemaField({ name, def, value, onChange, error }) {
  const id = "f-" + name;
  const len = typeof value === "string" ? value.length : 0;
  return (
    <div className="field">
      <label htmlFor={id}>
        {def.label}{def.required && <span className="req" aria-hidden="true">*</span>}
        {def.maxLength && def.type === "string" && (
          <span className="hint">{len}/{def.maxLength}</span>
        )}
      </label>
      {def.type === "enum" ? (
        <select id={id} className="select" value={value} onChange={(e) => onChange(name, Number(e.target.value))}
          aria-required={def.required}>
          <option value="" disabled>Choose…</option>
          {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : def.ui === "textarea" ? (
        <textarea id={id} className="textarea" value={value} maxLength={def.maxLength}
          onChange={(e) => onChange(name, e.target.value)} aria-required={def.required}
          placeholder={`Describe the ${def.label.toLowerCase()}…`} />
      ) : (
        <input id={id} className="input" value={value} maxLength={def.maxLength}
          onChange={(e) => onChange(name, e.target.value)} aria-required={def.required} />
      )}
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}

/* ============ POST NEW QUEST ============ */
function PostQuest({ schema, user, claimable, onClose, onCreate }) {
  const fields = schema.fields;
  const [vals, setVals] = useS(() => {
    const v = {};
    for (const k in fields) v[k] = fields[k].type === "enum" ? "" : "";
    return v;
  });
  const [assign, setAssign] = useS("self"); // self | open
  const [errors, setErrors] = useS({});
  const change = (k, val) => setVals((s) => ({ ...s, [k]: val }));

  const validate = () => {
    const e = {};
    for (const k in fields) {
      const d = fields[k]; const val = vals[k];
      if (d.required && (val === "" || val == null)) e[k] = `${d.label} is required.`;
      else if (d.type === "string" && d.maxLength && String(val).length > d.maxLength) e[k] = `Must be ${d.maxLength} characters or fewer.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const claimNow = !claimable || assign === "self";
    const nowIso = new Date().toISOString();
    onCreate({
      quest_id: nano(),
      title: vals.title.trim(),
      description: vals.description.trim(),
      posted_by_name: user.name, posted_by_oid: user.oid,
      owner_name: claimNow ? user.name : "",
      owner_oid: claimNow ? user.oid : null,
      owner_email: claimNow ? user.username : "",
      status: "open", created_at: nowIso,
      claimed_at: claimNow ? nowIso : null, closed_at: null,
      xp_reward: Number(vals.xp_reward),
      updates: [],
    });
  };

  return (
    <Modal title="Post a New Quest" sub="Rally the guild to your cause." onClose={onClose} labelId="post-title"
      foot={<>
        <button className="btn stone" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={submit}><Icon.Scroll style={{ width: 16, height: 16 }} /> Post Quest</button>
      </>}>
      <div className="locked-field" style={{ marginBottom: 18 }}>
        <Icon.Lock />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Avatar oid={user.oid} name={user.name} cls="mini-avatar" />Posting as <strong style={{ color: "var(--ink)" }}>{user.name}</strong></span>
        <span className="lf-label">From session</span>
      </div>
      {Object.keys(fields).map((k) => (
        <SchemaField key={k} name={k} def={fields[k]} value={vals[k]} onChange={change} error={errors[k]} />
      ))}
      {claimable && (
        <div className="field">
          <label id="assign-label">Who takes this on?</label>
          <div className="choice" role="radiogroup" aria-labelledby="assign-label">
            <button type="button" role="radio" aria-checked={assign === "self"}
              className={"choice-opt" + (assign === "self" ? " on" : "")} onClick={() => setAssign("self")}>
              <Icon.Hand />
              <span><strong>I&rsquo;ll take this on</strong><em>You become the owner and earn the XP.</em></span>
            </button>
            <button type="button" role="radio" aria-checked={assign === "open"}
              className={"choice-opt" + (assign === "open" ? " on" : "")} onClick={() => setAssign("open")}>
              <Icon.Flag />
              <span><strong>Post as open bounty</strong><em>Leave it unclaimed for any member to claim.</em></span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ============ EDIT MEMBER CARD ============ */
function EditMemberCard({ member, onClose, onSave }) {
  const { useState: useS2 } = React;
  const [form, setForm] = useS2({ ...member, skills: { ...(member.skills || {}) } });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleSkill = (tool, type) => {
    setForm((f) => {
      const current = (f.skills || {})[tool];
      return { ...f, skills: { ...f.skills, [tool]: current === type ? null : type } };
    });
  };

  const save = () => onSave({ ...form, updated_at: new Date().toISOString() });

  return (
    <Modal title="My Guild Card" sub="Tell the guild who you are and how to work with you."
      onClose={onClose} labelId="member-edit-title"
      foot={<>
        <button className="btn stone" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={save}><Icon.Check style={{ width: 16, height: 16 }} /> Save Card</button>
      </>}>

      {/* basic details */}
      <div className="field">
        <label htmlFor="me-role">Role / Team<span className="hint">{(form.role_team || "").length}/80</span></label>
        <input id="me-role" className="input" maxLength={80} value={form.role_team || ""}
          onChange={(e) => set("role_team", e.target.value)}
          placeholder="e.g. Senior Analyst, Digital Transformation" />
      </div>

      {/* skill matrix */}
      <div className="detail-section-label" style={{ marginTop: 8 }}>Skills &amp; Tools</div>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 16px", lineHeight: 1.5 }}>
        Mark each tool: <span style={{ color: "var(--trump-s-hi)", fontFamily: "var(--font-pixel)", fontSize: 11 }}>S</span> strength &nbsp;
        <span style={{ color: "var(--trump-m-hi)", fontFamily: "var(--font-pixel)", fontSize: 11 }}>M</span> happy to mentor &nbsp;
        <span style={{ color: "var(--trump-x-hi)", fontFamily: "var(--font-pixel)", fontSize: 11 }}>X</span> stretch goal
      </p>
      {SKILLS.map((cat) => (
        <div key={cat.category} className="skill-cat">
          <div className="skill-cat-label">{cat.category}</div>
          {cat.tools.map((tool) => {
            const val = (form.skills || {})[tool] || null;
            return (
              <div key={tool} className="skill-row">
                <span className="skill-name">{tool}</span>
                <div className="skill-toggles" role="group" aria-label={tool}>
                  <button type="button"
                    className={"skill-tog skill-tog--s" + (val === "strength" ? " on" : "")}
                    onClick={() => toggleSkill(tool, "strength")}
                    aria-pressed={val === "strength"}
                    title="Strength">S</button>
                  <button type="button"
                    className={"skill-tog skill-tog--m" + (val === "mentor" ? " on" : "")}
                    onClick={() => toggleSkill(tool, "mentor")}
                    aria-pressed={val === "mentor"}
                    title="Happy to mentor">M</button>
                  <button type="button"
                    className={"skill-tog skill-tog--x" + (val === "stretch" ? " on" : "")}
                    onClick={() => toggleSkill(tool, "stretch")}
                    aria-pressed={val === "stretch"}
                    title="Stretch goal">X</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* working with me */}
      <div className="detail-section-label" style={{ marginTop: 24 }}>Working With Me</div>
      {[
        ["what_to_know",    "What I'd like you to know about me", 300],
        ["how_i_work_best", "How I work best",                    300],
        ["how_to_get_best", "How to get the best from me",        300],
      ].map(([key, label, max]) => (
        <div className="field" key={key}>
          <label htmlFor={"me-" + key}>{label}<span className="hint">{(form[key] || "").length}/{max}</span></label>
          <textarea id={"me-" + key} className="textarea" style={{ minHeight: 72 }} maxLength={max}
            value={form[key] || ""}
            onChange={(e) => set(key, e.target.value)}
            placeholder="Optional…" />
        </div>
      ))}

      {/* contact */}
      <div className="detail-section-label">Contact &amp; Availability</div>
      <div className="field">
        <label htmlFor="me-contact">Preferred contact</label>
        <input id="me-contact" className="input" maxLength={120} value={form.preferred_contact || ""}
          onChange={(e) => set("preferred_contact", e.target.value)}
          placeholder="Email, Teams, etc." />
      </div>
      <div className="field">
        <label htmlFor="me-avail">Best times / availability</label>
        <input id="me-avail" className="input" maxLength={120} value={form.availability || ""}
          onChange={(e) => set("availability", e.target.value)}
          placeholder="e.g. Mon–Thu, mornings preferred" />
      </div>
    </Modal>
  );
}

Object.assign(window, { SignIn, SchemaField, PostQuest, EditMemberCard });
