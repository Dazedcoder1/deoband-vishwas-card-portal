// Tiny fetch wrapper. Base URL comes from VITE_API_URL in the shared root .env.
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'vishwas.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = 'GET', body, form, raw } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError('Cannot reach the server. Check your internet connection or that the backend is running.', 0);
  }

  if (res.status === 401 && token) {
    tokenStore.clear();
    window.dispatchEvent(new Event('vishwas:logout'));
  }
  if (raw && res.ok) return res;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data);
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  postForm: (p, form) => request(p, { method: 'POST', form }),
  patchForm: (p, form) => request(p, { method: 'PATCH', form }),

  /** Download a protected file (PDF / CSV) with the auth header and save it. */
  async download(path, fallbackName) {
    const res = await request(path, { raw: true });
    const cd = res.headers.get('Content-Disposition') || '';
    const name = /filename="([^"]+)"/.exec(cd)?.[1] || fallbackName;
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  /** Open a protected PDF in a new tab (used for "Print PVC Card"). */
  async openPdf(path) {
    const win = window.open('', '_blank');
    const res = await request(path, { raw: true });
    const url = URL.createObjectURL(await res.blob());
    if (win) win.location.href = url;
    else window.location.href = url;
  },
};

export const HELPLINE = import.meta.env.VITE_HELPLINE || '1800-120-DEOBAND';
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'help@deobandvishwas.org';
