import { requireSignIn } from '../auth.js';
import { loadConfig } from '../config-loader.js';
import { loadMembers, loadLeaderboard, rankFor } from '../data.js';
import { el, moveFocus } from '../dom.js';

function initials(name) {
  return (name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

async function init() {
  const session = await requireSignIn();
  if (!session) return;

  const params = new URLSearchParams(location.search);
  const oid = params.get('id');
  if (!oid) { renderNotFound(); return; }

  const config = await loadConfig();

  let member, lb;
  try {
    const [members, leaderboard] = await Promise.all([loadMembers(), loadLeaderboard()]);
    member = members.find((m) => m.oid === oid);
    lb = leaderboard;
  } catch (err) {
    renderError(err);
    return;
  }

  if (!member) { renderNotFound(); return; }

  renderMember(member, lb, config, session);
}

function renderMember(member, lb, config, session) {
  const main = document.getElementById('member-content');
  if (!main) return;

  const orgName = (config.branding || {}).org_name || 'Activity Board';
  document.title = `${member.name} — ${orgName}`;
  const h1 = document.getElementById('page-title');
  if (h1) h1.textContent = member.name;
  const bc = document.getElementById('breadcrumb-current');
  if (bc) bc.textContent = member.name;

  const frag = document.createDocumentFragment();

  /* Avatar + name */
  const profile = el('div', { class: 'member-card', style: 'margin-bottom: 2rem' });
  profile.appendChild(el('span', { class: 'member-avatar', 'aria-hidden': 'true', style: 'width:4rem;height:4rem;font-size:1.5rem' }, initials(member.name)));
  const info = el('div', { class: 'member-info' });
  info.appendChild(el('p', { class: 'card-meta', text: member.email || '' }));

  /* Points & rank */
  const pts = config.points;
  if (pts && pts.enabled) {
    const entry = lb[member.oid];
    const xp = entry ? entry.xp : 0;
    const rank = rankFor(xp, pts.ranks);
    const ptsName = (config.terminology || {}).points_name || 'points';
    info.appendChild(el('p', { class: 'card-meta' },
      `${xp} ${ptsName}`,
      rank ? el('span', { class: 'rank-badge', text: ` · ${rank}` }) : '',
    ));
  }

  profile.appendChild(info);
  frag.appendChild(profile);

  /* Edit link for own profile */
  if (session.oid === member.oid || session.isAdmin) {
    frag.appendChild(el('p', null,
      el('a', { href: `member-edit.html?id=${encodeURIComponent(member.oid)}`, class: 'btn btn-secondary' },
        'Edit profile'),
    ));
  }

  /* Skills */
  if (member.expertise && member.expertise.length) {
    frag.appendChild(el('h2', { text: 'Expertise' }));
    const tagList = el('ul', { class: 'tag-list', role: 'list' });
    for (const tag of member.expertise) tagList.appendChild(el('li', { class: 'tag', text: tag }));
    frag.appendChild(tagList);
  }

  if (member.stretch && member.stretch.length) {
    frag.appendChild(el('h2', { text: 'Learning goals' }));
    const tagList = el('ul', { class: 'tag-list', role: 'list' });
    for (const tag of member.stretch) tagList.appendChild(el('li', { class: 'tag', text: tag }));
    frag.appendChild(tagList);
  }

  if (member.talk_about && member.talk_about.length) {
    frag.appendChild(el('h2', { text: 'Ask me about' }));
    const list = el('ul', { role: 'list' });
    for (const item of member.talk_about) list.appendChild(el('li', { text: item }));
    frag.appendChild(list);
  }

  main.replaceChildren(frag);
  moveFocus(document.getElementById('page-title'));
}

function renderNotFound() {
  const main = document.getElementById('member-content');
  if (!main) return;
  main.replaceChildren(
    el('p', { class: 'empty-state', text: 'Member not found.' }),
    el('a', { href: 'members.html', text: 'Back to members' }),
  );
}

function renderError(err) {
  const main = document.getElementById('member-content');
  if (!main) return;
  main.replaceChildren(
    el('div', { class: 'status-message status-message--error', role: 'alert' },
      el('p', { text: `Failed to load member: ${err.message}` }),
    ),
  );
}

init();
