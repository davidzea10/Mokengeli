import { getApiBaseUrl } from './config';

export async function getJson(path: string, searchParams?: Record<string, string>): Promise<Response> {
  const base = getApiBaseUrl();
  const pathPart = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${pathPart}`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v);
    }
  }
  return fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
}

export async function postJson(path: string, body: unknown): Promise<Response> {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function patchJson(path: string, body: unknown): Promise<Response> {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/** POST JSON when API is configured; otherwise no-op. Network errors are logged, not thrown. */
export async function postJsonIfConfigured(path: string, body: unknown): Promise<void> {
  if (!getApiBaseUrl()) return;
  try {
    const res = await postJson(path, body);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[Mokengeli API] ${path} → HTTP ${res.status}`, text);
    }
  } catch (err) {
    console.warn(`[Mokengeli API] ${path} → network error`, err);
  }
}
