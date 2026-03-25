const { getSupabase } = require('../config/supabase');

/**
 * Client + comptes bancaires (nested). Colonnes alignées sur migrations 001 + 005.
 */
async function findByReferenceWithComptes(referenceClient) {
  const db = getSupabase();
  if (!db) {
    return { unavailable: true };
  }

  const { data, error } = await db
    .from('clients')
    .select(
      `
      id,
      reference_client,
      email,
      telephone,
      nom_complet,
      adresse_physique,
      ville,
      pays,
      date_creation,
      date_mise_a_jour,
      comptes_bancaires (
        id,
        numero_compte,
        devise_compte,
        libelle,
        est_compte_principal,
        solde_disponible,
        date_ouverture
      )
    `
    )
    .eq('reference_client', referenceClient)
    .maybeSingle();

  if (error) {
    return {
      error:
        error.message ||
        'Erreur lecture clients / comptes (vérifier migrations SQL 001 et 005)',
    };
  }

  return { data };
}

async function findByExternalRef(ref) {
  const r = await findByReferenceWithComptes(ref);
  if (r.unavailable || r.error) return null;
  return r.data;
}

module.exports = {
  findByExternalRef,
  findByReferenceWithComptes,
};
