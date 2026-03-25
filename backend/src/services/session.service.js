const clientModel = require('../models/client.model');
const sessionModel = require('../models/session.model');

/**
 * Crée une session ou met à jour une session existante (étape 4.4).
 * @param {object} body — validé par sessionUpsertSchema
 */
async function upsertSession(body) {
  const {
    reference_client: refIn,
    id_client: idClientAlias,
    client_id: clientIdIn,
    session_id: sessionId,
    canal,
    adresse_ip: adresseIp,
  } = body;
  const referenceClient = refIn || idClientAlias;

  if (sessionId) {
    const existing = await sessionModel.findById(sessionId);
    if (existing.unavailable) {
      return { unavailable: true };
    }
    if (existing.error) {
      return { error: existing.error };
    }
    if (!existing.data) {
      return { sessionNotFound: true };
    }
    const updated = await sessionModel.updateById(sessionId, { canal, adresse_ip: adresseIp });
    if (updated.unavailable) {
      return { unavailable: true };
    }
    if (updated.error) {
      return { error: updated.error };
    }
    return { updated: true, session: updated.data };
  }

  let clientUuid = clientIdIn;
  if (referenceClient) {
    const resolved = await clientModel.findByReferenceWithComptes(referenceClient);
    if (resolved.unavailable) {
      return { unavailable: true };
    }
    if (resolved.error) {
      return { error: resolved.error };
    }
    if (!resolved.data) {
      return { clientNotFound: true, ref: referenceClient };
    }
    clientUuid = resolved.data.id;
  }

  if (!clientUuid) {
    return { error: 'client_id manquant' };
  }

  const created = await sessionModel.insert({
    client_id: clientUuid,
    canal,
    adresse_ip: adresseIp,
  });
  if (created.unavailable) {
    return { unavailable: true };
  }
  if (created.error) {
    return { error: created.error };
  }
  return { created: true, session: created.data };
}

module.exports = {
  upsertSession,
};
