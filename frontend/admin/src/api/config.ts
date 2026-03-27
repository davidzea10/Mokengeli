/**
 * URL du backend (sans slash final), ex. `http://localhost:3000`.
 * En **production** (Vercel) : toujours chaîne vide → requêtes vers `/api/...` sur le même domaine
 * (rewrite Vercel → Render) pour éviter CORS.
 * En dev : `VITE_API_BASE_URL` ou vide + proxy Vite vers localhost:3000.
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.PROD) {
    return '';
  }
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw !== 'string' || raw.trim() === '') return '';
  return raw.replace(/\/$/, '');
}

export function isApiConfigured(): boolean {
  return true;
}
