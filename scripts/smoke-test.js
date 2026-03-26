/**
 * Tests smoke locaux (HTTPS, cert interne) — NODE_TLS_REJECT_UNAUTHORIZED=0 uniquement pour ce script.
 * Prérequis : serveur déjà démarré (npm run dev).
 *
 * Comportement (voir SMOKE_AUTH_MODE et AUTH_DISABLED dans backend/.env) :
 * - Mode sans JWT : routes métier sans Authorization.
 * - Mode JWT : JWT local (JWT_SECRET) ou Supabase Auth (SMOKE_AUTH_MODE=supabase).
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
const envResult = require('dotenv').config({ path: envPath });

const https = require('https');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const BASE = process.env.SMOKE_BASE_URL || 'https://127.0.0.1:3000';

/**
 * Mode des tests d’auth :
 * - auto : suit AUTH_DISABLED **lu dans le fichier .env** (évite les variables shell obsolètes)
 * - disabled : force le scénario sans JWT
 * - jwt : JWT signés localement (JWT_SECRET)
 * - supabase : tokens via Supabase Auth (signInWithPassword + access_token)
 */
function resolveAuthMode() {
  const explicit = (process.env.SMOKE_AUTH_MODE || 'auto').toLowerCase();
  if (explicit === 'jwt') return 'jwt';
  if (explicit === 'supabase') return 'supabase';
  if (explicit === 'disabled') return 'disabled';
  const fromFile = envResult.parsed?.AUTH_DISABLED;
  if (fromFile === 'true') return 'disabled';
  if (fromFile === 'false') return 'jwt';
  return process.env.AUTH_DISABLED === 'true' ? 'disabled' : 'jwt';
}

function req(method, pathUrl, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(pathUrl, BASE);
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    const r = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, text: d });
        }
      });
    });
    r.on('error', reject);
    if (body !== undefined && body !== null) {
      r.write(JSON.stringify(body));
    }
    r.end();
  });
}

const evaluateBody = {
  transaction_event: {
    metadata: {
      numero_transaction: 'TXN-SMOKE-001',
      id_client: 'C-501',
      montant: 1000,
      devise: 'CDF',
      type_transaction: 'P2P',
      canal: 'mobile',
    },
  },
};

const sessionBody = {
  client_id: 'C-501',
  canal: 'mobile',
};

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

function exitIfServerStillAuthDisabled() {
  return req('POST', '/api/v1/transactions/evaluate', evaluateBody).then((probe) => {
    if (probe.status === 200 && probe.json?.success === true) {
      console.error(`
Le serveur accepte POST /transactions/evaluate sans JWT (200).
Le backend tourne probablement encore avec AUTH_DISABLED=true.

Pour tester l’auth JWT / Supabase :
  1. Mets AUTH_DISABLED=false dans backend/.env
  2. Pour Supabase : définis aussi SUPABASE_JWT_SECRET (Dashboard → Settings → API → JWT Secret)
  3. Redémarre le serveur (npm run dev)
  4. Relance ce script
`.trim());
      process.exit(1);
    }
  });
}

/** Tests métier avec deux Bearer tokens (JWT local ou access_token Supabase). */
async function runJwtBearerScenarioTests(tokenSimulation, tokenAnalyste, desc) {
  const results = [];

  let r = await req('GET', '/health');
  results.push([
    `GET /health (sans Bearer) [${desc}]`,
    r.status === 200 && r.json?.success === true,
  ]);

  r = await req('GET', '/api/v1/health');
  results.push([
    `GET /api/v1/health (sans Bearer) [${desc}]`,
    r.status === 200 && r.json?.success === true,
  ]);

  r = await req('GET', '/health/supabase');
  results.push([
    `GET /health/supabase (sans Bearer) [${desc}]`,
    r.status === 200 && r.json?.success === true,
  ]);

  r = await req('POST', '/api/v1/transactions/evaluate', evaluateBody);
  results.push([
    `POST .../evaluate sans Authorization → 401 [${desc}]`,
    r.status === 401 && r.json?.success === false,
  ]);

  r = await req(
    'POST',
    '/api/v1/transactions/evaluate',
    evaluateBody,
    authHeader(tokenSimulation)
  );
  results.push([
    `POST .../evaluate Bearer simulation → 200 [${desc}]`,
    r.status === 200 && r.json?.success === true,
  ]);

  r = await req(
    'POST',
    '/api/v1/transactions/evaluate',
    evaluateBody,
    authHeader(tokenAnalyste)
  );
  results.push([
    `POST .../evaluate Bearer analyste → 403 [${desc}]`,
    r.status === 403 && r.json?.success === false,
  ]);

  r = await req('POST', '/api/v1/sessions', sessionBody, authHeader(tokenSimulation));
  results.push([
    `POST .../sessions Bearer simulation → 201 [${desc}]`,
    r.status === 201 && r.json?.success === true,
  ]);

  r = await req('POST', '/api/v1/sessions', sessionBody, authHeader(tokenAnalyste));
  results.push([
    `POST .../sessions Bearer analyste → 403 [${desc}]`,
    r.status === 403 && r.json?.success === false,
  ]);

  r = await req('GET', '/api/v1/admin/transactions', null, authHeader(tokenSimulation));
  results.push([
    `GET .../admin Bearer simulation → 403 [${desc}]`,
    r.status === 403 && r.json?.success === false,
  ]);

  r = await req('GET', '/api/v1/admin/transactions', null, authHeader(tokenAnalyste));
  results.push([
    `GET .../admin Bearer analyste → 200 [${desc}]`,
    r.status === 200 && r.json?.success === true,
  ]);

  r = await req('GET', '/api/v1/admin/transactions');
  results.push([
    `GET .../admin sans JWT → 401 [${desc}]`,
    r.status === 401 && r.json?.success === false,
  ]);

  return results;
}

async function runSmokeAuthDisabled() {
  const results = [];

  let r = await req('GET', '/health');
  results.push(['GET /health', r.status === 200 && r.json?.success === true]);

  r = await req('GET', '/api/v1/health');
  results.push(['GET /api/v1/health', r.status === 200 && r.json?.success === true]);

  r = await req('GET', '/health/supabase');
  results.push([
    'GET /health/supabase',
    r.status === 200 && r.json?.success === true,
  ]);

  r = await req('POST', '/api/v1/transactions/evaluate', evaluateBody);
  results.push([
    'POST /api/v1/transactions/evaluate',
    r.status === 200 && r.json?.success === true,
  ]);

  r = await req('POST', '/api/v1/sessions', sessionBody);
  results.push([
    'POST /api/v1/sessions',
    (r.status === 200 || r.status === 201) && r.json?.success === true,
  ]);

  r = await req('GET', '/api/v1/admin/transactions');
  results.push([
    'GET /api/v1/admin/transactions',
    r.status === 200 && r.json?.success === true,
  ]);

  return results;
}

async function runSmokeJwt() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error(
      'JWT_SECRET manquant dans backend/.env (requis pour SMOKE_AUTH_MODE=jwt).'
    );
    process.exit(1);
  }

  await exitIfServerStillAuthDisabled();

  const tokenSimulation = jwt.sign(
    { role: 'simulation', sub: 'smoke-test' },
    secret,
    { expiresIn: '10m' }
  );
  const tokenAnalyste = jwt.sign(
    { role: 'analyste', sub: 'smoke-test' },
    secret,
    { expiresIn: '10m' }
  );

  return runJwtBearerScenarioTests(tokenSimulation, tokenAnalyste, 'JWT local');
}

async function runSmokeSupabase() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const emSim = process.env.SMOKE_SUPABASE_EMAIL_SIMULATION;
  const pwSim = process.env.SMOKE_SUPABASE_PASSWORD_SIMULATION;
  const emAna = process.env.SMOKE_SUPABASE_EMAIL_ANALYSTE;
  const pwAna = process.env.SMOKE_SUPABASE_PASSWORD_ANALYSTE;

  if (!url || !anon) {
    console.error(
      'SUPABASE_URL et SUPABASE_ANON_KEY requis dans backend/.env pour SMOKE_AUTH_MODE=supabase.'
    );
    process.exit(1);
  }
  if (!emSim || !pwSim || !emAna || !pwAna) {
    console.error(`
Variables smoke Supabase manquantes. Ajoute dans backend/.env :
  SMOKE_SUPABASE_EMAIL_SIMULATION=...
  SMOKE_SUPABASE_PASSWORD_SIMULATION=...
  SMOKE_SUPABASE_EMAIL_ANALYSTE=...
  SMOKE_SUPABASE_PASSWORD_ANALYSTE=...

Côté Supabase : deux utilisateurs Auth avec en métadonnées utilisateur la clé
  mokengeli_role = "simulation" ou "analyste" (voir README).
`.trim());
    process.exit(1);
  }

  await exitIfServerStillAuthDisabled();

  const supabase = createClient(url, anon);

  const { data: d1, error: e1 } = await supabase.auth.signInWithPassword({
    email: emSim,
    password: pwSim,
  });
  if (e1 || !d1.session) {
    console.error('Connexion utilisateur simulation :', e1?.message || 'pas de session');
    process.exit(1);
  }
  const tokenSimulation = d1.session.access_token;

  const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
    email: emAna,
    password: pwAna,
  });
  if (e2 || !d2.session) {
    console.error('Connexion utilisateur analyste :', e2?.message || 'pas de session');
    process.exit(1);
  }
  const tokenAnalyste = d2.session.access_token;

  return runJwtBearerScenarioTests(tokenSimulation, tokenAnalyste, 'Supabase Auth');
}

function modeLabel(mode) {
  if (mode === 'disabled') return 'sans JWT (routes métier ouvertes)';
  if (mode === 'supabase') return 'Supabase Auth (access_token + mokengeli_role)';
  return 'JWT local (JWT_SECRET)';
}

async function main() {
  const mode = resolveAuthMode();

  console.log(
    `Mode : ${modeLabel(mode)} — SMOKE_AUTH_MODE=${process.env.SMOKE_AUTH_MODE || 'auto'}, AUTH_DISABLED (.env)=${envResult.parsed?.AUTH_DISABLED ?? 'non défini'}\n`
  );

  const results =
    mode === 'disabled'
      ? await runSmokeAuthDisabled()
      : mode === 'supabase'
        ? await runSmokeSupabase()
        : await runSmokeJwt();

  let failed = false;
  for (const [name, ok] of results) {
    const line = ok ? 'OK  ' : 'FAIL';
    console.log(`[${line}] ${name}`);
    if (!ok) failed = true;
  }

  if (failed) {
    console.error('\nUn ou plusieurs tests ont échoué.');
    process.exit(1);
  }
  console.log('\nTous les tests smoke sont passés.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
