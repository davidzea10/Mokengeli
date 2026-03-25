const clientModel = require('../models/client.model');
const beneficiaireModel = require('../models/beneficiaire.model');
const sessionModel = require('../models/session.model');
const transactionModel = require('../models/transaction.model');

/**
 * Indique si les métadonnées minimales permettent une persistance BDD.
 */
function canPersistMetadata(meta) {
  return Boolean(
    meta &&
      typeof meta.numero_transaction === 'string' &&
      meta.numero_transaction.trim().length > 0 &&
      typeof meta.id_client === 'string' &&
      meta.id_client.trim().length > 0 &&
      typeof meta.montant === 'number' &&
      Number.isFinite(meta.montant) &&
      typeof meta.devise === 'string' &&
      meta.devise.trim().length > 0
  );
}

/**
 * @param {object} payload — corps POST /evaluate
 * @param {{ scores: object, decision: object }} scoring
 */
async function persistEvaluate(payload, { scores, decision }) {
  const te = payload?.transaction_event || {};
  const meta = te.metadata || {};
  const { getSupabase } = require('../config/supabase');
  if (!getSupabase()) {
    return { skipped: true, reason: 'SUPABASE_NOT_CONFIGURED' };
  }
  if (!canPersistMetadata(meta)) {
    return { skipped: true, reason: 'METADATA_INCOMPLETE' };
  }

  const clientRes = await clientModel.findByReferenceWithComptes(meta.id_client.trim());
  if (clientRes.unavailable) {
    return { error: 'SUPABASE_NOT_CONFIGURED', statusCode: 503 };
  }
  if (clientRes.error) {
    return {
      error: 'DATABASE_ERROR',
      statusCode: 500,
      message: String(clientRes.error),
    };
  }
  if (!clientRes.data) {
    return {
      error: 'CLIENT_NOT_FOUND',
      statusCode: 404,
      message: `Client introuvable (${meta.id_client})`,
    };
  }

  const clientId = clientRes.data.id;
  const comptes = clientRes.data.comptes_bancaires || [];
  let compteId = payload.compte_id || null;
  if (compteId) {
    const ok = comptes.some((c) => c.id === compteId);
    if (!ok) {
      return {
        error: 'COMPTE_NOT_FOR_CLIENT',
        statusCode: 400,
        message: 'Le compte indiqué n’appartient pas à ce client',
      };
    }
  } else {
    const principal = comptes.find((c) => c.est_compte_principal);
    const pick = principal || comptes[0];
    if (!pick) {
      return {
        error: 'NO_COMPTE_FOR_CLIENT',
        statusCode: 400,
        message: 'Aucun compte bancaire pour ce client',
      };
    }
    compteId = pick.id;
  }

  const compte = comptes.find((c) => c.id === compteId);
  const solde =
    compte && compte.solde_disponible != null ? Number(compte.solde_disponible) : null;
  if (solde != null && meta.montant > solde) {
    return {
      error: 'INSUFFICIENT_FUNDS',
      statusCode: 400,
      message: 'Montant supérieur au solde disponible du compte',
    };
  }

  if (payload.session_id) {
    const s = await sessionModel.findById(payload.session_id);
    if (s.unavailable) {
      return { error: 'SUPABASE_NOT_CONFIGURED', statusCode: 503 };
    }
    if (!s.data || s.data.client_id !== clientId) {
      return {
        error: 'SESSION_INVALID',
        statusCode: 400,
        message: 'Session absente ou ne correspond pas au client',
      };
    }
  }

  if (payload.beneficiaire_id) {
    const b = await beneficiaireModel.findById(payload.beneficiaire_id);
    if (b.unavailable) {
      return { error: 'SUPABASE_NOT_CONFIGURED', statusCode: 503 };
    }
    if (!b.data) {
      return {
        error: 'BENEFICIAIRE_NOT_FOUND',
        statusCode: 404,
        message: 'Bénéficiaire introuvable',
      };
    }
  }

  const now = new Date();
  const dateTx = meta.date_transaction ? new Date(meta.date_transaction) : now;
  if (Number.isNaN(dateTx.getTime())) {
    return { error: 'INVALID_DATE_TRANSACTION', statusCode: 422 };
  }

  const heure =
    typeof meta.heure === 'number' && meta.heure >= 0 && meta.heure <= 23
      ? meta.heure
      : dateTx.getUTCHours();
  const jourSemaine =
    typeof meta.jour_semaine === 'number'
      ? meta.jour_semaine
      : dateTx.getUTCDay() === 0
        ? 7
        : dateTx.getUTCDay();

  const row = {
    numero_transaction: meta.numero_transaction.trim(),
    client_id: clientId,
    compte_id: compteId,
    carte_id: null,
    session_id: payload.session_id || null,
    date_transaction: dateTx.toISOString(),
    montant: meta.montant,
    devise: meta.devise.trim(),
    heure,
    jour_semaine: jourSemaine,
    type_transaction: (meta.type_transaction || 'P2P').trim(),
    canal: (meta.canal || 'mobile').trim(),
    reference_beneficiaire: meta.reference_beneficiaire || null,
    source_environnement: meta.source_environnement || 'demo',
  };

  if (payload.beneficiaire_id) {
    row.beneficiaire_id = payload.beneficiaire_id;
  }
  if (payload.latitude_debit != null) {
    row.latitude_debit = payload.latitude_debit;
  }
  if (payload.longitude_debit != null) {
    row.longitude_debit = payload.longitude_debit;
  }
  if (payload.latitude_credit != null) {
    row.latitude_credit = payload.latitude_credit;
  }
  if (payload.longitude_credit != null) {
    row.longitude_credit = payload.longitude_credit;
  }

  const ins = await transactionModel.insertFullEvaluation({
    transactionRow: row,
    transactionEvent: te,
    scores,
    decision,
    montant: meta.montant,
    compteId,
  });

  if (ins.duplicate) {
    return {
      error: 'DUPLICATE_NUMERO_TRANSACTION',
      statusCode: 409,
      message: ins.error || meta.numero_transaction,
    };
  }
  if (ins.error) {
    return { error: 'DATABASE_ERROR', statusCode: 500, message: ins.error };
  }

  return {
    persisted: true,
    transaction_id: ins.transactionId,
    numero_transaction: row.numero_transaction,
  };
}

module.exports = {
  persistEvaluate,
  canPersistMetadata,
};
