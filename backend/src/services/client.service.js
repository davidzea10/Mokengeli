const bcrypt = require('bcryptjs');
const clientModel = require('../models/client.model');

/** Affichage sécurisé du PAN (masque, 4 derniers chiffres). */
function maskPan(raw) {
  if (raw == null || raw === '') return '—';
  const d = String(raw).replace(/\D/g, '');
  if (d.length < 4) return '••••';
  return `•••• •••• •••• ${d.slice(-4)}`;
}

/**
 * Connexion : identifiant (référence client, e-mail ou téléphone) + mot de passe
 * vérifié contre `clients.password_hash` (bcrypt).
 * @param {{ name: string, password: string }} input — `name` = identifiant saisi
 */
async function loginWithCredentials(input) {
  const auth = await clientModel.findClientAuthRow(input.name);
  if (auth.unavailable) {
    return { unavailable: true };
  }
  if (auth.error) {
    return { error: auth.error };
  }
  if (!auth.data) {
    return { unauthorized: true };
  }

  const row = auth.data;
  if (!row.password_hash || String(row.password_hash).trim() === '') {
    return { passwordNotSet: true };
  }

  const ok = await bcrypt.compare(input.password, row.password_hash);
  if (!ok) {
    return { unauthorized: true };
  }

  const full = await clientModel.findByReferenceWithComptes(row.reference_client);
  if (full.unavailable) {
    return { unavailable: true };
  }
  if (full.error) {
    return { error: full.error };
  }
  if (!full.data) {
    return { unauthorized: true };
  }

  const c = full.data;
  return {
    data: {
      reference_client: c.reference_client,
      client: {
        id: c.id,
        reference_client: c.reference_client,
        nom_complet: c.nom_complet ?? null,
        email: c.email ?? null,
      },
    },
  };
}

/**
 * Contexte « moi » : client + comptes avec soldes (étape 4.2).
 * @param {string} referenceClient
 */
async function getContextByReference(referenceClient) {
  const row = await clientModel.findByReferenceWithComptes(referenceClient);
  if (row.unavailable) {
    return { unavailable: true };
  }
  if (row.error) {
    const err = new Error(row.error);
    err.statusCode = 500;
    err.code = 'DATABASE_ERROR';
    throw err;
  }
  if (!row.data) {
    return { notFound: true };
  }

  const { comptes_bancaires: comptesRaw, ...client } = row.data;
  const comptes = Array.isArray(comptesRaw) ? comptesRaw : [];

  const soldesParCompte = comptes.map((c) => {
    const cartesRaw = Array.isArray(c.cartes_bancaires) ? c.cartes_bancaires : [];
    const cartes = cartesRaw.map((card) => ({
      carte_id: card.id,
      compte_id: c.id,
      numero_affiche: maskPan(card.numero_carte),
      type_carte: card.type_carte ?? null,
      date_expiration: card.date_expiration ?? null,
      statut: card.statut ?? null,
    }));
    return {
      compte_id: c.id,
      numero_compte: c.numero_compte,
      devise: c.devise_compte,
      libelle: c.libelle,
      est_compte_principal: c.est_compte_principal,
      solde_disponible: c.solde_disponible != null ? Number(c.solde_disponible) : null,
      date_ouverture: c.date_ouverture ?? null,
      cartes,
    };
  });

  const solde_total = soldesParCompte.reduce(
    (sum, c) => sum + (c.solde_disponible != null ? c.solde_disponible : 0),
    0
  );

  return {
    data: {
      client: {
        id: client.id,
        reference_client: client.reference_client,
        nom_complet: client.nom_complet ?? null,
        email: client.email ?? null,
        telephone: client.telephone ?? null,
        adresse_physique: client.adresse_physique ?? null,
        ville: client.ville ?? null,
        pays: client.pays ?? null,
        date_creation: client.date_creation,
        date_mise_a_jour: client.date_mise_a_jour,
      },
      comptes: soldesParCompte,
      solde_total: Number(soldesParCompte.length ? solde_total.toFixed(2) : 0),
    },
  };
}

module.exports = {
  loginWithCredentials,
  getContextByReference,
};
