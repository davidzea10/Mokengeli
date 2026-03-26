/** Backend base URL (no trailing slash). Set in `.env`: VITE_API_BASE_URL */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== 'string' || raw.trim() === '') return '';
  return raw.replace(/\/$/, '');
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl() !== '';
}

/**
 * Même valeur que `API_KEY_SIMULATION` côté backend `.env` — requise si `AUTH_DISABLED` n’est pas `true`.
 * Définir dans `.env` du client : VITE_API_KEY_SIMULATION=...
 */
export function getSimulationApiKey(): string {
  const raw = import.meta.env.VITE_API_KEY_SIMULATION;
  if (typeof raw !== 'string') return '';
  return raw.trim();
}
