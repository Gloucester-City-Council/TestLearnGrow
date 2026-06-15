import { apiGet } from './api.js';

export const DEFAULT_CONFIG = {
  schema_version: 1,
  branding: {
    org_name: 'Activity Board',
    tagline: '',
    intro_text: '',
  },
  terminology: {
    items: {
      experiment: { singular: 'Experiment', plural: 'Experiments' },
      session:    { singular: 'Session',    plural: 'Sessions' },
      challenge:  { singular: 'Challenge',  plural: 'Challenges' },
    },
    points_name: 'points',
    members_name: 'Members',
    board_name: 'Board',
  },
  theme: {
    light: {
      bg: '#FFFFFF', surface: '#F4F4F1', text: '#1B1B20',
      text_secondary: '#3F3F49', link: '#1A4480', focus: '#1A4480',
    },
    dark: {
      bg: '#16161A', surface: '#1E1E24', text: '#F2F2F4',
      text_secondary: '#BBBBC2', link: '#A9C7FF', focus: '#A9C7FF',
    },
  },
  points: {
    enabled: true,
    values: {
      experiment_complete: 100,
      session_host: 75,
      session_attend: 25,
      challenge_post: 25,
    },
    ranks: [
      { min: 0,    label: 'Member' },
      { min: 100,  label: 'Contributor' },
      { min: 500,  label: 'Regular' },
      { min: 1500, label: 'Leader' },
    ],
  },
  features: {
    leaderboard: true,
    members: true,
    challenges: true,
    sessions: true,
  },
  /* Skills & Tools catalogue for the profile-card toolkit. Each tool can be
     marked on a member's card as a strength, something they'll mentor, or a
     stretch goal. White-label: override `skills` in server/window config. */
  skills: [
    { category: 'Strategy & Direction', tools: [
      'Vision, storytelling, narrative, case for change',
      'Design principles',
      'Blueprints, target operating models, future state mapping',
    ] },
    { category: 'Insight & Diagnosis', tools: [
      'Root cause analysis',
      'Fishbone / cause and effect analysis',
      '5 whys',
      'Process mapping',
      'Journey mapping',
      'Demand reduction',
      'Value mapping',
      'Data & analysis',
      'Dashboards',
      'KPIs & measures',
      'Integration',
    ] },
    { category: 'Design & Innovation', tools: [
      'User stories',
      'Architecture (service, data, technology)',
      'Pilots',
      'Prototypes',
      'Hackathons',
      'AI',
      'Power Apps',
      'Digital development',
    ] },
    { category: 'Delivery & Execution', tools: [
      'Cadence',
      'Kanban',
      'Scrums',
      'Sprints',
      'Stand ups',
      'Reviews',
      'Retros',
      'Project, programme and change management',
      'Risk identification, analysis and management',
      'Benefits realisation',
    ] },
    { category: 'People & Culture', tools: [
      'Peer challenge',
      'Coaching and mentoring',
      'Behavioural frameworks',
      'Psychological safety practices',
    ] },
  ],
};

let _config = null;

export async function loadConfig() {
  if (_config) return _config;
  let serverConfig = {};
  try {
    serverConfig = (await apiGet('config')) || {};
  } catch { /* server config is optional */ }
  const winOverride = ((window.SW_CONFIG || {}).config) || {};
  _config = deepMerge(deepMerge(DEFAULT_CONFIG, serverConfig), winOverride);
  return _config;
}

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  const out = { ...target };
  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = target[k];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)
        && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      out[k] = deepMerge(tv, sv);
    } else if (sv !== undefined) {
      out[k] = sv;
    }
  }
  return out;
}

/* Terminology lookup: t(config, 'items.experiment.plural') → 'Experiments' */
export function t(config, path) {
  const parts = path.split('.');
  let node = config.terminology;
  for (const p of parts) {
    if (!node || typeof node !== 'object') return path;
    node = node[p];
  }
  return typeof node === 'string' ? node : path;
}

/* Apply config-overridden theme tokens and org name to the current page */
export function applyTheme(config) {
  const scheme = document.documentElement.getAttribute('data-theme')
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const theme = ((config.theme || {})[scheme]) || {};
  const map = {
    bg:             '--color-bg',
    surface:        '--color-surface',
    text:           '--color-text',
    text_secondary: '--color-text-secondary',
    link:           '--color-link',
    focus:          '--color-focus',
  };
  for (const [k, prop] of Object.entries(map)) {
    if (theme[k]) document.documentElement.style.setProperty(prop, theme[k]);
  }
  const orgName = (config.branding || {}).org_name || DEFAULT_CONFIG.branding.org_name;
  const sep = document.title.lastIndexOf(' — ');
  if (sep > -1) document.title = document.title.slice(0, sep) + ' — ' + orgName;
  const el = document.getElementById('site-name');
  if (el) el.textContent = orgName;
}
