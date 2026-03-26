const { getSupabase } = require('../config/supabase');

const PAGE = 1000;

function normalizeSpaces(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '');
}

function sameClientId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/**
 * Forme locale RDC à 10 chiffres (souvent 0XXXXXXXXX).
 */
function canonicalRdc10Digits(input) {
  const d = digitsOnly(input);
  if (!d.length) return null;
  if (d.length === 12 && d.startsWith('243')) {
    const national = d.slice(3);
    if (national.length === 9) {
      return `0${national}`;
    }
  }
  if (d.length === 10) {
    return d;
  }
  if (d.length === 9) {
    return `0${d}`;
  }
  if (d.length > 10) {
    return d.slice(-10);
  }
  return null;
}

function normalizePhone10Digits(input) {
  return canonicalRdc10Digits(input);
}

function phonesMatch(a, b) {
  const ca = canonicalRdc10Digits(a);
  const cb = canonicalRdc10Digits(b);
  if (ca && cb && ca === cb) return true;
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (da.length >= 10 && db.length >= 10 && da.slice(-10) === db.slice(-10)) {
    return true;
  }
  return false;
}

function isAcceptablePhoneInput(s) {
  const c = canonicalRdc10Digits(s);
  return c != null && c.length === 10;
}

function normalizedAccountKey(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
    .toUpperCase();
}

function normalizedAccountLoose(s) {
  return String(s || '')
    .replace(/[\s\-_/.,;:]+/g, '')
    .toUpperCase();
}

async function fetchAllPaginated(table, selectCols) {
  const db = getSupabase();
  if (!db) return { data: null, error: 'NO_DB' };
  const out = [];
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from(table)
      .select(selectCols)
      .range(from, from + PAGE - 1);
    if (error) return { data: null, error: error.message };
    if (!data?.length) break;
    out.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return { data: out };
}

async function fetchPrincipalCompteForClient(clientId) {
  const db = getSupabase();
  if (!db) return null;
  const { data, error } = await db
    .from('comptes_bancaires')
    .select('id, client_id, est_compte_principal')
    .eq('client_id', clientId)
    .order('est_compte_principal', { ascending: false })
    .limit(5);
  if (error || !data?.length) return null;
  const principal = data.find((c) => c.est_compte_principal);
  return principal || data[0];
}

/**
 * Cherche compte crédité à partir d’une chaîne (RIB, PAN, ou téléphone).
 */
async function findCompteByIdentifierString(rawInput, excludeClientId) {
  const db = getSupabase();
  if (!db) {
    return { error: 'SUPABASE_NOT_CONFIGURED', message: 'Base indisponible' };
  }

  const raw = String(rawInput || '').trim();
  if (!raw) {
    return { notFound: true };
  }

  const normSpace = normalizeSpaces(raw);
  const digits = digitsOnly(raw);

  const { data: comptes, error: e1 } = await fetchAllPaginated('comptes_bancaires', 'id, client_id, numero_compte');
  if (e1) {
    return { error: 'DATABASE_ERROR', message: e1 };
  }

  let byNumero = (comptes || []).find((c) => {
    if (!c.numero_compte) return false;
    return normalizedAccountKey(c.numero_compte) === normalizedAccountKey(normSpace);
  });
  if (!byNumero) {
    const looseIn = normalizedAccountLoose(normSpace);
    byNumero = (comptes || []).find(
      (c) => c.numero_compte && normalizedAccountLoose(c.numero_compte) === looseIn
    );
  }
  if (byNumero) {
    if (sameClientId(byNumero.client_id, excludeClientId)) {
      return { error: 'SELF_TRANSFER', message: 'Destinataire identique au compte débité' };
    }
    return { compteId: byNumero.id, clientId: byNumero.client_id, match: 'numero_compte' };
  }

  if (digits.length >= 15) {
    const { data: cartes, error: e2 } = await fetchAllPaginated('cartes_bancaires', 'compte_id, numero_carte');
    if (e2) {
      return { error: 'DATABASE_ERROR', message: e2 };
    }
    for (const card of cartes || []) {
      const cardDigits = digitsOnly(card.numero_carte);
      if (!cardDigits) continue;
      if (cardDigits === digits) {
        const { data: co, error: e3 } = await db
          .from('comptes_bancaires')
          .select('id, client_id')
          .eq('id', card.compte_id)
          .maybeSingle();
        if (e3 || !co) continue;
        if (sameClientId(co.client_id, excludeClientId)) {
          return { error: 'SELF_TRANSFER', message: 'Destinataire identique au compte débité' };
        }
        return { compteId: co.id, clientId: co.client_id, match: 'numero_carte' };
      }
    }
  }

  const canon = canonicalRdc10Digits(raw);
  if (canon && canon.length === 10) {
    const { data: clients, error: e4 } = await fetchAllPaginated('clients', 'id, telephone');
    if (e4) {
      return { error: 'DATABASE_ERROR', message: e4 };
    }
    const found = (clients || []).find((cl) => phonesMatch(raw, cl.telephone));
    if (found) {
      if (sameClientId(found.id, excludeClientId)) {
        return { error: 'SELF_TRANSFER', message: 'Vous ne pouvez pas vous envoyer de l’argent sur votre propre numéro' };
      }
      const compte = await fetchPrincipalCompteForClient(found.id);
      if (!compte) {
        return { error: 'NO_COMPTE_FOR_CLIENT', message: 'Client trouvé mais sans compte bancaire' };
      }
      return { compteId: compte.id, clientId: found.id, match: 'telephone' };
    }
  }

  return { notFound: true };
}

/**
 * Résout le compte à créditer (bénéficiaire en base).
 */
async function resolveCreditCompteForBeneficiaire(beneficiaireRow, excludeClientId) {
  if (!beneficiaireRow) {
    return { error: 'NO_BENEFICIAIRE', message: 'Bénéficiaire manquant' };
  }

  if (beneficiaireRow.client_lie_id) {
    const compte = await fetchPrincipalCompteForClient(beneficiaireRow.client_lie_id);
    if (!compte) {
      return { error: 'NO_COMPTE_FOR_CLIENT_LIE', message: 'Aucun compte pour le client lié' };
    }
    if (sameClientId(compte.client_id, excludeClientId)) {
      return { error: 'SELF_TRANSFER', message: 'Vous ne pouvez pas vous envoyer de l’argent sur votre propre compte' };
    }
    return { compteId: compte.id, clientId: compte.client_id, match: 'client_lie' };
  }

  const stringsToTry = [];
  if (beneficiaireRow.compte_identifiant && String(beneficiaireRow.compte_identifiant).trim()) {
    stringsToTry.push(String(beneficiaireRow.compte_identifiant).trim());
  }
  if (beneficiaireRow.telephone && String(beneficiaireRow.telephone).trim()) {
    stringsToTry.push(String(beneficiaireRow.telephone).trim());
  }

  const seen = new Set();
  for (const s of stringsToTry) {
    if (seen.has(s)) continue;
    seen.add(s);
    const r = await findCompteByIdentifierString(s, excludeClientId);
    if (r.error) return r;
    if (r.compteId) return r;
  }

  return {
    error: 'DESTINATAIRE_INTROUVABLE',
    message:
      'Aucun client interne ne correspond à ce compte, à cette carte ou à ce numéro (10 chiffres). Le crédit n’a pas été appliqué.',
  };
}

async function resolveClientLieIdForBeneficiaireBody(body) {
  const db = getSupabase();
  if (!db) return { client_lie_id: null };

  const candidates = [];
  if (body.mode === 'compte_bancaire' && body.compte_identifiant?.trim()) {
    candidates.push(body.compte_identifiant.trim());
  }
  if (body.mode === 'mobile_money' && body.telephone?.trim()) {
    candidates.push(body.telephone.trim());
  }

  for (const s of candidates) {
    const r = await findCompteByIdentifierString(s, null);
    if (r.clientId) {
      return { client_lie_id: r.clientId };
    }
  }

  return { client_lie_id: null };
}

module.exports = {
  resolveCreditCompteForBeneficiaire,
  resolveClientLieIdForBeneficiaireBody,
  normalizePhone10Digits,
  canonicalRdc10Digits,
  phonesMatch,
  isAcceptablePhoneInput,
  digitsOnly,
  findCompteByIdentifierString,
};
