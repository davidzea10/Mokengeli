const { getSupabase } = require('../config/supabase');
const notificationModel = require('../models/notification.model');

async function fetchCompteAvecClient(compteId) {
  const db = getSupabase();
  if (!db || !compteId) {
    return null;
  }
  const { data: row, error: e1 } = await db
    .from('comptes_bancaires')
    .select('id, numero_compte, libelle, devise_compte, client_id')
    .eq('id', compteId)
    .maybeSingle();
  if (e1 || !row) {
    return null;
  }
  const { data: cl } = await db
    .from('clients')
    .select('id, nom_complet, reference_client')
    .eq('id', row.client_id)
    .maybeSingle();
  return {
    compte_id: row.id,
    numero_compte: row.numero_compte,
    libelle: row.libelle,
    devise_compte: row.devise_compte,
    client_id: row.client_id,
    nom_complet: cl?.nom_complet ?? null,
    reference_client: cl?.reference_client ?? null,
  };
}

function formatMontant(m, devise) {
  const n = typeof m === 'number' ? m : Number(m);
  const d = devise || 'CDF';
  const nf = new Intl.NumberFormat('fr-CD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${nf.format(Number.isFinite(n) ? n : 0)} ${d}`;
}

/**
 * Crée deux notifications (émetteur + bénéficiaire) après un virement persisté.
 */
async function createTransferPair({
  numeroTransaction,
  montant,
  devise,
  dateIso,
  senderClientId,
  senderNom,
  senderCompteNumero,
  senderCompteLibelle,
  senderSoldeApres,
  creditCompteId,
  receiverSoldeApres,
}) {
  if (!creditCompteId) {
    return { skipped: true, reason: 'NO_CREDIT_COMPTE' };
  }
  const receiver = await fetchCompteAvecClient(creditCompteId);
  if (!receiver || !receiver.client_id) {
    return { skipped: true, reason: 'RECEIVER_COMPTE_NOT_FOUND' };
  }
  if (receiver.client_id === senderClientId) {
    return { skipped: true, reason: 'SELF_TRANSFER' };
  }

  const deviseEff = devise || receiver.devise_compte || 'CDF';
  const dateLabel = dateIso || new Date().toISOString();

  const payloadSender = {
    titre: 'Virement envoyé',
    numero_transaction: numeroTransaction,
    montant,
    devise: deviseEff,
    montant_libelle: formatMontant(montant, deviseEff),
    date_iso: dateLabel,
    contrepartie_nom: receiver.nom_complet || receiver.reference_client || 'Destinataire',
    contrepartie_compte: receiver.numero_compte,
    mon_compte_numero: senderCompteNumero,
    mon_compte_libelle: senderCompteLibelle,
    solde_total_apres: senderSoldeApres,
    solde_total_libelle:
      senderSoldeApres != null ? formatMontant(senderSoldeApres, deviseEff) : null,
  };

  const payloadReceiver = {
    titre: 'Virement reçu',
    numero_transaction: numeroTransaction,
    montant,
    devise: deviseEff,
    montant_libelle: formatMontant(montant, deviseEff),
    date_iso: dateLabel,
    contrepartie_nom: senderNom,
    contrepartie_compte: senderCompteNumero,
    mon_compte_numero: receiver.numero_compte,
    mon_compte_libelle: receiver.libelle,
    solde_total_apres: receiverSoldeApres,
    solde_total_libelle:
      receiverSoldeApres != null ? formatMontant(receiverSoldeApres, deviseEff) : null,
  };

  return notificationModel.insertMany([
    { client_id: senderClientId, kind: 'transfer_sent', payload: payloadSender },
    {
      client_id: receiver.client_id,
      kind: 'transfer_received',
      payload: payloadReceiver,
    },
  ]);
}

module.exports = {
  createTransferPair,
  fetchCompteAvecClient,
};
