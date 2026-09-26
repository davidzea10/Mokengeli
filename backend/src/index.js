/**
 * API minimale : GET /api/v1/admin/transactions
 * Joint clients (référence, nom, comptes), beneficiaires (mode, titulaire, téléphone, IBAN…),
 * scores_evaluation (scores des 3 modèles + décision).
 * En cas d’échec : réessaie sans session, puis sans client embarqué ; en dernier recours select('*').
 */
import 'dotenv/config';
import express from 'express';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { buildM1TransactionFeatures, runM1PythonPredict } from './m1Features.js';
import { scoreM2Session, scoreM3Behavior, combineScores } from './m2m3Scores.js';
import { runLisungiAdvice } from './lisungiAdvice.js';

const PORT = Number(process.env.PORT) || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CORS_ALLOW_HEADERS =
  'Content-Type, Authorization, Accept, X-Requested-With, X-API-Key, apikey';
const CORS_ALLOW_METHODS = 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS';

/**
 * CORS manuel : toujours Access-Control-Allow-Origin=* (évite les erreurs si une preview Vercel
 * n’est pas dans une liste sur Render). La sécurité repose sur l’auth API, pas sur CORS.
 */
function applyCorsHeaders(_req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', CORS_ALLOW_METHODS);
  res.setHeader('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS);
}

const app = express();
app.use((req, res, next) => {
  applyCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());

const CLIENTS_WITH_COMPTES = `
  clients:client_id (
    reference_client,
    nom_complet,
    email,
    telephone,
    comptes_bancaires (
      numero_compte,
      est_compte_principal,
      devise_compte
    )
  )`;

const CLIENTS_ONLY = `
  clients:client_id (
    reference_client,
    nom_complet,
    email,
    telephone
  )`;

/** Bénéficiaire + scores + session (la session casse souvent la jointure en prod si FK absente). */
/** Colonnes alignées sur le schéma réel : pas de nom_complet / banque_nom si absent en base (sinon PostgREST échoue). */
const RELATIONS_WITH_SESSIONS = `
  beneficiaires:beneficiaire_id (
    id,
    mode,
    compte_identifiant,
    banque_code,
    titulaire_compte,
    telephone,
    operateur_mobile,
    client_lie_id,
    client_lie:clients!client_lie_id (
      nom_complet,
      reference_client,
      telephone
    )
  ),
  sessions:session_id (*),
  scores_evaluation (
    decision,
    score_combine,
    score_modele_transaction,
    score_modele_session,
    score_modele_comportement
  )`;

/** Même chose sans sessions — préféré dès qu’une jointure session échoue. */
const RELATIONS_WITHOUT_SESSIONS = `
  beneficiaires:beneficiaire_id (
    id,
    mode,
    compte_identifiant,
    banque_code,
    titulaire_compte,
    telephone,
    operateur_mobile,
    client_lie_id,
    client_lie:clients!client_lie_id (
      nom_complet,
      reference_client,
      telephone
    )
  ),
  scores_evaluation (
    decision,
    score_combine,
    score_modele_transaction,
    score_modele_session,
    score_modele_comportement
  )`;

/**
 * @param {string} clientsFragment - ex. clients:client_id (...)
 * @param {string} relationsFragment - RELATIONS_* (toujours inclure beneficiaires si possible)
 */
function buildSelect(clientsFragment, relationsFragment) {
  const cf = (clientsFragment || '').trim();
  const rf = (relationsFragment || '').trim();
  if (!rf) return '*';
  if (!cf) return `*, ${rf}`.replace(/\s+/g, ' ').trim();
  return `*, ${cf}, ${rf}`.replace(/\s+/g, ' ').trim();
}

const BEN_SELECT_ENRICH = `
  id,
  mode,
  compte_identifiant,
  banque_code,
  titulaire_compte,
  telephone,
  operateur_mobile,
  client_lie_id,
  client_lie:clients!client_lie_id (
    nom_complet,
    reference_client,
    telephone
  )
`;

/**
 * Recharge **toutes** les lignes `beneficiaires` par `beneficiaire_id` et fusionne dans la réponse.
 * La jointure PostgREST peut renvoyer null (FK non exposée, cache schéma) ou un objet incomplet ;
 * une requête directe sur la table est la source de vérité — même comportement qu’en local.
 */
async function enrichTransactionsWithBeneficiaires(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const ids = [...new Set(rows.map((r) => r.beneficiaire_id).filter(Boolean).map(String))];
  if (ids.length === 0) return rows;
  const { data: bens, error } = await supabase.from('beneficiaires').select(BEN_SELECT_ENRICH).in('id', ids);
  if (error) {
    console.warn('[admin/transactions] enrich beneficiaires:', error.message);
    return rows;
  }
  if (!bens?.length) return rows;
  const map = new Map(bens.map((b) => [String(b.id), b]));
  return rows.map((row) => {
    const bid = row.beneficiaire_id;
    if (bid == null || bid === '') return row;
    const b = map.get(String(bid));
    if (!b) return row;
    return { ...row, beneficiaires: b };
  });
}

const COMPTE_DEBIT_SELECT = 'id, numero_compte, devise_compte, est_compte_principal';

/**
 * Compte débité = `transactions.compte_id` → `comptes_bancaires` (cf. req.md), pas seulement le compte
 * « principal » sous `clients`. Sans ça, le tableau affiche « — » pour Compte / n°.
 */
async function enrichTransactionsWithDebitCompte(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const ids = [...new Set(rows.map((r) => r.compte_id).filter(Boolean).map(String))];
  if (ids.length === 0) return rows;
  const { data: cpts, error } = await supabase.from('comptes_bancaires').select(COMPTE_DEBIT_SELECT).in('id', ids);
  if (error) {
    console.warn('[admin/transactions] enrich comptes_bancaires (débit):', error.message);
    return rows;
  }
  if (!cpts?.length) return rows;
  const map = new Map(cpts.map((c) => [String(c.id), c]));
  return rows.map((row) => {
    const cid = row.compte_id;
    if (cid == null || cid === '') return row;
    const c = map.get(String(cid));
    if (!c) return row;
    return { ...row, debit_compte: c };
  });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

function normalizePhoneDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

function maskPan(raw) {
  if (raw == null || raw === '') return '—';
  const d = String(raw).replace(/\D/g, '');
  if (d.length < 4) return '••••';
  return `•••• •••• •••• ${d.slice(-4)}`;
}

async function findClientAuthRow(identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return { data: null };
  const cols = 'id, reference_client, password_hash, nom_complet, email, telephone';

  const { data: byRef, error: e1 } = await supabase
    .from('clients')
    .select(cols)
    .eq('reference_client', raw)
    .maybeSingle();
  if (e1) return { error: e1.message };
  if (byRef) return { data: byRef };

  if (raw.includes('@')) {
    const { data: byEmail, error: e2 } = await supabase
      .from('clients')
      .select(cols)
      .ilike('email', raw)
      .maybeSingle();
    if (e2) return { error: e2.message };
    if (byEmail) return { data: byEmail };
  }

  const { data: byTel, error: e3 } = await supabase
    .from('clients')
    .select(cols)
    .eq('telephone', raw)
    .maybeSingle();
  if (e3) return { error: e3.message };
  if (byTel) return { data: byTel };

  const digits = normalizePhoneDigits(raw);
  if (digits.length >= 9) {
    const { data: rows, error: e4 } = await supabase
      .from('clients')
      .select(cols)
      .not('telephone', 'is', null)
      .limit(500);
    if (e4) return { error: e4.message };
    const found = (rows || []).find((r) => normalizePhoneDigits(r.telephone) === digits);
    if (found) return { data: found };
  }

  return { data: null };
}

async function findClientWithComptes(referenceClient) {
  const { data, error } = await supabase
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
    `,
    )
    .eq('reference_client', referenceClient)
    .maybeSingle();
  if (error) return { error: error.message };
  return { data };
}

function buildMePayload(row) {
  const { comptes_bancaires: comptesRaw, ...client } = row;
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
      est_compte_principal: Boolean(c.est_compte_principal),
      solde_disponible: c.solde_disponible == null ? null : Number(c.solde_disponible),
      date_ouverture: c.date_ouverture ?? null,
      cartes,
    };
  });
  const solde_total = soldesParCompte.reduce(
    (acc, c) => acc + (Number.isFinite(c.solde_disponible) ? c.solde_disponible : 0),
    0,
  );
  return {
    client: {
      id: client.id,
      reference_client: client.reference_client,
      nom_complet: client.nom_complet ?? null,
      email: client.email ?? null,
      telephone: client.telephone ?? null,
      adresse_physique: client.adresse_physique ?? null,
      ville: client.ville ?? null,
      pays: client.pays ?? null,
    },
    comptes: soldesParCompte,
    solde_total,
  };
}

/** POST /api/v1/client/login — identifiant (référence / e-mail / téléphone) + mot de passe */
app.post('/api/v1/client/login', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const password = String(req.body?.password || '');
    if (!name || !password) {
      return res.status(422).json({
        success: false,
        error: { message: 'name et password requis', code: 'VALIDATION_ERROR' },
      });
    }

    const auth = await findClientAuthRow(name);
    if (auth.error) {
      return res.status(500).json({
        success: false,
        error: { message: auth.error, code: 'DATABASE_ERROR' },
      });
    }
    if (!auth.data) {
      return res.status(401).json({
        success: false,
        error: { message: 'Identifiants incorrects', code: 'INVALID_CREDENTIALS' },
      });
    }
    if (!auth.data.password_hash || String(auth.data.password_hash).trim() === '') {
      return res.status(403).json({
        success: false,
        error: {
          message:
            'Mot de passe non configuré pour ce compte. Définissez password_hash (bcrypt) en base.',
          code: 'PASSWORD_NOT_CONFIGURED',
        },
      });
    }

    const ok = await bcrypt.compare(password, auth.data.password_hash);
    if (!ok) {
      return res.status(401).json({
        success: false,
        error: { message: 'Identifiants incorrects', code: 'INVALID_CREDENTIALS' },
      });
    }

    const full = await findClientWithComptes(auth.data.reference_client);
    if (full.error || !full.data) {
      return res.status(500).json({
        success: false,
        error: { message: full.error || 'Profil client introuvable', code: 'DATABASE_ERROR' },
      });
    }

    const c = full.data;
    return res.json({
      success: true,
      data: {
        reference_client: c.reference_client,
        client: {
          id: c.id,
          reference_client: c.reference_client,
          nom_complet: c.nom_complet ?? null,
          email: c.email ?? null,
        },
        next_step: `GET /api/v1/me?reference_client=${encodeURIComponent(c.reference_client)}`,
      },
    });
  } catch (err) {
    console.error('[client/login]', err);
    return res.status(500).json({
      success: false,
      error: { message: err?.message || 'Erreur serveur', code: 'INTERNAL_ERROR' },
    });
  }
});

app.post('/api/v1/client/logout', (req, res) => {
  return res.json({
    success: true,
    data: { logged_out: true, profile_id: req.body?.profile_id ?? null },
  });
});

/** GET /api/v1/me?reference_client=… — profil + comptes + soldes */
app.get('/api/v1/me', async (req, res) => {
  try {
    const referenceClient = String(req.query.reference_client || '').trim();
    if (!referenceClient) {
      return res.status(422).json({
        success: false,
        error: { message: 'reference_client requis', code: 'VALIDATION_ERROR' },
      });
    }
    const full = await findClientWithComptes(referenceClient);
    if (full.error) {
      return res.status(500).json({
        success: false,
        error: { message: full.error, code: 'DATABASE_ERROR' },
      });
    }
    if (!full.data) {
      return res.status(404).json({
        success: false,
        error: { message: `Client introuvable : ${referenceClient}`, code: 'NOT_FOUND' },
      });
    }
    return res.json({ success: true, data: buildMePayload(full.data) });
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({
      success: false,
      error: { message: err?.message || 'Erreur serveur', code: 'INTERNAL_ERROR' },
    });
  }
});

async function resolveClientIdByReference(referenceClient) {
  const ref = String(referenceClient || '').trim();
  if (!ref) {
    return { error: 'reference_client requis', statusCode: 422, code: 'VALIDATION_ERROR' };
  }
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('reference_client', ref)
    .maybeSingle();
  if (error) {
    return { error: error.message, statusCode: 500, code: 'DATABASE_ERROR' };
  }
  if (!data) {
    return { error: `Client introuvable : ${ref}`, statusCode: 404, code: 'NOT_FOUND' };
  }
  return { clientId: data.id };
}

function isMissingTableError(message) {
  const m = String(message || '').toLowerCase();
  return m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find the table');
}

/** GET /api/v1/me/notifications?reference_client=&limit=&offset= */
app.get('/api/v1/me/notifications', async (req, res) => {
  try {
    const resolved = await resolveClientIdByReference(req.query.reference_client);
    if (resolved.error) {
      return res.status(resolved.statusCode).json({
        success: false,
        error: { message: resolved.error, code: resolved.code },
      });
    }
    const lim = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const off = Math.max(Number(req.query.offset) || 0, 0);
    const { data, error } = await supabase
      .from('notifications_client')
      .select('id, kind, lu, payload, created_at')
      .eq('client_id', resolved.clientId)
      .order('created_at', { ascending: false })
      .range(off, off + lim - 1);
    if (error) {
      if (isMissingTableError(error.message)) {
        return res.json({ success: true, data: { notifications: [] } });
      }
      return res.status(500).json({
        success: false,
        error: { message: error.message, code: 'DATABASE_ERROR' },
      });
    }
    return res.json({ success: true, data: { notifications: data || [] } });
  } catch (err) {
    console.error('[me/notifications]', err);
    return res.status(500).json({
      success: false,
      error: { message: err?.message || 'Erreur serveur', code: 'INTERNAL_ERROR' },
    });
  }
});

/** GET /api/v1/me/notifications/unread-count?reference_client= */
app.get('/api/v1/me/notifications/unread-count', async (req, res) => {
  try {
    const resolved = await resolveClientIdByReference(req.query.reference_client);
    if (resolved.error) {
      return res.status(resolved.statusCode).json({
        success: false,
        error: { message: resolved.error, code: resolved.code },
      });
    }
    const { count, error } = await supabase
      .from('notifications_client')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', resolved.clientId)
      .eq('lu', false);
    if (error) {
      if (isMissingTableError(error.message)) {
        return res.json({ success: true, data: { unread_count: 0 } });
      }
      return res.status(500).json({
        success: false,
        error: { message: error.message, code: 'DATABASE_ERROR' },
      });
    }
    return res.json({ success: true, data: { unread_count: count ?? 0 } });
  } catch (err) {
    console.error('[me/notifications/unread-count]', err);
    return res.status(500).json({
      success: false,
      error: { message: err?.message || 'Erreur serveur', code: 'INTERNAL_ERROR' },
    });
  }
});

/** POST /api/v1/me/notifications/read-all — body: { reference_client } */
app.post('/api/v1/me/notifications/read-all', async (req, res) => {
  try {
    const resolved = await resolveClientIdByReference(req.body?.reference_client);
    if (resolved.error) {
      return res.status(resolved.statusCode).json({
        success: false,
        error: { message: resolved.error, code: resolved.code },
      });
    }
    const { error } = await supabase
      .from('notifications_client')
      .update({ lu: true })
      .eq('client_id', resolved.clientId)
      .eq('lu', false);
    if (error) {
      if (isMissingTableError(error.message)) {
        return res.json({ success: true, data: { marked: true } });
      }
      return res.status(500).json({
        success: false,
        error: { message: error.message, code: 'DATABASE_ERROR' },
      });
    }
    return res.json({ success: true, data: { marked: true } });
  } catch (err) {
    console.error('[me/notifications/read-all]', err);
    return res.status(500).json({
      success: false,
      error: { message: err?.message || 'Erreur serveur', code: 'INTERNAL_ERROR' },
    });
  }
});

/** PATCH /api/v1/me/notifications/:id/read — body: { reference_client } */
app.patch('/api/v1/me/notifications/:id/read', async (req, res) => {
  try {
    const resolved = await resolveClientIdByReference(req.body?.reference_client);
    if (resolved.error) {
      return res.status(resolved.statusCode).json({
        success: false,
        error: { message: resolved.error, code: resolved.code },
      });
    }
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(422).json({
        success: false,
        error: { message: 'id notification requis', code: 'VALIDATION_ERROR' },
      });
    }
    const { data, error } = await supabase
      .from('notifications_client')
      .update({ lu: true })
      .eq('id', id)
      .eq('client_id', resolved.clientId)
      .select('id')
      .maybeSingle();
    if (error) {
      if (isMissingTableError(error.message)) {
        return res.status(404).json({
          success: false,
          error: { message: 'Notification introuvable', code: 'NOT_FOUND' },
        });
      }
      return res.status(500).json({
        success: false,
        error: { message: error.message, code: 'DATABASE_ERROR' },
      });
    }
    if (!data) {
      return res.status(404).json({
        success: false,
        error: { message: 'Notification introuvable', code: 'NOT_FOUND' },
      });
    }
    return res.json({ success: true, data: { marked: true } });
  } catch (err) {
    console.error('[me/notifications/:id/read]', err);
    return res.status(500).json({
      success: false,
      error: { message: err?.message || 'Erreur serveur', code: 'INTERNAL_ERROR' },
    });
  }
});

function normalizedAccountLoose(s) {
  return String(s || '')
    .replace(/[\s\-_/.,;:]+/g, '')
    .toUpperCase();
}

async function resolveClientLieIdFromCompte(compteIdentifiant) {
  const raw = String(compteIdentifiant || '').trim();
  if (!raw) return null;
  const { data: exact } = await supabase
    .from('comptes_bancaires')
    .select('client_id, numero_compte')
    .eq('numero_compte', raw)
    .maybeSingle();
  if (exact?.client_id) return exact.client_id;

  const key = normalizedAccountLoose(raw);
  const { data, error } = await supabase
    .from('comptes_bancaires')
    .select('client_id, numero_compte')
    .limit(5000);
  if (error || !data) return null;
  const hit = data.find((c) => normalizedAccountLoose(c.numero_compte) === key);
  return hit?.client_id ?? null;
}

/** POST /api/v1/beneficiaires — crée un bénéficiaire (banque ou mobile money) */
app.post('/api/v1/beneficiaires', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const mode = String(body.mode || '').trim();
    if (mode !== 'compte_bancaire' && mode !== 'mobile_money') {
      return res.status(422).json({
        success: false,
        error: { message: 'mode doit être compte_bancaire ou mobile_money', code: 'VALIDATION_ERROR' },
      });
    }

    let client_lie_id = null;
    if (body.reference_client_lie) {
      const resolved = await resolveClientIdByReference(body.reference_client_lie);
      if (resolved.error) {
        return res.status(resolved.statusCode === 404 ? 404 : resolved.statusCode).json({
          success: false,
          error: { message: resolved.error, code: resolved.code },
        });
      }
      client_lie_id = resolved.clientId;
    }

    let row;
    if (mode === 'compte_bancaire') {
      const compte = String(body.compte_identifiant || '').trim();
      if (!compte) {
        return res.status(422).json({
          success: false,
          error: { message: 'compte_identifiant requis', code: 'VALIDATION_ERROR' },
        });
      }
      if (!client_lie_id) {
        client_lie_id = await resolveClientLieIdFromCompte(compte);
      }
      row = {
        mode,
        compte_identifiant: compte,
        banque_code: body.banque_code ? String(body.banque_code).trim() : null,
        titulaire_compte: body.titulaire_compte ? String(body.titulaire_compte).trim() : null,
        telephone: null,
        operateur_mobile: null,
        client_lie_id,
      };
    } else {
      const telephone = String(body.telephone || '').trim();
      if (!telephone) {
        return res.status(422).json({
          success: false,
          error: { message: 'telephone requis', code: 'VALIDATION_ERROR' },
        });
      }
      row = {
        mode,
        compte_identifiant: null,
        banque_code: null,
        titulaire_compte: null,
        telephone,
        operateur_mobile: body.operateur_mobile ? String(body.operateur_mobile).trim() : null,
        client_lie_id,
      };
    }

    const { data, error } = await supabase.from('beneficiaires').insert(row).select('*').single();
    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: error.message, code: 'DATABASE_ERROR' },
      });
    }
    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[beneficiaires]', err);
    return res.status(500).json({
      success: false,
      error: { message: err?.message || 'Erreur serveur', code: 'INTERNAL_ERROR' },
    });
  }
});

/** JSON peut envoyer des nombres en string ; PostgREST attend des nombres pour double precision. */
function parseCoord(raw) {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * POST /api/v1/transactions/evaluate — scoring M1 (log_reg.joblib) + persistance `transactions`.
 * Géoloc : si absente côté client, colonnes NULL en base ; le vecteur M1 utilise 0 pour les coords manquantes.
 */
app.post('/api/v1/transactions/evaluate', async (req, res) => {
  const authDisabled = String(process.env.AUTH_DISABLED ?? 'true').toLowerCase() === 'true';
  const apiKeyExpected = process.env.API_KEY_SIMULATION;
  if (!authDisabled && apiKeyExpected) {
    const key = req.headers['x-api-key'];
    if (key !== apiKeyExpected) {
      return res.status(401).json({ success: false, error: { message: 'Non autorisé', code: 'UNAUTHORIZED' } });
    }
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const te = body.transaction_event;
    const meta = te?.metadata;
    if (!meta || typeof meta !== 'object') {
      return res.status(400).json({
        success: false,
        error: { message: 'Corps invalide : transaction_event.metadata requis', code: 'BAD_REQUEST' },
      });
    }

    const latD = parseCoord(body.latitude_debit) ?? parseCoord(meta.latitude_debit);
    const lonD = parseCoord(body.longitude_debit) ?? parseCoord(meta.longitude_debit);
    let latDebit = null;
    let lonDebit = null;
    if (latD != null && lonD != null) {
      if (latD < -90 || latD > 90 || lonD < -180 || lonD > 180) {
        return res.status(400).json({
          success: false,
          error: { message: 'Coordonnées débit hors plage', code: 'INVALID_COORDS' },
        });
      }
      latDebit = latD;
      lonDebit = lonD;
    }

    let latCredit = null;
    let lonCredit = null;
    const lc = parseCoord(body.latitude_credit) ?? parseCoord(meta.latitude_credit);
    const lcc = parseCoord(body.longitude_credit) ?? parseCoord(meta.longitude_credit);
    if (lc != null && lcc != null) {
      if (lc < -90 || lc > 90 || lcc < -180 || lcc > 180) {
        return res.status(400).json({
          success: false,
          error: { message: 'Coordonnées crédit hors plage', code: 'INVALID_COORDS' },
        });
      }
      latCredit = lc;
      lonCredit = lcc;
    }

    const refClient = String(meta.id_client ?? '')
      .trim()
      .replace(/^\((.+)\)$/, '$1');
    if (!refClient) {
      return res.status(400).json({
        success: false,
        error: { message: 'id_client manquant dans metadata', code: 'BAD_REQUEST' },
      });
    }

    const { data: clientRow, error: clientErr } = await supabase
      .from('clients')
      .select(
        'id, reference_client, nom_complet, email, telephone, ville, pays, adresse_physique, date_creation, date_mise_a_jour',
      )
      .eq('reference_client', refClient)
      .maybeSingle();

    if (clientErr) {
      console.error('[transactions/evaluate] client', clientErr);
      return res.status(500).json({
        success: false,
        error: { message: clientErr.message, code: clientErr.code },
      });
    }
    if (!clientRow?.id) {
      return res.status(400).json({
        success: false,
        error: { message: 'Client introuvable pour cette référence', code: 'CLIENT_NOT_FOUND' },
      });
    }

    const compteId = body.compte_id;
    if (!compteId || String(compteId).trim() === '') {
      return res.status(400).json({
        success: false,
        error: { message: 'compte_id requis', code: 'BAD_REQUEST' },
      });
    }

    const { data: compteRow, error: compteErr } = await supabase
      .from('comptes_bancaires')
      .select('id, client_id')
      .eq('id', compteId)
      .maybeSingle();

    if (compteErr) {
      console.error('[transactions/evaluate] compte', compteErr);
      return res.status(500).json({
        success: false,
        error: { message: compteErr.message, code: compteErr.code },
      });
    }
    if (!compteRow?.id || String(compteRow.client_id) !== String(clientRow.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Compte invalide pour ce client', code: 'INVALID_COMPTE' },
      });
    }

    const numero = String(meta.numero_transaction ?? '').trim();
    if (!numero) {
      return res.status(400).json({
        success: false,
        error: { message: 'numero_transaction manquant', code: 'BAD_REQUEST' },
      });
    }

    const montant = Number(meta.montant);
    if (!Number.isFinite(montant) || montant <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'montant invalide', code: 'BAD_REQUEST' },
      });
    }

    const devise = String(meta.devise ?? 'FC').trim() || 'FC';
    const heure = Number(meta.heure);
    const jourSemaine = Number(meta.jour_semaine);
    const heureOk = Number.isFinite(heure) && heure >= 0 && heure <= 23 ? heure : new Date().getUTCHours();
    const jourOk =
      Number.isFinite(jourSemaine) && jourSemaine >= 1 && jourSemaine <= 7
        ? jourSemaine
        : (() => {
            const d = new Date().getUTCDay();
            return d === 0 ? 7 : d;
          })();

    const sourceEnv =
      String(meta.source_environnement ?? 'app').trim() === 'demo' ? 'demo' : 'app';

    const row = {
      numero_transaction: numero,
      client_id: clientRow.id,
      compte_id: compteRow.id,
      carte_id: null,
      session_id: body.session_id ?? null,
      date_transaction: meta.date_transaction || new Date().toISOString(),
      montant,
      devise,
      heure: heureOk,
      jour_semaine: jourOk,
      type_transaction: String(meta.type_transaction ?? 'virement'),
      canal: String(meta.canal ?? 'app'),
      reference_beneficiaire: meta.reference_beneficiaire != null ? String(meta.reference_beneficiaire) : null,
      beneficiaire_id: body.beneficiaire_id ?? null,
      latitude_debit: latDebit,
      longitude_debit: lonDebit,
      latitude_credit: latCredit,
      longitude_credit: lonCredit,
      source_environnement: sourceEnv,
    };

    // Scoring M1 (joblib) + M2/M3 (heuristiques session / comportement)
    const m1Features = buildM1TransactionFeatures(body, meta, te, clientRow);
    const m1Result = runM1PythonPredict(m1Features);
    const m1Proba = m1Result.proba_fraude;
    const m2 = scoreM2Session(m1Features);
    const m3 = scoreM3Behavior(m1Features);
    const combined = combineScores(m1Proba, m2, m3);
    const decision = combined.decision;
    const reasonCodes = [
      ...combined.reason_codes,
      ...(m1Result.fallback ? ['m1_fallback'] : []),
    ];

    let creditCompteId = null;
    if (body.beneficiaire_id) {
      const resolvedCredit = await resolveCreditCompteIdForBeneficiaire(
        body.beneficiaire_id,
        clientRow.id,
      );
      if (!resolvedCredit.skipped && resolvedCredit.creditCompteId) {
        creditCompteId = resolvedCredit.creditCompteId;
      } else if (resolvedCredit.reason === 'SELF_TRANSFER') {
        return res.status(400).json({
          success: false,
          error: { message: 'Virement vers soi-même interdit', code: 'SELF_TRANSFER' },
        });
      }
    }

    const { data: compteSoldeRow, error: soldeErr } = await supabase
      .from('comptes_bancaires')
      .select('id, solde_disponible, numero_compte, libelle')
      .eq('id', compteRow.id)
      .maybeSingle();
    if (soldeErr) {
      return res.status(500).json({
        success: false,
        error: { message: soldeErr.message, code: 'DATABASE_ERROR' },
      });
    }
    const soldeActuel =
      compteSoldeRow?.solde_disponible != null ? Number(compteSoldeRow.solde_disponible) : null;

    if (decision === 'allow' && soldeActuel != null && montant > soldeActuel) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Solde insuffisant (${soldeActuel} < ${montant})`,
          code: 'INSUFFICIENT_FUNDS',
        },
      });
    }

    const { data: inserted, error: insErr } = await supabase
      .from('transactions')
      .insert(row)
      .select('id, numero_transaction')
      .single();

    if (insErr) {
      console.error('[transactions/evaluate] insert', insErr);
      const low = String(insErr.message ?? '').toLowerCase();
      if (low.includes('unique') || low.includes('duplicate')) {
        return res.status(409).json({
          success: false,
          error: { message: 'Numéro de transaction déjà utilisé', code: 'DUPLICATE' },
        });
      }
      return res.status(500).json({
        success: false,
        error: { message: insErr.message, code: insErr.code },
      });
    }

    const txId = inserted?.id;
    let senderSoldeApres = soldeActuel;
    let receiverSoldeApres = null;
    let balancesMoved = false;

    if (txId) {
      const { error: scoreErr } = await supabase.from('scores_evaluation').upsert(
        {
          transaction_id: txId,
          score_modele_transaction: m1Proba,
          score_modele_session: m2.score,
          score_modele_comportement: m3.score,
          score_combine: combined.score_combined,
          decision,
          texte_motifs: reasonCodes.length ? JSON.stringify(reasonCodes) : null,
        },
        { onConflict: 'transaction_id' },
      );
      if (scoreErr) {
        console.warn('[transactions/evaluate] scores_evaluation', scoreErr.message);
      }
    }

    if (decision === 'allow' && creditCompteId && soldeActuel != null) {
      senderSoldeApres = Math.max(0, soldeActuel - montant);
      const { error: debitErr } = await supabase
        .from('comptes_bancaires')
        .update({ solde_disponible: senderSoldeApres })
        .eq('id', compteRow.id);
      if (debitErr) {
        console.error('[transactions/evaluate] debit', debitErr.message);
        return res.status(500).json({
          success: false,
          error: { message: 'Échec débit compte', code: 'DEBIT_FAILED' },
        });
      }

      const { data: creditRow } = await supabase
        .from('comptes_bancaires')
        .select('solde_disponible')
        .eq('id', creditCompteId)
        .maybeSingle();
      if (creditRow && creditRow.solde_disponible != null) {
        receiverSoldeApres = Number(creditRow.solde_disponible) + montant;
        const { error: creditErr } = await supabase
          .from('comptes_bancaires')
          .update({ solde_disponible: receiverSoldeApres })
          .eq('id', creditCompteId);
        if (creditErr) {
          console.error('[transactions/evaluate] credit', creditErr.message);
          await supabase
            .from('comptes_bancaires')
            .update({ solde_disponible: soldeActuel })
            .eq('id', compteRow.id);
          return res.status(500).json({
            success: false,
            error: { message: 'Échec crédit compte destinataire', code: 'CREDIT_FAILED' },
          });
        }
      }
      balancesMoved = true;

      try {
        const notifResult = await createTransferNotificationsAfterAllow({
          beneficiaireId: body.beneficiaire_id,
          creditCompteId,
          senderClientId: clientRow.id,
          senderNom: clientRow.nom_complet || clientRow.reference_client,
          senderCompteId: compteRow.id,
          senderCompteNumero: compteSoldeRow?.numero_compte ?? null,
          senderCompteLibelle: compteSoldeRow?.libelle ?? null,
          senderSoldeApres: await sumSoldesClient(clientRow.id),
          receiverSoldeApres: null,
          numeroTransaction: inserted?.numero_transaction ?? numero,
          montant,
          devise,
          dateIso: row.date_transaction,
        });
        if (notifResult?.skipped) {
          console.warn('[transactions/evaluate] notifications skipped:', notifResult.reason);
        } else if (notifResult?.error) {
          console.warn('[transactions/evaluate] notifications:', notifResult.error);
        }
      } catch (notifErr) {
        console.warn(
          '[transactions/evaluate] notifications exception:',
          notifErr instanceof Error ? notifErr.message : notifErr,
        );
      }
    } else if (decision === 'allow' && !creditCompteId) {
      console.warn('[transactions/evaluate] allow sans creditCompteId — pas de mouvement de solde');
    }

    return res.json({
      success: true,
      data: {
        scoring: {
          score_m1_transaction: m1Proba,
          score_m2_session: m2.score,
          score_m3_behavior: m3.score,
          score_combined: combined.score_combined,
          decision,
          reason_codes: reasonCodes,
          m1_model: m1Result.model ?? null,
          m1_fallback: m1Result.fallback,
          m1_label: m1Result.label ?? null,
          m2_model: m2.model,
          m3_model: m3.model,
        },
        persistence: {
          status: 'persisted',
          transaction_id: txId,
          numero_transaction: inserted?.numero_transaction ?? numero,
          balances_moved: balancesMoved,
          sender_solde_apres: senderSoldeApres,
          receiver_solde_apres: receiverSoldeApres,
        },
      },
    });
  } catch (e) {
    console.error('[transactions/evaluate]', e);
    return res.status(500).json({
      success: false,
      error: { message: e instanceof Error ? e.message : String(e), code: 'INTERNAL' },
    });
  }
});

function formatMontantNotif(m, devise) {
  const n = typeof m === 'number' ? m : Number(m);
  const d = devise || 'CDF';
  const nf = new Intl.NumberFormat('fr-CD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${nf.format(Number.isFinite(n) ? n : 0)} ${d}`;
}

async function fetchCompteAvecClientNotif(compteId) {
  if (!compteId) return null;
  const { data: row, error } = await supabase
    .from('comptes_bancaires')
    .select('id, numero_compte, libelle, devise_compte, client_id, solde_disponible')
    .eq('id', compteId)
    .maybeSingle();
  if (error || !row) return null;
  const { data: cl } = await supabase
    .from('clients')
    .select('id, nom_complet, reference_client')
    .eq('id', row.client_id)
    .maybeSingle();
  return {
    ...row,
    nom_complet: cl?.nom_complet ?? null,
    reference_client: cl?.reference_client ?? null,
  };
}

async function sumSoldesClient(clientId) {
  const { data } = await supabase
    .from('comptes_bancaires')
    .select('solde_disponible')
    .eq('client_id', clientId);
  return (data || []).reduce((acc, c) => acc + (Number(c.solde_disponible) || 0), 0);
}

async function resolveCreditCompteIdForBeneficiaire(beneficiaireId, excludeClientId) {
  const { data: ben, error } = await supabase
    .from('beneficiaires')
    .select('id, mode, compte_identifiant, telephone, client_lie_id')
    .eq('id', beneficiaireId)
    .maybeSingle();
  if (error || !ben) return { skipped: true, reason: 'BENEFICIAIRE_NOT_FOUND' };

  if (ben.client_lie_id) {
    if (String(ben.client_lie_id) === String(excludeClientId)) {
      return { skipped: true, reason: 'SELF_TRANSFER' };
    }
    const { data: comptes } = await supabase
      .from('comptes_bancaires')
      .select('id, est_compte_principal')
      .eq('client_id', ben.client_lie_id)
      .order('est_compte_principal', { ascending: false })
      .limit(5);
    const pick = (comptes || []).find((c) => c.est_compte_principal) || (comptes || [])[0];
    if (!pick) return { skipped: true, reason: 'NO_COMPTE_RECEIVER' };
    return { creditCompteId: pick.id };
  }

  if (ben.mode === 'compte_bancaire' && ben.compte_identifiant) {
    const raw = String(ben.compte_identifiant).trim();
    const { data: exact } = await supabase
      .from('comptes_bancaires')
      .select('id, client_id, numero_compte')
      .eq('numero_compte', raw)
      .maybeSingle();
    let hit = exact;
    if (!hit) {
      const key = normalizedAccountLoose(raw);
      const { data: comptes } = await supabase
        .from('comptes_bancaires')
        .select('id, client_id, numero_compte')
        .limit(5000);
      hit = (comptes || []).find(
        (c) => c.numero_compte && normalizedAccountLoose(c.numero_compte) === key,
      );
    }
    if (!hit) return { skipped: true, reason: 'COMPTE_DEST_NOT_FOUND' };
    if (String(hit.client_id) === String(excludeClientId)) {
      return { skipped: true, reason: 'SELF_TRANSFER' };
    }
    return { creditCompteId: hit.id };
  }

  if (ben.mode === 'mobile_money' && ben.telephone) {
    const digits = String(ben.telephone).replace(/\D/g, '');
    const canon =
      digits.length === 12 && digits.startsWith('243')
        ? `0${digits.slice(3)}`
        : digits.length === 9
          ? `0${digits}`
          : digits.length === 10
            ? digits
            : null;
    if (canon) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, telephone')
        .not('telephone', 'is', null)
        .limit(500);
      const found = (clients || []).find((c) => {
        const d = String(c.telephone || '').replace(/\D/g, '');
        const cCanon =
          d.length === 12 && d.startsWith('243')
            ? `0${d.slice(3)}`
            : d.length === 9
              ? `0${d}`
              : d;
        return cCanon === canon;
      });
      if (found) {
        if (String(found.id) === String(excludeClientId)) {
          return { skipped: true, reason: 'SELF_TRANSFER' };
        }
        const { data: comptes } = await supabase
          .from('comptes_bancaires')
          .select('id, est_compte_principal')
          .eq('client_id', found.id)
          .limit(5);
        const pick = (comptes || []).find((c) => c.est_compte_principal) || (comptes || [])[0];
        if (pick) return { creditCompteId: pick.id };
      }
    }
  }

  return { skipped: true, reason: 'CANNOT_RESOLVE_CREDIT_COMPTE' };
}

async function createTransferNotificationsAfterAllow({
  beneficiaireId,
  creditCompteId: creditCompteIdArg,
  senderClientId,
  senderNom,
  senderCompteId,
  senderCompteNumero,
  senderCompteLibelle,
  senderSoldeApres: senderSoldeArg,
  receiverSoldeApres: receiverSoldeArg,
  numeroTransaction,
  montant,
  devise,
  dateIso,
}) {
  let creditCompteId = creditCompteIdArg;
  if (!creditCompteId && beneficiaireId) {
    const resolved = await resolveCreditCompteIdForBeneficiaire(beneficiaireId, senderClientId);
    if (resolved.skipped) return resolved;
    creditCompteId = resolved.creditCompteId;
  }
  if (!creditCompteId) return { skipped: true, reason: 'NO_CREDIT_COMPTE' };

  const sender = await fetchCompteAvecClientNotif(senderCompteId);
  const receiver = await fetchCompteAvecClientNotif(creditCompteId);
  if (!sender || !receiver || !receiver.client_id) {
    return { skipped: true, reason: 'COMPTE_LOOKUP_FAILED' };
  }
  if (String(receiver.client_id) === String(senderClientId)) {
    return { skipped: true, reason: 'SELF_TRANSFER' };
  }

  const deviseEff = devise || receiver.devise_compte || 'CDF';
  const senderSoldeApres =
    senderSoldeArg != null ? senderSoldeArg : await sumSoldesClient(senderClientId);
  const receiverSoldeApres =
    receiverSoldeArg != null ? receiverSoldeArg : await sumSoldesClient(receiver.client_id);

  const payloadSender = {
    titre: 'Virement envoyé',
    numero_transaction: numeroTransaction,
    montant,
    devise: deviseEff,
    montant_libelle: formatMontantNotif(montant, deviseEff),
    date_iso: dateIso,
    contrepartie_nom: receiver.nom_complet || receiver.reference_client || 'Destinataire',
    contrepartie_compte: receiver.numero_compte,
    mon_compte_numero: senderCompteNumero || sender.numero_compte,
    mon_compte_libelle: senderCompteLibelle || sender.libelle,
    solde_total_apres: senderSoldeApres,
    solde_total_libelle: formatMontantNotif(senderSoldeApres, deviseEff),
  };
  const payloadReceiver = {
    titre: 'Virement reçu',
    numero_transaction: numeroTransaction,
    montant,
    devise: deviseEff,
    montant_libelle: formatMontantNotif(montant, deviseEff),
    date_iso: dateIso,
    contrepartie_nom: senderNom,
    contrepartie_compte: senderCompteNumero || sender.numero_compte,
    mon_compte_numero: receiver.numero_compte,
    mon_compte_libelle: receiver.libelle,
    solde_total_apres: receiverSoldeApres,
    solde_total_libelle: formatMontantNotif(receiverSoldeApres, deviseEff),
  };

  const { error } = await supabase.from('notifications_client').insert([
    { client_id: senderClientId, kind: 'transfer_sent', lu: false, payload: payloadSender },
    {
      client_id: receiver.client_id,
      kind: 'transfer_received',
      lu: false,
      payload: payloadReceiver,
    },
  ]);
  if (error) return { error: error.message };
  return { inserted: 2 };
}

/** Échappement basique pour motifs ILIKE PostgREST. */
function escapeIlike(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** Taille max d’une page (liste admin) — défaut 1000 pour couvrir de grosses bases en pagination. */
const ADMIN_MAX_PAGE_LIMIT = Math.min(
  5000,
  Math.max(10, Number(process.env.ADMIN_MAX_PAGE_LIMIT) || 1000),
);

app.get('/api/v1/admin/transactions', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const rawLimit = parseInt(String(req.query.limit), 10) || 50;
  const limit = Math.min(ADMIN_MAX_PAGE_LIMIT, Math.max(1, rawLimit));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const searchQ = String(req.query.q ?? '')
    .trim()
    .slice(0, 200);
  const typeFilter = String(req.query.type ?? '')
    .trim()
    .slice(0, 80);
  const statusFilter = String(req.query.status ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 32);

  /**
   * Applique filtres + tri + plage. Les filtres sont cumulés en AND ;
   * la recherche `q` utilise un OR sur plusieurs colonnes.
   */
  const applyFilters = (qb) => {
    let q = qb;
    if (typeFilter && typeFilter !== 'all') {
      q = q.eq('type_transaction', typeFilter);
    }
    if (statusFilter === 'blocked') {
      q = q.gt('montant', 5000);
    } else if (statusFilter === 'authorized') {
      q = q.lte('montant', 5000);
    } else if (statusFilter === 'pending') {
      q = q.or(
        'scores_evaluation.decision.ilike.%challenge%,scores_evaluation.decision.ilike.%pending%,scores_evaluation.decision.ilike.%review%',
      );
    }
    if (searchQ) {
      const p = `%${escapeIlike(searchQ)}%`;
      q = q.or(
        `numero_transaction.ilike.${p},reference_beneficiaire.ilike.${p},client_id.ilike.${p}`,
      );
    }
    return q.order('date_transaction', { ascending: false }).range(from, to);
  };

  const run = async (selectStr) => {
    const base = supabase.from('transactions').select(selectStr, { count: 'exact' });
    return applyFilters(base);
  };

  const attempts = [
    () => buildSelect(CLIENTS_WITH_COMPTES, RELATIONS_WITH_SESSIONS),
    () => buildSelect(CLIENTS_WITH_COMPTES, RELATIONS_WITHOUT_SESSIONS),
    () => buildSelect(CLIENTS_ONLY, RELATIONS_WITH_SESSIONS),
    () => buildSelect(CLIENTS_ONLY, RELATIONS_WITHOUT_SESSIONS),
    /** Si la FK client pose problème, au moins bénéficiaires + scores sur les colonnes `*`. */
    () => buildSelect('', RELATIONS_WITHOUT_SESSIONS),
  ];

  let data;
  let error;
  let count;
  for (const build of attempts) {
    ({ data, error, count } = await run(build()));
    if (!error) break;
    console.warn('[admin/transactions] nouvelle tentative:', error.message);
  }
  if (error) {
    console.warn('[admin/transactions] dernier recours select * (sans jointures):', error.message);
    ({ data, error, count } = await run('*'));
  }

  if (error) {
    console.error('[admin/transactions]', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message, code: error.code },
    });
  }

  let items = await enrichTransactionsWithBeneficiaires(data ?? []);
  items = await enrichTransactionsWithDebitCompte(items);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return res.json({
    success: true,
    data: {
      items,
      total,
      page,
      limit,
      totalPages,
    },
  });
});

function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 0) return 'À venir';
  if (diffSec < 60) return "À l'instant";
  if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `Il y a ${Math.floor(diffSec / 3600)} h`;
  return d.toLocaleString('fr-FR');
}

function normalizeSeverity(raw) {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('crit') || s === 'high' || s === 'eleve') return 'critical';
  if (s.includes('warn') || s === 'medium' || s === 'moyen') return 'warning';
  return 'info';
}

function mapAlertRow(row) {
  const id = row.id != null ? String(row.id) : `row-${Math.random().toString(36).slice(2)}`;
  const title = row.title ?? row.titre ?? row.label ?? 'Alerte';
  const description = row.description ?? row.message ?? row.detail ?? '';
  const created = row.created_at ?? row.date_creation ?? row.updated_at;
  const tx =
    row.transaction_id ??
    row.numero_transaction ??
    row.transaction_id_ref ??
    row.reference_transaction ??
    null;
  return {
    id,
    severity: normalizeSeverity(row.severity ?? row.niveau ?? row.level),
    title,
    description,
    time: formatRelativeTime(created),
    transactionId: tx != null ? String(tx) : undefined,
  };
}

/**
 * Liste d’alertes : table `public.alerts` si elle existe,
 * sinon dérivée des transactions à décision challenge / deny / block.
 */
let alertsTableMissing = false;
app.get('/api/v1/admin/alerts', async (_req, res) => {
  const empty = {
    items: [],
    total: 0,
    stats: { pending: 0, confirmedFraud: 0, falsePositives: 0 },
  };

  if (!alertsTableMissing) {
    const { data, error, count } = await supabase
      .from('alerts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) {
      const rows = data ?? [];
      const total = count ?? rows.length;
      const items = rows.map(mapAlertRow);
      let pending = 0;
      let confirmedFraud = 0;
      let falsePositives = 0;
      const hasStatus = rows.some((r) => r.status != null || r.statut != null || r.type != null);
      if (rows.length > 0 && hasStatus) {
        for (const r of rows) {
          const s = String(r.status ?? r.statut ?? r.type ?? '').toLowerCase();
          if (
            (s.includes('confirm') && s.includes('fraud')) ||
            s.includes('fraude_confirm') ||
            s === 'confirmed_fraud'
          ) {
            confirmedFraud++;
          } else if (s.includes('false') || s.includes('faux') || s === 'false_positive') {
            falsePositives++;
          } else {
            pending++;
          }
        }
      } else {
        pending = total;
      }
      return res.json({
        success: true,
        data: { items, total, stats: { pending, confirmedFraud, falsePositives } },
      });
    }
    alertsTableMissing = true;
    console.warn('[admin/alerts] table absente — fallback scores_evaluation (challenge)');
  }

  // Fallback : transactions scorées challenge / deny / block
  const { data: scores, error: sErr } = await supabase
    .from('scores_evaluation')
    .select(
      'transaction_id, decision, score_combine, score_modele_transaction, date_calcul, transactions(id, numero_transaction, montant, devise, date_transaction, reference_beneficiaire, client_id)',
    )
    .or('decision.ilike.%challenge%,decision.ilike.%deny%,decision.ilike.%block%')
    .order('date_calcul', { ascending: false })
    .limit(100);

  if (sErr) {
    console.warn('[admin/alerts] fallback:', sErr.message);
    return res.json({ success: true, data: empty });
  }

  const items = (scores || []).map((s) => {
    const tx = s.transactions || {};
    return {
      id: s.transaction_id,
      status: 'pending',
      decision: s.decision,
      score: s.score_combine ?? s.score_modele_transaction,
      numero_transaction: tx.numero_transaction,
      montant: tx.montant,
      devise: tx.devise,
      date: tx.date_transaction || s.date_calcul,
      reference_beneficiaire: tx.reference_beneficiaire,
      created_at: s.date_calcul,
    };
  });

  return res.json({
    success: true,
    data: {
      items,
      total: items.length,
      stats: { pending: items.length, confirmedFraud: 0, falsePositives: 0 },
    },
  });
});

/**
 * POST /api/v1/lisungi/analyze — RAG conseil client (historique + marchands + scores).
 * Body: { reference_client, question? }
 */
app.post('/api/v1/lisungi/analyze', async (req, res) => {
  try {
    const referenceClient = String(req.body?.reference_client || '').trim();
    const question = String(req.body?.question || '').trim();
    if (!referenceClient) {
      return res.status(422).json({
        success: false,
        error: { message: 'reference_client requis', code: 'VALIDATION_ERROR' },
      });
    }

    const full = await findClientWithComptes(referenceClient);
    if (full.error) {
      return res.status(500).json({
        success: false,
        error: { message: full.error, code: 'DATABASE_ERROR' },
      });
    }
    if (!full.data?.id) {
      return res.status(404).json({
        success: false,
        error: { message: 'Client introuvable', code: 'CLIENT_NOT_FOUND' },
      });
    }

    const clientId = full.data.id;
    const { data: txs, error: txErr } = await supabase
      .from('transactions')
      .select(
        `
        id,
        numero_transaction,
        date_transaction,
        montant,
        devise,
        type_transaction,
        canal,
        reference_beneficiaire,
        scores_evaluation (
          decision,
          score_combine,
          score_modele_transaction,
          score_modele_session,
          score_modele_comportement
        )
      `,
      )
      .eq('client_id', clientId)
      .order('date_transaction', { ascending: false })
      .limit(60);

    if (txErr) {
      console.error('[lisungi/analyze] txs', txErr);
      return res.status(500).json({
        success: false,
        error: { message: txErr.message, code: 'DATABASE_ERROR' },
      });
    }

    const result = await runLisungiAdvice({
      client: full.data,
      comptes: full.data.comptes_bancaires || [],
      transactions: txs || [],
      question,
    });

    return res.json({
      success: true,
      data: {
        assistant: 'Lisungi',
        question: question || null,
        generated_at: new Date().toISOString(),
        ...result,
      },
    });
  } catch (err) {
    console.error('[lisungi/analyze]', err);
    return res.status(500).json({
      success: false,
      error: { message: err?.message || 'Erreur serveur', code: 'INTERNAL_ERROR' },
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(
    `Mokengeli backend http://localhost:${PORT} (POST /api/v1/client/login, GET /api/v1/me, POST /api/v1/transactions/evaluate, POST /api/v1/lisungi/analyze, GET /api/v1/admin/transactions, GET /api/v1/admin/alerts)`,
  );
  console.log('[cors] Access-Control-Allow-Origin=*');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} déjà utilisé. Arrêtez l’autre processus (ex. ancien \`node\`) ou définissez PORT=3001 dans .env.`,
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
