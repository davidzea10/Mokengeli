/**
 * API minimale : GET /api/v1/admin/transactions
 * Joint clients (référence, nom, comptes), beneficiaires (mode, titulaire, téléphone, IBAN…),
 * scores_evaluation (scores des 3 modèles + décision).
 * Si la requête avec relations échoue (FK manquante), retombe sur select('*').
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const PORT = Number(process.env.PORT) || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** true = autorise toute origine https://*.vercel.app (previews + prod Vercel). */
const corsAllowVercel =
  String(process.env.CORS_ALLOW_VERCEL || '').toLowerCase() === 'true' ||
  String(process.env.CORS_ALLOW_VERCEL || '').toLowerCase() === '1';

function isAllowedVercelOrigin(origin) {
  try {
    const u = new URL(origin);
    return u.protocol === 'https:' && u.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      if (corsAllowVercel && isAllowedVercelOrigin(origin)) return callback(null, true);
      return callback(null, false);
    },
  }),
);
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

const BEN_SCORE = `
  beneficiaires:beneficiaire_id (
    id,
    mode,
    compte_identifiant,
    banque_code,
    titulaire_compte,
    telephone,
    operateur_mobile
  ),
  sessions:session_id (*),
  scores_evaluation (
    decision,
    score_combine,
    score_modele_transaction,
    score_modele_session,
    score_modele_comportement
  )`;

function buildSelect(clientsFragment) {
  return `*, ${clientsFragment}, ${BEN_SCORE}`.replace(/\s+/g, ' ').trim();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

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
    () => buildSelect(CLIENTS_WITH_COMPTES, true),
    () => buildSelect(CLIENTS_WITH_COMPTES, false),
    () => buildSelect(CLIENTS_ONLY, true),
    () => buildSelect(CLIENTS_ONLY, false),
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
    console.warn('[admin/transactions] fallback select *:', error.message);
    ({ data, error, count } = await run('*'));
  }

  if (error) {
    console.error('[admin/transactions]', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message, code: error.code },
    });
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return res.json({
    success: true,
    data: {
      items: data ?? [],
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
 * Liste d’alertes (table `public.alerts` si elle existe).
 * Sans table ou en cas d’erreur : liste vide et stats à zéro.
 */
app.get('/api/v1/admin/alerts', async (_req, res) => {
  const empty = {
    items: [],
    total: 0,
    stats: { pending: 0, confirmedFraud: 0, falsePositives: 0 },
  };

  let data;
  let error;
  let count;
  ({ data, error, count } = await supabase
    .from('alerts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100));
  if (error) {
    ({ data, error, count } = await supabase.from('alerts').select('*', { count: 'exact' }).limit(100));
  }
  if (error) {
    console.warn('[admin/alerts]', error.message);
    return res.json({ success: true, data: empty });
  }

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
      if ((s.includes('confirm') && s.includes('fraud')) || s.includes('fraude_confirm') || s === 'confirmed_fraud') {
        confirmedFraud++;
      } else if (s.includes('false') || s.includes('faux') || s === 'false_positive') {
        falsePositives++;
      } else {
        pending++;
      }
    }
  }

  return res.json({
    success: true,
    data: {
      items,
      total,
      stats: {
        pending,
        confirmedFraud,
        falsePositives,
      },
    },
  });
});

const server = app.listen(PORT, () => {
  console.log(
    `Mokengeli backend http://localhost:${PORT} (GET /api/v1/admin/transactions, GET /api/v1/admin/alerts)`,
  );
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
