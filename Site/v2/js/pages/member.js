import { requireSignIn } from '../auth.js';
import { loadConfig } from '../config-loader.js';
import { loadMembers, loadLeaderboard, rankFor } from '../data.js';
import { el, moveFocus } from '../dom.js';
import { buildGuildCard, isCardBlank } from '../guild-card.js';

async function init() {
  const session = await requireSignIn();
  if (!session) return;

  const params = new URLSearchParams(location.search);
  const oid = params.get('id') || session.oid;

  const config = await loadConfig();
  const pointsOn = config.points && config.points.enabled;

  let member, lb;
  try {
    const [members, leaderboard] = await Promise.all([
      loadMembers(),
      pointsOn ? loadLeaderboard().catch(() => ({})) : Promise.resolve({}),
    ]);
    member = members.find((m) => m.oid === oid);
    lb = leaderboard;
  } catch (err) {
    renderError(err);
    return;
  }

  if (!member) {
    /* Own card doesn't exist yet — go create it */
    if (oid === session.oid) {
      location.replace('member-edit.html');
      return;
    }
    renderNotFound();
    return;
  }

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

  const isMe = session.oid === member.oid;
  const frag = document.createDocumentFragment();

  /* Edit link — own card or admin; blank own cards get the button inside the card */
  if ((isMe || session.isAdmin) && !(isMe && isCardBlank(member))) {
    frag.appendChild(el('p', null,
      el('a', { href: `member-edit.html?id=${encodeURIComponent(member.oid)}`, class: 'btn btn-secondary' },
        isMe ? 'Edit my guild card' : `Edit guild card for ${member.name}`),
    ));
  }

  let rankLine = '';
  const pts = config.points;
  if (pts && pts.enabled) {
    const entry = lb[member.oid];
    const xp = entry && typeof entry.xp === 'number' ? entry.xp : 0;
    const rank = rankFor(xp, pts.ranks);
    const ptsName = (config.terminology || {}).points_name || 'points';
    rankLine = `${rank ? `${rank} · ` : ''}${xp} ${ptsName}`;
  }

  frag.appendChild(buildGuildCard(member, {
    rankLine,
    isMe,
    headingTag: 'h2',
    completeHref: `member-edit.html?id=${encodeURIComponent(member.oid)}`,
  }));

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
