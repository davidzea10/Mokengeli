const { getSupabase } = require('../config/supabase');

function normalizePhoneDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

/**
 * Recherche un client pour la connexion : référence métier, e-mail ou téléphone.
 * Retourne `password_hash` (usage interne auth uniquement).
 */
async function findClientAuthRow(identifier) {
  const db = getSupabase();
  if (!db) {
    return { unavailable: true };
  }
  const raw = String(identifier || '').trim();
  if (!raw) {
    return { data: null };
  }

  const cols =
    'id, reference_client, password_hash, nom_complet, email, telephone';

  const { data: byRef, error: e1 } = await db
    .from('clients')
    .select(cols)
    .eq('reference_client', raw)
    .maybeSingle();
  if (e1) {
    return { error: e1.message };
  }
  if (byRef) {
    return { data: byRef };
  }

  if (raw.includes('@')) {
    const { data: byEmail, error: e2 } = await db
      .from('clients')
      .select(cols)
      .ilike('email', raw)
      .maybeSingle();
    if (e2) {
      return { error: e2.message };
    }
    if (byEmail) {
      return { data: byEmail };
    }
  }

  const { data: byTel, error: e3 } = await db
    .from('clients')
    .select(cols)
    .eq('telephone', raw)
    .maybeSingle();
  if (e3) {
    return { error: e3.message };
  }
  if (byTel) {
    return { data: byTel };
  }

  const digits = normalizePhoneDigits(raw);
  if (digits.length >= 9) {
    const { data: rows, error: e4 } = await db
      .from('clients')
      .select(cols)
      .not('telephone', 'is', null)
      .limit(500);
    if (e4) {
      return { error: e4.message };
    }
    const found = (rows || []).find(
      (r) => normalizePhoneDigits(r.telephone) === digits
    );
    if (found) {
      return { data: found };
    }
  }

  return { data: null };
}

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
        date_ouverture,
        cartes_bancaires (
          id,
          numero_carte,
          type_carte,
          date_expiration,
          statut
        )
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
  findClientAuthRow,
};
