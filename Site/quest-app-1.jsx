/* =========================================================
   APP — sign-in, post forms, edit member card
   ========================================================= */
const { useState: useS, useEffect: useE } = React;

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
              <strong> Microsoft work account</strong> so that ownership can be verified.
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
              <button className="linklike" onClick={() => setPicking(false)}>Back</button>
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

/* ============ POST EXPERIMENT ============ */
function PostExperiment({ user, challengeId, onClose, onCreate }) {
  const [title, setTitle] = useS("");
  const [question, setQuestion] = useS("");
  const [description, setDescription] = useS("");
  const [methodTags, setMethodTags] = useS([]);
  const [assignSelf, setAssignSelf] = useS(true);
  const [errors, setErrors] = useS({});

  const toggleTag = (tool) => {
    setMethodTags((ts) =>
      ts.includes(tool) ? ts.filter((t) => t !== tool) : ts.length < 5 ? [...ts, tool] : ts
    );
  };

  const validate = () => {
    const e = {};
    if (!title.trim())    e.title    = "Title is required.";
    if (!question.trim()) e.question = "Question is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    onCreate({
      item_id: nano(),
      item_type: "experiment",
      title: title.trim(),
      question: question.trim(),
      description: description.trim(),
      method_tags: methodTags,
      status: "proposed",
      posted_by_name: user.name, posted_by_oid: user.oid,
      team_oids: assignSelf ? [user.oid] : [],
      team_names: assignSelf ? [user.name] : [],
      finding: "", outcome: "",
      challenge_id: challengeId || null,
      xp_reward: 100,
      created_at: now, updated_at: now, closed_at: null,
      updates: [],
    });
  };

  return (
    <Modal title="Propose an Experiment" sub="What are you trying to find out?" onClose={onClose} labelId="post-exp-title"
      foot={<>
        <button className="btn stone" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={submit}><Icon.Beaker style={{ width: 16, height: 16 }} /> Post Experiment</button>
      </>}>

      <div className="locked-field" style={{ marginBottom: 18 }}>
        <Icon.Lock />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Avatar oid={user.oid} name={user.name} cls="mini-avatar" />
          Posting as <strong style={{ color: "var(--ink)" }}>{user.name}</strong>
        </span>
        <span className="lf-label">From session</span>
      </div>

      {challengeId && (
        <div className="locked-field" style={{ marginBottom: 18, borderColor: "var(--gold)", borderStyle: "solid", background: "var(--callout)" }}>
          <Icon.Lightning style={{ color: "var(--amber)" }} />
          <span>Responding to a challenge</span>
        </div>
      )}

      <div className="field">
        <label htmlFor="pe-title">Experiment Title <span className="req" aria-hidden="true">*</span>
          <span className="hint">{title.length}/80</span></label>
        <input id="pe-title" className="input" maxLength={80} value={title}
          onChange={(e) => setTitle(e.target.value)} placeholder="A short, clear title..." />
        {errors.title && <div className="field-error" role="alert">{errors.title}</div>}
      </div>

      <div className="field">
        <label htmlFor="pe-question">What are we trying to find out? <span className="req" aria-hidden="true">*</span>
          <span className="hint">{question.length}/300</span></label>
        <textarea id="pe-question" className="textarea" maxLength={300} value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="If we do X, will Y happen? How does A affect B?..." />
        {errors.question && <div className="field-error" role="alert">{errors.question}</div>}
      </div>

      <div className="field">
        <label htmlFor="pe-desc">Context / method <span className="hint">{description.length}/600</span></label>
        <textarea id="pe-desc" className="textarea" maxLength={600} value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief background, what approach you're planning..." />
      </div>

      <div className="field">
        <label>Method tags <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 13, fontFamily: "var(--font-body)", letterSpacing: 0, textTransform: "none" }}>{methodTags.length}/5 selected</span></label>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 10px" }}>
          Tag the tools or methods this experiment uses. Helps others with matching skills find it.
        </p>
        {SKILLS.map((cat) => (
          <div key={cat.category} className="skill-cat">
            <div className="skill-cat-label">{cat.category}</div>
            <div className="method-tag-picker">
              {cat.tools.map((tool) => {
                const on = methodTags.includes(tool);
                const disabled = !on && methodTags.length >= 5;
                return (
                  <button key={tool} type="button"
                    className={"method-tag-pick" + (on ? " on" : "") + (disabled ? " disabled" : "")}
                    onClick={() => { if (!disabled) toggleTag(tool); }}
                    aria-pressed={on}
                    disabled={disabled}>
                    {tool}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="field">
        <label>Your role in this</label>
        <div className="choice" role="radiogroup" aria-label="Your role in this experiment">
          <button type="button" role="radio" aria-checked={assignSelf}
            className={"choice-opt" + (assignSelf ? " on" : "")} onClick={() => setAssignSelf(true)}>
            <Icon.Hand />
            <span><strong>I am on this team</strong><em>Your name will appear as a team member.</em></span>
          </button>
          <button type="button" role="radio" aria-checked={!assignSelf}
            className={"choice-opt" + (!assignSelf ? " on" : "")} onClick={() => setAssignSelf(false)}>
            <Icon.Flag />
            <span><strong>Post for others to join</strong><em>Leave the team open for others.</em></span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============ POST SESSION ============ */
function PostSession({ user, challengeId, onClose, onCreate }) {
  const [title, setTitle] = useS("");
  const [topic, setTopic] = useS("");
  const [format, setFormat] = useS("remote");
  const [sessionDate, setSessionDate] = useS("");
  const [errors, setErrors] = useS({});

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Title is required.";
    if (!topic.trim()) e.topic = "Topic is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    let parsedDate = null;
    if (sessionDate.trim()) {
      const d = new Date(sessionDate.trim());
      if (!isNaN(d.getTime())) parsedDate = d.toISOString();
    }
    onCreate({
      item_id: nano(),
      item_type: "session",
      title: title.trim(),
      topic: topic.trim(),
      host_name: user.name, host_oid: user.oid,
      session_date: parsedDate,
      format: format,
      attendee_oids: [],
      attendee_names: [],
      output: "",
      status: "proposed",
      challenge_id: challengeId || null,
      xp_reward: 75,
      created_at: now, updated_at: now,
      updates: [],
    });
  };

  return (
    <Modal title="Propose a Session" sub="Bring the network together around a question." onClose={onClose} labelId="post-sess-title"
      foot={<>
        <button className="btn stone" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={submit}><Icon.Calendar style={{ width: 16, height: 16 }} /> Propose Session</button>
      </>}>

      <div className="locked-field" style={{ marginBottom: 18 }}>
        <Icon.Lock />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Avatar oid={user.oid} name={user.name} cls="mini-avatar" />
          Hosting as <strong style={{ color: "var(--ink)" }}>{user.name}</strong>
        </span>
        <span className="lf-label">From session</span>
      </div>

      <div className="field">
        <label htmlFor="ps-title">Session Title <span className="req" aria-hidden="true">*</span>
          <span className="hint">{title.length}/80</span></label>
        <input id="ps-title" className="input" maxLength={80} value={title}
          onChange={(e) => setTitle(e.target.value)} placeholder="A short title for the session..." />
        {errors.title && <div className="field-error" role="alert">{errors.title}</div>}
      </div>

      <div className="field">
        <label htmlFor="ps-topic">What do you want to think about? <span className="req" aria-hidden="true">*</span>
          <span className="hint">{topic.length}/300</span></label>
        <textarea id="ps-topic" className="textarea" maxLength={300} value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="The question, theme, or problem you want to bring to the group..." />
        {errors.topic && <div className="field-error" role="alert">{errors.topic}</div>}
      </div>

      <div className="field">
        <label htmlFor="ps-format">Format</label>
        <select id="ps-format" className="select" value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="remote">Remote</option>
          <option value="in-person">In Person</option>
          <option value="async">Async</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="ps-date">Date (optional)</label>
        <input id="ps-date" className="input" value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          placeholder="e.g. 15 July 2026 or 2026-07-15" />
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>Leave blank if not yet scheduled.</p>
      </div>
    </Modal>
  );
}

/* ============ POST CHALLENGE ============ */
function PostChallenge({ user, onClose, onCreate }) {
  const [title, setTitle] = useS("");
  const [question, setQuestion] = useS("");
  const [errors, setErrors] = useS({});

  const validate = () => {
    const e = {};
    if (!title.trim())    e.title    = "Title is required.";
    if (!question.trim()) e.question = "Question is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const now = new Date().toISOString();
    onCreate({
      item_id: nano(),
      item_type: "challenge",
      title: title.trim(),
      question: question.trim(),
      posted_by_name: user.name, posted_by_oid: user.oid,
      response_ids: [],
      status: "open",
      created_at: now,
    });
  };

  return (
    <Modal title="Post a Challenge" sub="Pose a question to the whole network." onClose={onClose} labelId="post-chal-title"
      foot={<>
        <button className="btn stone" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={submit}><Icon.Lightning style={{ width: 16, height: 16 }} /> Post Challenge</button>
      </>}>

      <div className="locked-field" style={{ marginBottom: 18 }}>
        <Icon.Lock />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Avatar oid={user.oid} name={user.name} cls="mini-avatar" />
          Posting as <strong style={{ color: "var(--ink)" }}>{user.name}</strong>
        </span>
        <span className="lf-label">From session</span>
      </div>

      <div className="field">
        <label htmlFor="pc-title">Challenge Title <span className="req" aria-hidden="true">*</span>
          <span className="hint">{title.length}/80</span></label>
        <input id="pc-title" className="input" maxLength={80} value={title}
          onChange={(e) => setTitle(e.target.value)} placeholder="A short, memorable title..." />
        {errors.title && <div className="field-error" role="alert">{errors.title}</div>}
      </div>

      <div className="field">
        <label htmlFor="pc-question">The challenge question <span className="req" aria-hidden="true">*</span>
          <span className="hint">{question.length}/500</span></label>
        <textarea id="pc-question" className="textarea" maxLength={500} value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How might we...? What would happen if...? What's the best way to...?" />
        {errors.question && <div className="field-error" role="alert">{errors.question}</div>}
      </div>
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

      <div className="field">
        <label htmlFor="me-role">Role / Team<span className="hint">{(form.role_team || "").length}/80</span></label>
        <input id="me-role" className="input" maxLength={80} value={form.role_team || ""}
          onChange={(e) => set("role_team", e.target.value)}
          placeholder="e.g. Senior Analyst, Digital Transformation" />
      </div>

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
            placeholder="Optional..." />
        </div>
      ))}

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
          placeholder="e.g. Mon-Thu, mornings preferred" />
      </div>
    </Modal>
  );
}

Object.assign(window, { SignIn, PostExperiment, PostSession, PostChallenge, EditMemberCard });
