const { getSupabase } = require('../config/supabase');

function isUniqueViolation(err) {
  if (!err) return false;
  const code = err.code || err.details;
  return (
    code === '23505' ||
    String(err.message || '').toLowerCase().includes('duplicate') ||
    String(err.message || '').toLowerCase().includes('unique')
  );
}

function mapNetwork(te) {
  const n = te?.network_intelligence || {};
  return {
    score_reputation_ip: n.score_reputation_ip ?? null,
    ip_datacenter: Boolean(n.ip_datacenter),
    ip_pays_inhabituel: Boolean(n.ip_pays_inhabituel),
    ip_sur_liste_noire: Boolean(n.ip_sur_liste_noire),
    numero_asn: n.numero_asn != null ? Math.trunc(Number(n.numero_asn)) : null,
    fournisseur_asn: n.fournisseur_asn ?? null,
    type_reseau_asn: n.type_reseau_asn ?? null,
  };
}

function mapAnon(te) {
  const a = te?.anonymization_detection || {};
  return {
    tor_detecte: Boolean(a.tor_detecte),
    vpn_detecte: Boolean(a.vpn_detecte),
    proxy_detecte: Boolean(a.proxy_detecte),
    score_anonimisation_reseau: a.score_anonimisation_reseau ?? null,
  };
}

function mapBio(te) {
  const b = te?.behavioral_biometrics_ueba || {};
  return {
    duree_session_min: b.duree_session_min ?? null,
    nb_ecrans_session: b.nb_ecrans_session ?? null,
    delai_otp_s: b.delai_otp_s ?? null,
    nb_echecs_login_24h: b.nb_echecs_login_24h ?? null,
    vitesse_frappe: b.vitesse_frappe ?? null,
    entropie_souris: b.entropie_souris ?? null,
    nombre_requetes_par_minute: b.nombre_requetes_par_minute ?? null,
    score_probabilite_automatisation: b.score_probabilite_automatisation ?? null,
  };
}

function mapProfil(te) {
  const p = te?.engineered_features_profiling || {};
  return {
    vitesse_24h: p.vitesse_24h ?? null,
    ratio_montant_median_30j: p.ratio_montant_median_30j ?? null,
    beneficiaire_nouveau: Boolean(p.beneficiaire_nouveau),
    distance_km_habitude: p.distance_km_habitude ?? null,
    changement_appareil: Boolean(p.changement_appareil),
  };
}

function mapGraphe(te) {
  const g = te?.relational_graph_features || {};
  return {
    degre_client: g.degre_client ?? null,
    nb_voisins_frauduleux: g.nb_voisins_frauduleux ?? null,
    score_reseau: g.score_reseau ?? null,
  };
}

function mapSecu(te) {
  const s = te?.security_integrity || {};
  return {
    signature_transaction_valide: Boolean(s.signature_transaction_valide),
    certificat_valide: Boolean(s.certificat_valide),
    score_confiance_client_api: s.score_confiance_client_api ?? null,
    signature_requete_valide: Boolean(s.signature_requete_valide),
    integrite_payload_requete: Boolean(s.integrite_payload_requete),
    certificat_revoque: Boolean(s.certificat_revoque),
  };
}

/**
 * Insert transaction + satellites + scores + débit solde compte + crédit compte destinataire (optionnel).
 */
async function insertFullEvaluation({
  transactionRow,
  transactionEvent,
  scores,
  decision,
  montant,
  compteId,
  creditCompteId,
}) {
  const db = getSupabase();
  if (!db) {
    return { error: 'no db' };
  }

  const { data: txRow, error: txErr } = await db
    .from('transactions')
    .insert(transactionRow)
    .select('id')
    .single();

  if (txErr) {
    if (isUniqueViolation(txErr)) {
      return { duplicate: true, error: txErr.message };
    }
    return { error: txErr.message };
  }

  const transactionId = txRow.id;

  const sid = { transaction_id: transactionId };

  const inserts = [
    db.from('transaction_intelligence_reseau').insert({ ...sid, ...mapNetwork(transactionEvent) }),
    db.from('transaction_detecte_anonymisation').insert({ ...sid, ...mapAnon(transactionEvent) }),
    db.from('transaction_biometrie_session').insert({ ...sid, ...mapBio(transactionEvent) }),
    db.from('transaction_profil_calcule').insert({ ...sid, ...mapProfil(transactionEvent) }),
    db.from('transaction_graphe_relationnel').insert({ ...sid, ...mapGraphe(transactionEvent) }),
    db.from('transaction_integrite_securite').insert({ ...sid, ...mapSecu(transactionEvent) }),
    db.from('scores_evaluation').insert({
      transaction_id: transactionId,
      score_modele_transaction: scores?.score_m1_transaction ?? null,
      score_modele_session: scores?.score_m2_session ?? null,
      score_modele_comportement: scores?.score_m3_behavior ?? null,
      score_combine: decision?.score_combined ?? null,
      decision: decision?.decision != null ? String(decision.decision) : null,
      texte_motifs:
        decision?.reason_codes != null ? JSON.stringify(decision.reason_codes) : null,
    }),
  ];

  for (const q of inserts) {
    const { error } = await q;
    if (error) {
      return { error: `Satellite/scores: ${error.message}`, transactionId };
    }
  }

  let senderSoldeApres = null;
  let receiverSoldeApres = null;

  const { data: compteRow } = await db
    .from('comptes_bancaires')
    .select('solde_disponible')
    .eq('id', compteId)
    .maybeSingle();

  if (
    compteRow &&
    compteRow.solde_disponible != null &&
    typeof montant === 'number'
  ) {
    const nouveau = Number(compteRow.solde_disponible) - montant;
    senderSoldeApres = Math.max(0, nouveau);
    await db
      .from('comptes_bancaires')
      .update({ solde_disponible: senderSoldeApres })
      .eq('id', compteId);
  }

  if (
    creditCompteId &&
    creditCompteId !== compteId &&
    typeof montant === 'number' &&
    montant > 0
  ) {
    const { data: creditRow } = await db
      .from('comptes_bancaires')
      .select('solde_disponible')
      .eq('id', creditCompteId)
      .maybeSingle();
    if (creditRow && creditRow.solde_disponible != null) {
      const apresCredit = Number(creditRow.solde_disponible) + montant;
      receiverSoldeApres = apresCredit;
      await db
        .from('comptes_bancaires')
        .update({ solde_disponible: apresCredit })
        .eq('id', creditCompteId);
    }
  }

  return { transactionId, senderSoldeApres, receiverSoldeApres };
}

async function insertTransaction(row) {
  const db = getSupabase();
  if (!db) {
    return { skipped: true, reason: 'SUPABASE_NOT_CONFIGURED' };
  }
  return null;
}

/**
 * Liste paginée pour l’admin (jointures client, compte, scores).
 * Filtre `decision` : requête depuis `scores_evaluation` + `transactions!inner` (scores obligatoires).
 */
async function listForAdmin({
  page = 1,
  limit = 20,
  clientId,
  decision,
  dateFrom,
  dateTo,
}) {
  const db = getSupabase();
  if (!db) return { unavailable: true };
  const offset = (page - 1) * limit;

  if (decision) {
    let q = db
      .from('scores_evaluation')
      .select(
        `
        transaction_id,
        decision,
        score_combine,
        score_modele_transaction,
        score_modele_session,
        score_modele_comportement,
        date_calcul,
        texte_motifs,
        transactions!inner (
          id,
          numero_transaction,
          date_transaction,
          montant,
          devise,
          type_transaction,
          canal,
          client_id,
          compte_id,
          session_id,
          beneficiaire_id,
          clients (reference_client, nom_complet),
          comptes_bancaires (numero_compte, devise_compte, libelle)
        )
      `,
        { count: 'exact' }
      )
      .eq('decision', decision);

    if (clientId) q = q.eq('transactions.client_id', clientId);
    if (dateFrom) q = q.gte('transactions.date_transaction', dateFrom);
    if (dateTo) q = q.lte('transactions.date_transaction', dateTo);

    const { data, error, count } = await q
      .order('date_transaction', { ascending: false, foreignTable: 'transactions' })
      .range(offset, offset + limit - 1);

    if (error) return { error: error.message };
    const mapped = (data || []).map((row) => {
      const t = row.transactions;
      return {
        ...t,
        scores_evaluation: {
          decision: row.decision,
          score_combine: row.score_combine,
          score_modele_transaction: row.score_modele_transaction,
          score_modele_session: row.score_modele_session,
          score_modele_comportement: row.score_modele_comportement,
          date_calcul: row.date_calcul,
          texte_motifs: row.texte_motifs,
        },
      };
    });
    return { data: mapped, total: count ?? 0, page, limit };
  }

  const scoreEmbed =
    'scores_evaluation(decision, score_combine, score_modele_transaction, score_modele_session, score_modele_comportement, date_calcul)';

  let q = db.from('transactions').select(
    `
    id,
    numero_transaction,
    date_transaction,
    montant,
    devise,
    type_transaction,
    canal,
    client_id,
    compte_id,
    session_id,
    beneficiaire_id,
    clients (reference_client, nom_complet),
    comptes_bancaires (numero_compte, devise_compte, libelle),
    ${scoreEmbed}
  `,
    { count: 'exact' }
  );

  if (clientId) q = q.eq('client_id', clientId);
  if (dateFrom) q = q.gte('date_transaction', dateFrom);
  if (dateTo) q = q.lte('date_transaction', dateTo);

  const { data, error, count } = await q
    .order('date_transaction', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { error: error.message };
  return { data: data ?? [], total: count ?? 0, page, limit };
}

/**
 * Détail audit : transaction + satellites + scores + entités liées.
 */
async function findByIdForAdmin(id) {
  const db = getSupabase();
  if (!db) return { unavailable: true };
  const { data, error } = await db
    .from('transactions')
    .select(
      `
      *,
      clients (id, reference_client, nom_complet, email, telephone),
      comptes_bancaires (id, numero_compte, devise_compte, libelle, solde_disponible),
      sessions (id, canal, adresse_ip, date_debut),
      beneficiaires (id, mode, compte_identifiant, telephone, titulaire_compte, banque_code),
      cartes_bancaires (id, numero_carte, type_carte, statut),
      scores_evaluation (*),
      transaction_intelligence_reseau (*),
      transaction_detecte_anonymisation (*),
      transaction_biometrie_session (*),
      transaction_profil_calcule (*),
      transaction_graphe_relationnel (*),
      transaction_integrite_securite (*)
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data };
}

module.exports = {
  insertTransaction,
  insertFullEvaluation,
  listForAdmin,
  findByIdForAdmin,
};
