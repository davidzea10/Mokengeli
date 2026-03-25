import { buildTransactionFromClientForm, type ClientFormLike } from './buildTransactionPayload';
import type {
  ClientLoginBody,
  ClientLogoutBody,
  ClientTransactionSimulationEnvelope,
} from './contracts';
import { API_ROUTES } from './contracts';
import { isApiConfigured } from './config';
import { postJsonIfConfigured } from './http';

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
    beneficiary: params.form.beneficiaire.trim() || 'Unknown',
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

export { getApiBaseUrl, isApiConfigured } from './config';
