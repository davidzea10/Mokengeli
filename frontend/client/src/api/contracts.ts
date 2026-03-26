/**
 * API JSON contracts — paths for the backend.
 * Transaction bodies follow docs/transaction_schema.json (English keys).
 */

import type { ApiTransactionDocument } from './transactionPayloadEnglish';

export const API_ROUTES = {
  clientLogin: '/api/v1/client/login',
  clientLogout: '/api/v1/client/logout',
  clientTransactionSimulate: '/api/v1/client/transactions/simulate',
  /** Étape 2 — scoring + persistance optionnelle (Supabase) */
  transactionsEvaluate: '/api/v1/transactions/evaluate',
  beneficiaires: '/api/v1/beneficiaires',
  meNotifications: '/api/v1/me/notifications',
  meNotificationsUnread: '/api/v1/me/notifications/unread-count',
  meNotificationsReadAll: '/api/v1/me/notifications/read-all',
} as const;

/** POST /api/v1/client/login — `name` = identifiant (référence client, e-mail ou téléphone) */
export interface ClientLoginBody {
  name: string;
  password: string;
  client_sent_at: string;
}

/** POST /api/v1/client/logout */
export interface ClientLogoutBody {
  profile_id: string;
  user_display_name: string;
  client_sent_at: string;
}

/** POST /api/v1/client/transactions/simulate */
export interface ClientTransactionSimulationEnvelope {
  kind: 'client_transaction_simulation';
  profile_id: string;
  user_display_name: string;
  client_sent_at: string;
  beneficiary: string;
  account_balance_snapshot: number;
  transaction: ApiTransactionDocument;
}
