import {
  buildTransactionFromClientForm,
  buildBeneficiarySummary,
  buildEvaluateTransactionBody,
  isMobileRecipientForm,
  type ClientFormLike,
} from './buildTransactionPayload';
import type {
  ClientLoginBody,
  ClientLogoutBody,
  ClientTransactionSimulationEnvelope,
} from './contracts';
import { API_ROUTES } from './contracts';
import { getSimulationApiKey, isApiConfigured } from './config';
import { getJson, patchJson, postJson, postJsonIfConfigured } from './http';

function logJsonPayload(operation: string, payload: unknown): void {
  console.log(`[Mokengeli API] ${operation}`, JSON.stringify(payload, null, 2));
}

/**
 * Client portal login — logs JSON then POST if `VITE_API_BASE_URL` is set.
 * In production use HTTPS; do not log passwords in clear.
 */
export async function sendClientLogin(input: { name: string; password: string }): Promise<void> {
  const payload: ClientLoginBody = {
    name: input.name,
    password: input.password,
    client_sent_at: new Date().toISOString(),
  };
  logJsonPayload(`POST ${API_ROUTES.clientLogin}`, payload);
  if (!isApiConfigured()) {
    console.info('[Mokengeli API] VITE_API_BASE_URL not set — network send skipped (frontend only).');
    return;
  }
  await postJsonIfConfigured(API_ROUTES.clientLogin, payload);
}

export async function sendClientLogout(body: Omit<ClientLogoutBody, 'client_sent_at'>): Promise<void> {
  const payload: ClientLogoutBody = {
    ...body,
    client_sent_at: new Date().toISOString(),
  };
  logJsonPayload(`POST ${API_ROUTES.clientLogout}`, payload);
  if (!isApiConfigured()) {
    console.info('[Mokengeli API] VITE_API_BASE_URL not set — network send skipped (frontend only).');
    return;
  }
  await postJsonIfConfigured(API_ROUTES.clientLogout, payload);
}

export interface SendTransactionSimulationParams {
  profileId: string;
  userDisplayName: string;
  accountBalance: number;
  form: ClientFormLike;
}

/**
 * Transaction simulation — JSON aligned with docs/transaction_schema.json (`transaction` object, English keys).
 */
export async function sendClientTransactionSimulation(
  params: SendTransactionSimulationParams
): Promise<void> {
  const transactionNumber = `TXN-CLIENT-${Date.now()}`;
  const transaction = buildTransactionFromClientForm(
    params.form,
    params.profileId,
    transactionNumber
  );

  const envelope: ClientTransactionSimulationEnvelope = {
    kind: 'client_transaction_simulation',
    profile_id: params.profileId,
    user_display_name: params.userDisplayName,
    client_sent_at: new Date().toISOString(),
    beneficiary: buildBeneficiarySummary(params.form),
    account_balance_snapshot: params.accountBalance,
    transaction,
  };

  logJsonPayload(`POST ${API_ROUTES.clientTransactionSimulate}`, envelope);
  if (!isApiConfigured()) {
    console.info('[Mokengeli API] VITE_API_BASE_URL not set — network send skipped (frontend only).');
    return;
  }
  await postJsonIfConfigured(API_ROUTES.clientTransactionSimulate, envelope);
}

export interface LoginApiClient {
  id: string;
  reference_client: string;
  nom_complet: string | null;
  email: string | null;
}

export interface LoginApiResult {
  ok: true;
  reference_client: string;
  client: LoginApiClient;
}

export interface LoginApiError {
  ok: false;
  message: string;
  code?: string;
}

/**
 * Étape 1 — POST /api/v1/client/login (réponse JSON parsée).
 */
export async function loginWithApi(
  name: string,
  password: string
): Promise<LoginApiResult | LoginApiError> {
  if (!isApiConfigured()) {
    return { ok: false, message: 'VITE_API_BASE_URL non défini' };
  }
  try {
    const body: ClientLoginBody = {
      name,
      password,
      client_sent_at: new Date().toISOString(),
    };
    const res = await postJson(API_ROUTES.clientLogin, body);
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { reference_client: string; client: LoginApiClient; next_step?: string };
      error?: { message?: string; code?: string };
    };
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        message: json.error?.message || `Erreur HTTP ${res.status}`,
        code: json.error?.code,
      };
    }
    if (!json.data?.reference_client || !json.data?.client) {
      return { ok: false, message: 'Réponse serveur invalide' };
    }
    return {
      ok: true,
      reference_client: json.data.reference_client,
      client: json.data.client,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, message: msg };
  }
}

export interface CarteData {
  carte_id: string;
  compte_id: string;
  numero_affiche: string;
  type_carte: string | null;
  date_expiration: string | null;
  statut: string | null;
}

export interface CompteData {
  compte_id: string;
  numero_compte: string;
  devise: string;
  libelle: string | null;
  est_compte_principal: boolean;
  solde_disponible: number | null;
  date_ouverture?: string | null;
  cartes: CarteData[];
}

export interface MeContextData {
  client: {
    id: string;
    reference_client: string;
    nom_complet: string | null;
    email: string | null;
    telephone: string | null;
    adresse_physique?: string | null;
    ville?: string | null;
    pays?: string | null;
    date_creation?: string | null;
    date_mise_a_jour?: string | null;
  };
  comptes: CompteData[];
  solde_total: number;
}

/**
 * Étape 1 — GET /api/v1/me?reference_client=
 */
export async function fetchMeContext(
  referenceClient: string
): Promise<{ ok: true; data: MeContextData } | LoginApiError> {
  if (!isApiConfigured()) {
    return { ok: false, message: 'VITE_API_BASE_URL non défini' };
  }
  try {
    const res = await getJson('/api/v1/me', { reference_client: referenceClient });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: MeContextData;
      error?: { message?: string; code?: string };
    };
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        message: json.error?.message || `Erreur HTTP ${res.status}`,
        code: json.error?.code,
      };
    }
    if (!json.data) {
      return { ok: false, message: 'Réponse serveur invalide' };
    }
    return { ok: true, data: json.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, message: msg };
  }
}

/** Réponse POST /api/v1/transactions/evaluate (champ data). */
export interface EvaluateTransactionApiData {
  scoring: {
    score_m1_transaction?: number;
    score_m2_session?: number;
    score_m3_behavior?: number;
    score_combined?: number;
    decision?: string;
    reason_codes?: string[];
    m1_model?: string | null;
    m1_fallback?: boolean;
    m1_label?: string | null;
    [key: string]: unknown;
  };
  features_preview?: string;
  persistence?: {
    status: string;
    reason?: string;
    transaction_id?: string;
    numero_transaction?: string;
  };
}

export interface CreateBeneficiaireOk {
  ok: true;
  id: string;
}

/**
 * Crée un bénéficiaire (banque ou mobile money). En cas d’indisponibilité BDD (503), retour ok: false sans bloquer l’évaluation.
 */
export async function createBeneficiaireApi(
  form: ClientFormLike
): Promise<CreateBeneficiaireOk | { ok: false; skipped: true } | LoginApiError> {
  if (!isApiConfigured()) {
    return { ok: false, skipped: true };
  }
  const body = isMobileRecipientForm(form)
    ? {
        mode: 'mobile_money' as const,
        telephone: form.ben_telephone.trim(),
        operateur_mobile: form.ben_operateur.trim() || undefined,
      }
    : {
        mode: 'compte_bancaire' as const,
        compte_identifiant: form.ben_compte_identifiant.trim(),
        banque_code: form.ben_banque_code.trim() || undefined,
        titulaire_compte: form.ben_titulaire.trim() || undefined,
      };

  try {
    const res = await postJson(API_ROUTES.beneficiaires, body);
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { id?: string };
      error?: { message?: string; code?: string };
    };
    if (res.status === 503) {
      return { ok: false, skipped: true };
    }
    if (!res.ok || json.success === false) {
      if (res.status >= 500) {
        return { ok: false, skipped: true };
      }
      return {
        ok: false,
        message: json.error?.message || `Erreur création bénéficiaire (${res.status})`,
        code: json.error?.code,
      };
    }
    const id = json.data?.id;
    if (!id) {
      return { ok: false, skipped: true };
    }
    return { ok: true, id };
  } catch {
    return { ok: false, skipped: true };
  }
}

export interface EvaluateTransactionParams {
  referenceClient: string;
  form: ClientFormLike;
  transactionNumber: string;
  compteId?: string | null;
  beneficiaireId?: string | null;
  geolocation: {
    latitude_debit: number;
    longitude_debit: number;
    latitude_credit?: number | null;
    longitude_credit?: number | null;
  };
}

/**
 * Étape 2 — POST /api/v1/transactions/evaluate (scores + décision + persistance optionnelle).
 */
export async function evaluateTransactionWithApi(
  params: EvaluateTransactionParams
): Promise<{ ok: true; data: EvaluateTransactionApiData } | LoginApiError> {
  if (!isApiConfigured()) {
    return { ok: false, message: 'VITE_API_BASE_URL non défini' };
  }
  const payload = buildEvaluateTransactionBody(
    params.form,
    params.referenceClient,
    params.transactionNumber,
    {
      compteId: params.compteId ?? undefined,
      beneficiaireId: params.beneficiaireId ?? undefined,
      geolocation: params.geolocation,
    }
  );

  try {
    const apiKey = getSimulationApiKey();
    const res = await postJson(
      API_ROUTES.transactionsEvaluate,
      payload,
      apiKey ? { 'x-api-key': apiKey } : undefined
    );
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: EvaluateTransactionApiData;
      error?: { message?: string; code?: string };
    };
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        message: json.error?.message || `Erreur HTTP ${res.status}`,
        code: json.error?.code,
      };
    }
    if (!json.data?.scoring) {
      return { ok: false, message: 'Réponse serveur invalide' };
    }
    return { ok: true, data: json.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, message: msg };
  }
}

export { getApiBaseUrl, isApiConfigured } from './config';

/** Payload métier renvoyé par l’API (jsonb). */
export interface NotificationPayload {
  titre?: string;
  numero_transaction?: string;
  montant?: number;
  devise?: string;
  montant_libelle?: string;
  date_iso?: string;
  contrepartie_nom?: string;
  contrepartie_compte?: string;
  mon_compte_numero?: string | null;
  mon_compte_libelle?: string | null;
  solde_total_apres?: number | null;
  solde_total_libelle?: string | null;
}

export interface NotificationRow {
  id: string;
  kind: 'transfer_sent' | 'transfer_received';
  lu: boolean;
  payload: NotificationPayload;
  created_at: string;
}

/**
 * GET /api/v1/me/notifications/unread-count
 */
export async function fetchNotificationsUnreadCount(
  referenceClient: string
): Promise<{ ok: true; count: number } | LoginApiError> {
  if (!isApiConfigured()) {
    return { ok: false, message: 'VITE_API_BASE_URL non défini' };
  }
  try {
    const res = await getJson(API_ROUTES.meNotificationsUnread, {
      reference_client: referenceClient,
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { unread_count?: number };
      error?: { message?: string; code?: string };
    };
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        message: json.error?.message || `Erreur HTTP ${res.status}`,
        code: json.error?.code,
      };
    }
    const count = Number(json.data?.unread_count ?? 0);
    return { ok: true, count: Number.isFinite(count) ? count : 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, message: msg };
  }
}

/**
 * GET /api/v1/me/notifications
 */
export async function fetchNotificationsList(
  referenceClient: string
): Promise<{ ok: true; notifications: NotificationRow[] } | LoginApiError> {
  if (!isApiConfigured()) {
    return { ok: false, message: 'VITE_API_BASE_URL non défini' };
  }
  try {
    const res = await getJson(API_ROUTES.meNotifications, {
      reference_client: referenceClient,
      limit: '80',
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { notifications?: NotificationRow[] };
      error?: { message?: string; code?: string };
    };
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        message: json.error?.message || `Erreur HTTP ${res.status}`,
        code: json.error?.code,
      };
    }
    const list = Array.isArray(json.data?.notifications) ? json.data!.notifications! : [];
    return { ok: true, notifications: list };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, message: msg };
  }
}

/**
 * POST /api/v1/me/notifications/read-all
 */
export async function postNotificationsReadAll(
  referenceClient: string
): Promise<{ ok: true } | LoginApiError> {
  if (!isApiConfigured()) {
    return { ok: false, message: 'VITE_API_BASE_URL non défini' };
  }
  try {
    const res = await postJson(API_ROUTES.meNotificationsReadAll, {
      reference_client: referenceClient,
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: { message?: string; code?: string };
    };
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        message: json.error?.message || `Erreur HTTP ${res.status}`,
        code: json.error?.code,
      };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, message: msg };
  }
}

/**
 * PATCH /api/v1/me/notifications/:id/read
 */
export async function patchNotificationReadOne(
  referenceClient: string,
  notificationId: string
): Promise<{ ok: true } | LoginApiError> {
  if (!isApiConfigured()) {
    return { ok: false, message: 'VITE_API_BASE_URL non défini' };
  }
  try {
    const path = `/api/v1/me/notifications/${encodeURIComponent(notificationId)}/read`;
    const res = await patchJson(path, { reference_client: referenceClient });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: { message?: string; code?: string };
    };
    if (!res.ok || json.success === false) {
      return {
        ok: false,
        message: json.error?.message || `Erreur HTTP ${res.status}`,
        code: json.error?.code,
      };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau';
    return { ok: false, message: msg };
  }
}
