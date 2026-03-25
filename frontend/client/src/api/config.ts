/** Backend base URL (no trailing slash). Set in `.env`: VITE_API_BASE_URL */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== 'string' || raw.trim() === '') return '';
  return raw.replace(/\/$/, '');
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl() !== '';
}
