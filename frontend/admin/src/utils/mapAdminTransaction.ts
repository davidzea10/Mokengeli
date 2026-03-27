import type { Transaction, TransactionPartyDisplay } from '../types';
import type { AdminTransactionRow } from '../api/adminApi';
import { canalToMode } from './getTransactionParties';

const neutralEvent = {
  network_intelligence: {
    score_reputation_ip: 0.5,
    ip_datacenter: false,
    ip_pays_inhabituel: false,
    ip_sur_liste_noire: false,
  },
  anonymization_detection: {
    tor_detecte: false,
    vpn_detecte: false,
    proxy_detecte: false,
  },
  behavioral_biometrics_ueba: {
    duree_session_min: 0,
    nb_ecrans_session: 1,
    delai_otp_s: 0,
    nb_echecs_login_24h: 0,
    vitesse_frappe: 50,
    entropie_souris: 0.5,
    nombre_requetes_par_minute: 0,
  },
  engineered_features_profiling: {
    vitesse_24h: 0,
    ratio_montant_median_30j: 1,
    beneficiaire_nouveau: false,
    distance_km_habitude: 0,
    changement_appareil: false,
  },
  relational_graph_features: {
    degre_client: 0,
    nb_voisins_frauduleux: 0,
    score_reseau: 0.5,
  },
  security_integrity: {
    signature_transaction_valide: true,
    certificat_valide: true,
    score_confiance_client_api: 0.8,
  },
};

function pickClient(row: AdminTransactionRow) {
  const c = row.clients;
  if (!c) return { ref: row.client_id ?? '—', name: '' as string, comptePrincipal: '' as string };
  const one = Array.isArray(c) ? c[0] : c;
  const comptes = one?.comptes_bancaires;
  const arr = Array.isArray(comptes) ? comptes : comptes ? [comptes] : [];
  const principal = arr.find((x) => x.est_compte_principal) ?? arr[0];
  const comptePrincipal = principal?.numero_compte?.trim() ?? '';
  return {
    ref: one?.reference_client ?? row.client_id ?? '—',
    name: one?.nom_complet?.trim() ?? '',
    comptePrincipal,
  };
}

function pickScores(row: AdminTransactionRow) {
  const se = row.scores_evaluation;
  if (!se) return { decision: null as string | null, score_combine: null as number | null };
  const one = Array.isArray(se) ? se[0] : se;
  return {
    decision: one?.decision != null ? String(one.decision) : null,
    score_combine: typeof one?.score_combine === 'number' ? one.score_combine : null,
  };
}

function normalizeModelScore(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  return raw <= 1 ? Math.round(raw * 100) : Math.round(Math.min(100, Math.max(0, raw)));
}

function pickModelScores(row: AdminTransactionRow) {
  const se = row.scores_evaluation;
  if (!se) return { scoreTransaction: null as number | null, scoreSession: null as number | null, scoreComportement: null as number | null };
  const one = Array.isArray(se) ? se[0] : se;
  return {
    scoreTransaction: normalizeModelScore(one?.score_modele_transaction),
    scoreSession: normalizeModelScore(one?.score_modele_session),
    scoreComportement: normalizeModelScore(one?.score_modele_comportement),
  };
}

function pickBeneficiaryFromRaw(row: AdminTransactionRow): TransactionPartyDisplay | null {
  const raw = row.raw_payload;
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const dest =
    (typeof o.destinataire === 'object' && o.destinataire) ||
    (typeof o.beneficiaire === 'object' && o.beneficiaire) ||
    (typeof o.beneficiaire_info === 'object' && o.beneficiaire_info);
  if (!dest || typeof dest !== 'object') return null;
  const d = dest as Record<string, unknown>;
  const nom = String(d.nom ?? d.nom_complet ?? d.titulaire_compte ?? d.titulaire ?? '').trim();
  const compte = String(
    d.telephone ?? d.numero ?? d.numero_compte ?? d.compte_identifiant ?? d.iban ?? '',
  ).trim();
  const modeStr = String(d.mode ?? d.type_canal ?? '').toLowerCase();
  let mode: TransactionPartyDisplay['mode'] = '—';
  if (modeStr.includes('mobile')) mode = 'mobile';
  else if (modeStr.includes('banque') || modeStr.includes('compte')) mode = 'banque';
  else if (compte && /^\+?[0-9\s\-]{8,}$/.test(compte)) mode = 'mobile';
  else if (nom || compte) mode = 'banque';
  if (!nom && !compte) return null;
  return { nom: nom || '—', compte_ou_numero: compte || '—', mode };
}

/** Ligne `beneficiaires` (migration 004) ou ancien format texte. */
function pickBeneficiary(row: AdminTransactionRow): TransactionPartyDisplay {
  const b = row.beneficiaires;
  const one = b ? (Array.isArray(b) ? b[0] : b) : null;
  const ref = row.reference_beneficiaire?.trim() ?? '';

  if (one && (one.id || one.mode || one.compte_identifiant || one.telephone || one.titulaire_compte)) {
    const modeRaw = String(one.mode ?? '').toLowerCase();
    const isMobile =
      modeRaw === 'mobile_money' ||
      modeRaw.includes('mobile') ||
      Boolean(one.telephone && !one.compte_identifiant && !one.numero_compte);
    const isBank =
      modeRaw === 'compte_bancaire' || modeRaw.includes('banque') || Boolean(one.compte_identifiant);

    if (isMobile || (Boolean(one.telephone) && !isBank)) {
      const phone = (one.telephone ?? one.numero_compte ?? '').trim() || ref;
      const nom =
        (one.titulaire_compte ?? one.nom_complet ?? '').trim() ||
        (phone ? phone : '—');
      return {
        nom,
        compte_ou_numero: phone || '—',
        mode: 'mobile',
      };
    }

    if (isBank || one.compte_identifiant || one.banque_nom || one.banque_code) {
      const nom = (one.titulaire_compte ?? one.nom_complet ?? '').trim() || '—';
      const compte =
        (one.compte_identifiant ?? one.numero_compte ?? '').trim() || ref || '—';
      return { nom, compte_ou_numero: compte, mode: 'banque' };
    }

    const legNom = (one.nom_complet ?? '').trim();
    const legCompte = (one.numero_compte ?? '').trim();
    const tc = (one.type_canal ?? '').toLowerCase();
    let mode: TransactionPartyDisplay['mode'] = '—';
    if (tc.includes('mobile') || Boolean(one.operateur_mobile) || tc.includes('m-pesa')) mode = 'mobile';
    else if (tc.includes('banque') || Boolean(one.banque_nom)) mode = 'banque';
    else if (ref) mode = /^\+?[0-9\s\-]{8,}$/.test(ref) ? 'mobile' : 'banque';
    if (legNom || legCompte || ref) {
      return {
        nom: legNom || ref || '—',
        compte_ou_numero: legCompte || ref || '—',
        mode,
      };
    }
  }

  const fromRaw = pickBeneficiaryFromRaw(row);
  if (fromRaw) return fromRaw;

  if (ref) {
    return {
      nom: ref,
      compte_ou_numero: ref,
      mode: /^\+?[0-9\s\-]{8,}$/.test(ref) ? 'mobile' : 'banque',
    };
  }

  return { nom: '—', compte_ou_numero: '—', mode: '—' };
}

function buildExpediteur(row: AdminTransactionRow, canal: string): TransactionPartyDisplay {
  const { ref, name, comptePrincipal } = pickClient(row);
  const compte = comptePrincipal || ref;
  return {
    nom: name || ref,
    compte_ou_numero: compte,
    mode: canalToMode(canal),
  };
}

/**
 * Convertit une ligne API admin en `Transaction` pour réutiliser TransactionTable.
 * Le score de risque affiché privilégie `score_combine` (API) via `_api.riskPercent`.
 */
export function mapAdminRowToTransaction(row: AdminTransactionRow): Transaction {
  const { ref, name } = pickClient(row);
  const { decision, score_combine } = pickScores(row);
  const { scoreTransaction, scoreSession, scoreComportement } = pickModelScores(row);
  const dateStr = row.date_transaction ?? new Date().toISOString();
  const d = new Date(dateStr);
  const heure = Number.isNaN(d.getTime()) ? 12 : d.getUTCHours();
  const jourSemaine = Number.isNaN(d.getTime()) ? 1 : d.getUTCDay() === 0 ? 7 : d.getUTCDay();

  const montant = typeof row.montant === 'number' ? row.montant : 0;
  const devise = row.devise?.trim() || 'CDF';
  const typeTx = row.type_transaction?.trim() || '—';
  const canal = row.canal?.trim() || '—';

  const blocked =
    decision === 'block' ||
    decision === 'deny' ||
    decision === 'challenge';

  const raw = score_combine;
  const riskPercent =
    raw != null && Number.isFinite(raw)
      ? raw <= 1
        ? Math.min(100, Math.max(0, Math.round(raw * 100)))
        : Math.min(100, Math.max(0, Math.round(raw)))
      : 0;

  const idClientDisplay = name ? `${ref} (${name})` : ref;

  return {
    transaction_event: {
      metadata: {
        date_transaction: dateStr,
        numero_transaction: row.numero_transaction?.trim() || row.id,
        id_client: idClientDisplay,
        montant,
        devise,
        heure,
        jour_semaine: jourSemaine,
        type_transaction: typeTx,
        canal,
        parties: {
          expediteur: buildExpediteur(row, canal),
          destinataire: pickBeneficiary(row),
        },
      },
      ...neutralEvent,
    },
    target_labels: {
      cible_fraude: blocked,
      cible_session_anormale: false,
      cible_comportement_atypique: false,
    },
    _api: {
      id: row.id,
      riskPercent,
      decision,
      scoreTransaction,
      scoreSession,
      scoreComportement,
    },
    _adminSource: row,
  };
}
