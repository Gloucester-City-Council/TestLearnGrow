function apiBase() {
  return ((window.SW_CONFIG || {}).API_URL || '/api').replace(/\/$/, '');
}

export async function apiGet(path) {
  const res = await fetch(`${apiBase()}/${path}`, { credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data });
  }
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${apiBase()}/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data });
  }
  return res.json();
}
