import { getApiBaseUrl, isApiConfigured } from './config';

/** Ligne renvoyée par GET /api/v1/admin/transactions (structure flexible selon Supabase). */
export interface AdminTransactionRow {
  id: string;
  numero_transaction?: string | null;
  date_transaction?: string | null;
  montant?: number | null;
  devise?: string | null;
  type_transaction?: string | null;
  canal?: string | null;
  client_id?: string | null;
  /** Compte débité pour l’opération (req.md : JOIN comptes_bancaires ON cb.id = t.compte_id). */
  compte_id?: string | null;
  /** Rempli par l’API après enrichissement (numero_compte du débit). */
  debit_compte?: {
    id?: string;
    numero_compte?: string | null;
    devise_compte?: string | null;
    est_compte_principal?: boolean | null;
  } | null;
  session_id?: string | null;
  beneficiaire_id?: string | null;
  reference_beneficiaire?: string | null;
  raw_payload?: Record<string, unknown> | null;
  clients?:
    | {
        reference_client?: string | null;
        nom_complet?: string | null;
        email?: string | null;
        telephone?: string | null;
        comptes_bancaires?:
          | { numero_compte?: string | null; est_compte_principal?: boolean | null; devise_compte?: string | null }
          | Array<{ numero_compte?: string | null; est_compte_principal?: boolean | null; devise_compte?: string | null }>
          | null;
      }
    | Array<{
        reference_client?: string | null;
        nom_complet?: string | null;
        email?: string | null;
        telephone?: string | null;
        comptes_bancaires?:
          | { numero_compte?: string | null; est_compte_principal?: boolean | null; devise_compte?: string | null }
          | Array<{ numero_compte?: string | null; est_compte_principal?: boolean | null; devise_compte?: string | null }>
          | null;
      }>
    | null;
  /** Ligne jointe `public.beneficiaires` (FK `transactions.beneficiaire_id`). */
  beneficiaires?:
    | {
        id?: string | null;
        mode?: string | null;
        compte_identifiant?: string | null;
        banque_code?: string | null;
        titulaire_compte?: string | null;
        telephone?: string | null;
        operateur_mobile?: string | null;
        nom_complet?: string | null;
        numero_compte?: string | null;
        type_canal?: string | null;
        banque_nom?: string | null;
      }
    | Array<{
        id?: string | null;
        mode?: string | null;
        compte_identifiant?: string | null;
        banque_code?: string | null;
        titulaire_compte?: string | null;
        telephone?: string | null;
        operateur_mobile?: string | null;
        nom_complet?: string | null;
        numero_compte?: string | null;
        type_canal?: string | null;
        banque_nom?: string | null;
      }>
    | null;
  /** Ligne jointe `public.sessions` (FK `transactions.session_id`). */
  sessions?: Record<string, unknown> | Record<string, unknown>[] | null;
  scores_evaluation?:
    | {
        decision?: string | null;
        score_combine?: number | null;
        score_modele_transaction?: number | null;
        score_modele_session?: number | null;
        score_modele_comportement?: number | null;
      }
    | Array<{
        decision?: string | null;
        score_combine?: number | null;
        score_modele_transaction?: number | null;
        score_modele_session?: number | null;
        score_modele_comportement?: number | null;
      }>
    | null;
}

export interface AdminTransactionsResponse {
  items: AdminTransactionRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type AdminTransactionsResult =
  | { ok: true; data: AdminTransactionsResponse }
  | { ok: false; message: string; code?: string };

/**
 * GET /api/v1/admin/transactions
 */
export async function fetchAdminTransactions(params?: {
  page?: number;
  limit?: number;
  /** Recherche texte (numéro, réf. bénéficiaire, réf. client — côté serveur). */
  q?: string;
  type?: string;
  status?: string;
  signal?: AbortSignal;
}): Promise<AdminTransactionsResult> {
  if (!isApiConfigured()) {
    return { ok: false, message: 'Configuration API indisponible' };
  }
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const base = getApiBaseUrl();
  const path = '/api/v1/admin/transactions';
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  sp.set('limit', String(limit));
  if (params?.q?.trim()) sp.set('q', params.q.trim());
  if (params?.type && params.type !== 'all') sp.set('type', params.type);
  if (params?.status && params.status !== 'all') sp.set('status', params.status);
  const qs = sp.toString();
  const url = `${base}${path}?${qs}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: params?.signal,
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: AdminTransactionsResponse;
      error?: { message?: string; code?: string };
    };
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        message: json.error?.message || `Erreur HTTP ${res.status}`,
        code: json.error?.code,
      };
    }
    const data = json.data;
    if (!data || !Array.isArray(data.items)) {
      return { ok: false, message: 'Réponse serveur invalide (items manquants)' };
    }
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, message: msg };
  }
}

export interface AdminAlertItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  time: string;
  transactionId?: string;
}

export interface AdminAlertsStats {
  pending: number;
  confirmedFraud: number;
  falsePositives: number;
}

export interface AdminAlertsResponse {
  items: AdminAlertItem[];
  total: number;
  stats: AdminAlertsStats;
}

export type AdminAlertsResult =
  | { ok: true; data: AdminAlertsResponse }
  | { ok: false; message: string; code?: string };

/**
 * GET /api/v1/admin/alerts — table `alerts` si présente, sinon liste vide.
 */
export async function fetchAdminAlerts(): Promise<AdminAlertsResult> {
  if (!isApiConfigured()) {
    return { ok: false, message: 'Configuration API indisponible' };
  }
  const base = getApiBaseUrl();
  const url = `${base}/api/v1/admin/alerts`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: AdminAlertsResponse;
      error?: { message?: string; code?: string };
    };
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        message: json.error?.message || `Erreur HTTP ${res.status}`,
        code: json.error?.code,
      };
    }
    const data = json.data;
    if (!data || !Array.isArray(data.items)) {
      return { ok: false, message: 'Réponse serveur invalide (alertes)' };
    }
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, message: msg };
  }
}
