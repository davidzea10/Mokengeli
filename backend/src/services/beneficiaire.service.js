const beneficiaireModel = require('../models/beneficiaire.model');
const clientModel = require('../models/client.model');
const compteResolution = require('./compteResolution.service');

/**
 * @param {import('zod').infer<typeof import('../validators/beneficiaire.validator').createBeneficiaireSchema>} body
 */
async function create(body) {
  let client_lie_id = null;
  if (body.reference_client_lie) {
    const resolved = await clientModel.findByReferenceWithComptes(body.reference_client_lie);
    if (resolved.unavailable) {
      return { unavailable: true };
    }
    if (resolved.error) {
      return { error: resolved.error };
    }
    if (!resolved.data) {
      return { clientLieNotFound: true, ref: body.reference_client_lie };
    }
    client_lie_id = resolved.data.id;
  } else {
    const auto = await compteResolution.resolveClientLieIdForBeneficiaireBody(body);
    if (auto.client_lie_id) {
      client_lie_id = auto.client_lie_id;
    }
  }

  const row = {
    mode: body.mode,
    compte_identifiant: body.mode === 'compte_bancaire' ? body.compte_identifiant.trim() : null,
    banque_code: body.mode === 'compte_bancaire' ? body.banque_code ?? null : null,
    titulaire_compte: body.mode === 'compte_bancaire' ? body.titulaire_compte ?? null : null,
    telephone: body.mode === 'mobile_money' ? body.telephone.trim() : null,
    operateur_mobile: body.mode === 'mobile_money' ? body.operateur_mobile ?? null : null,
    client_lie_id,
  };

  return beneficiaireModel.insert(row);
}

async function list(limit) {
  return beneficiaireModel.findAll(limit);
}

async function getById(id) {
  return beneficiaireModel.findById(id);
}

module.exports = {
  create,
  list,
  getById,
};
