/* First-connect prompt. Nothing is ever created automatically: a
   signed-in account with no member record is redirected once per
   session to the card editor, where no record exists until they
   deliberately submit. After that one prompt, the board's
   "create your profile" next step takes over. */

const FLAG_PREFIX = 'sw::card-prompted::';

function promptedAlready(oid) {
  try { return Boolean(sessionStorage.getItem(FLAG_PREFIX + oid)); } catch { return false; }
}

function markPrompted(oid) {
  try { sessionStorage.setItem(FLAG_PREFIX + oid, '1'); } catch { /* ignore */ }
}

/* Returns true when the caller should stop rendering because we are
   redirecting to the card editor. */
export function promptCardCreation(session) {
  if (!session || !session.authenticated) return false;
  if (promptedAlready(session.oid)) return false;
  markPrompted(session.oid);
  location.href = 'member-edit.html';
  return true;
}
