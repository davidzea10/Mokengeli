const clientModel = require('../models/client.model');

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

  const soldesParCompte = comptes.map((c) => ({
    compte_id: c.id,
    numero_compte: c.numero_compte,
    devise: c.devise_compte,
    libelle: c.libelle,
    est_compte_principal: c.est_compte_principal,
    solde_disponible: c.solde_disponible != null ? Number(c.solde_disponible) : null,
  }));

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
  getContextByReference,
};
