/* DOM helpers — el() never uses innerHTML, preventing XSS from user-supplied data */

export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') {
        node.className = v;
      } else if (k === 'dataset') {
        for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = String(dv);
      } else if (k.startsWith('on') && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'text') {
        node.textContent = v;
      } else if (typeof v === 'boolean') {
        if (v) node.setAttribute(k, '');
        else node.removeAttribute(k);
      } else {
        node.setAttribute(k, String(v));
      }
    }
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      node.appendChild(child);
    }
  }
  return node;
}

/* Replace region children and optionally focus a heading inside it */
export function renderRegion(id, renderFn) {
  const region = document.getElementById(id);
  if (!region) return;
  region.replaceChildren(renderFn());
}

/* Announce a message to screen readers via the shared live region */
export function announce(msg) {
  const region = document.getElementById('live-region');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    region.textContent = msg;
  }));
}

/* Move keyboard focus to an element, making it programmatically focusable */
export function moveFocus(element) {
  if (!element) return;
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
  element.focus({ preventScroll: false });
}

/* Build a status chip element */
export function chipEl(label, variant) {
  return el('span', { class: `chip chip-${variant}` }, label);
}

/* Build a decorative loading skeleton. Hidden from assistive tech — pair with
   announce('Loading…') so screen-reader users still get a status update.
   `parts` is an array of: 'title' | 'line' | 'short' | 'block'. */
export function skeleton(parts = ['title', 'line', 'line', 'short']) {
  const cls = {
    title: 'skeleton skeleton-line skeleton-line--title',
    short: 'skeleton skeleton-line skeleton-line--short',
    block: 'skeleton skeleton-block',
    line:  'skeleton skeleton-line',
  };
  const wrap = el('div', { class: 'skeleton-group', 'aria-hidden': 'true' });
  for (const p of parts) wrap.appendChild(el('div', { class: cls[p] || cls.line }));
  return wrap;
}

/* Chip variant from item status */
export function statusVariant(status) {
  const map = {
    open: 'blue',
    running: 'blue',
    scheduled: 'blue',
    designing: 'neutral',
    'wrapping-up': 'amber',
    happened: 'neutral',
    parked: 'neutral',
    'finding-shared': 'green',
    'output-shared': 'green',
    growing: 'green',
    scaled: 'green',
    closed: 'neutral',
  };
  return map[status] || 'neutral';
}

/* Human-readable label for an item status. The stored status is a machine
   value (e.g. 'finding-shared'); never show that to a user. Unknown values are
   prettified (hyphens → spaces, first letter capitalised) so a new status can
   never leak as raw machine casing. */
export function statusLabel(status) {
  const map = {
    open: 'Open',
    running: 'Running',
    scheduled: 'Scheduled',
    designing: 'Designing',
    'wrapping-up': 'Wrapping up',
    happened: 'Held',
    parked: 'Parked',
    'finding-shared': 'Finding shared',
    'output-shared': 'Output shared',
    growing: 'Growing',
    scaled: 'Scaled',
    closed: 'Closed',
  };
  if (map[status]) return map[status];
  if (!status) return 'Unknown';
  const words = String(status).replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Unknown';
}
