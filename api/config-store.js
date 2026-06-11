/* Server-side handling of the config.json blob: validation, redaction,
   and the minimal defaults the API itself needs (points values, admins).
   The full presentation defaults (branding, terminology, theme, skills)
   live client-side in Site/v2/js/config-loader.js — the API only stores
   overrides and never needs them. */

const { ratio } = require('./contrast');
const { DEFAULT_VALUES } = require('./points');

const KNOWN_KEYS = [
  'schema_version', 'branding', 'terminology', 'theme',
  'points', 'skills', 'features', 'admins', 'demo',
];

/* Theme contrast requirements (WCAG 2.2 AAA): text pairs 7:1, non-text 3:1. */
const TEXT_PAIRS = [
  ['text', 'bg'], ['text', 'surface'],
  ['text_secondary', 'bg'], ['text_secondary', 'surface'],
  ['link', 'bg'], ['link', 'surface'],
];
const UI_PAIRS = [['focus', 'bg']];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/* The effective config as the API sees it: stored doc over API-side defaults. */
function effectiveConfig(stored) {
  const doc = stored || {};
  return {
    ...doc,
    points: {
      enabled: doc.points ? doc.points.enabled !== false : true,
      values: { ...DEFAULT_VALUES, ...((doc.points && doc.points.values) || {}) },
      ranks: (doc.points && doc.points.ranks) || [],
    },
    admins: Array.isArray(doc.admins) ? doc.admins : [],
  };
}

/* What GET /api/config returns: the stored overrides without the admin list.
   The client merges this over its own DEFAULT_CONFIG; it learns its own
   admin status from /api/me only. */
function redactConfig(stored) {
  const doc = { ...(stored || {}) };
  delete doc.admins;
  return doc;
}

function validateTheme(theme, errors) {
  for (const mode of Object.keys(theme)) {
    const palette = theme[mode];
    if (!palette || typeof palette !== 'object') {
      errors.push(`theme.${mode} must be an object of colour tokens`);
      continue;
    }
    for (const [token, value] of Object.entries(palette)) {
      if (!HEX_RE.test(String(value))) {
        errors.push(`theme.${mode}.${token} must be a six-digit hex colour, got "${value}"`);
      }
    }
    for (const [fg, bg] of TEXT_PAIRS) {
      if (palette[fg] && palette[bg]) {
        const r = ratio(palette[fg], palette[bg]);
        if (r !== null && r < 7) {
          errors.push(`theme.${mode}: "${fg}" on "${bg}" is ${r.toFixed(1)}:1 — text needs at least 7:1`);
        }
      }
    }
    for (const [fg, bg] of UI_PAIRS) {
      if (palette[fg] && palette[bg]) {
        const r = ratio(palette[fg], palette[bg]);
        if (r !== null && r < 3) {
          errors.push(`theme.${mode}: "${fg}" on "${bg}" is ${r.toFixed(1)}:1 — focus indicators need at least 3:1`);
        }
      }
    }
  }
}

/* Validates a config document posted by an admin. Returns { ok, errors }. */
function validateConfig(doc) {
  const errors = [];
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return { ok: false, errors: ['Config must be a JSON object'] };
  }
  for (const key of Object.keys(doc)) {
    if (!KNOWN_KEYS.includes(key)) errors.push(`Unknown top-level key "${key}"`);
  }
  if (doc.branding && typeof doc.branding !== 'object') errors.push('branding must be an object');
  if (doc.terminology && typeof doc.terminology !== 'object') errors.push('terminology must be an object');

  if (doc.theme) {
    if (typeof doc.theme !== 'object') errors.push('theme must be an object');
    else validateTheme(doc.theme, errors);
  }

  if (doc.points) {
    const values = doc.points.values || {};
    for (const [k, v] of Object.entries(values)) {
      if (typeof v !== 'number' || !(v >= 0)) errors.push(`points.values.${k} must be a number of 0 or more`);
    }
    if (doc.points.ranks !== undefined) {
      if (!Array.isArray(doc.points.ranks)) errors.push('points.ranks must be an array');
      else {
        let prev = -1;
        for (const r of doc.points.ranks) {
          if (!r || typeof r.min !== 'number' || typeof r.label !== 'string' || !r.label.trim()) {
            errors.push('each rank needs a numeric "min" and a non-empty "label"');
            break;
          }
          if (r.min <= prev) { errors.push('rank "min" values must increase'); break; }
          prev = r.min;
        }
      }
    }
  }

  if (doc.skills !== undefined && doc.skills !== null) {
    if (!Array.isArray(doc.skills)) errors.push('skills must be an array of { category, tools }');
    else {
      for (const s of doc.skills) {
        if (!s || typeof s.category !== 'string' || !Array.isArray(s.tools)) {
          errors.push('each skills entry needs a "category" string and a "tools" array');
          break;
        }
      }
    }
  }

  if (doc.admins !== undefined) {
    if (!Array.isArray(doc.admins) || doc.admins.some((a) => typeof a !== 'string' || !a.trim())) {
      errors.push('admins must be an array of email addresses (or oids)');
    }
    /* Lock-out guard: the ADMIN_EMAILS env var is always honoured, so an
       empty in-config list is only fatal when no bootstrap admins exist. */
    if (Array.isArray(doc.admins) && doc.admins.length === 0 &&
        !String(process.env.ADMIN_EMAILS || '').trim()) {
      errors.push('admins cannot be emptied: no bootstrap ADMIN_EMAILS are configured, this would lock everyone out');
    }
  }

  return { ok: errors.length === 0, errors };
}

module.exports = { effectiveConfig, redactConfig, validateConfig, KNOWN_KEYS };
