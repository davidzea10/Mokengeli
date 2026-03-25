# Collection Postman — MOKENGELI

1. Ouvrir Postman → **Import** → fichier `MOKENGELI-API.postman_collection.json`.
2. Variable de collection **`baseUrl`** : `http://localhost:3000` (ou l’URL Render en prod).
3. Démarrer le backend : `cd backend && npm run dev`.

Endpoints inclus : `GET /health`, `GET /api/v1/health`, `GET /health/supabase`, `POST /api/v1/transactions/evaluate`, `POST /api/v1/sessions`, `GET /api/v1/admin/transactions`, `GET /api/v1/admin/transactions/:id`.

## Étape 4.1 — Santé + Supabase

1. Démarrer le backend : `cd backend && npm run dev`.
2. Vérifier `.env` : `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (pour `configured` / `reachable`).
3. Dans Postman, exécuter dans l’ordre (ou **Run** sur ces seules requêtes) :
   - **Health (racine)** → `GET {{baseUrl}}/health`
   - **Health API v1** → `GET {{baseUrl}}/api/v1/health`
   - **4.1 — Supabase ping (API v1)** → `GET {{baseUrl}}/api/v1/health/supabase`
   - **Supabase — ping (racine)** → `GET {{baseUrl}}/health/supabase`
4. Attendu : statut **200**, `success: true` ; pour Supabase, `data.supabase.configured: true` et en général `reachable: true`.

## Étape 4.2 — GET /me

1. Avoir un **client** en base (`reference_client` connue, ex. `C-501`) et au moins un **compte** avec `solde_disponible` (migrations **001 + 005**).
2. Requête **4.2 — Contexte client + comptes** : `GET {{baseUrl}}/api/v1/me?reference_client=C-501` (ajuster la valeur).
3. Attendu : **200**, `data.client`, `data.comptes`, `data.solde_total`.

## Étape 4.3 — Bénéficiaires

1. Table **`beneficiaires`** en base (script **004**).
2. **POST** `/api/v1/beneficiaires` avec `mode` + champs requis → **201**.
3. **GET** `/api/v1/beneficiaires` → liste dans `data.beneficiaires`.
4. **GET** `/api/v1/beneficiaires/{uuid}` — utiliser l’`id` renvoyé par le POST (la collection enregistre **`beneficiaireId`** après le POST banque).

## Étape 4.4 — Sessions

1. **POST** `/api/v1/sessions` avec `reference_client` + `canal` (+ `adresse_ip` optionnel) → **201**, `data.session.id`.
2. **POST** `/api/v1/sessions` avec `session_id` + champs à mettre à jour → **200**, `operation: "updated"`.

Variable Postman **`sessionId`** remplie après la première requête 4.4.

## Étape 4.5 — POST /transactions/evaluate (persistance)

1. Migrations **001** (+ **004** / **005** si bénéficiaire ou géo) et Supabase configuré.
2. **Transactions — Evaluate** : scoring + `data.persistence` (`persisted` ou `skipped`).
3. **4.5 — POST evaluate (persistance)** : après **4.4**, `session_id` utilise `{{sessionId}}` ; `numero_transaction` unique via `{{$timestamp}}`. Si la session est vide, retirer `session_id` du corps JSON pour éviter une erreur de validation UUID.

## Étape 4.6 — Admin (liste / détail transactions)

1. Au moins une transaction persistée (4.5) ou un UUID connu en base.
2. **4.6 — Admin liste transactions** : `GET` avec query optionnelle `?page=1&limit=20&decision=allow` (filtre `decision` : uniquement les lignes ayant un score en base).
3. **4.6 — Admin détail transaction** : `GET` avec `{{transactionId}}` (rempli automatiquement après un **4.5** réussi avec persistance, ou coller un UUID depuis la liste).

## Tests automatiques (point 6)

Chaque requête inclut des scripts **Tests** (onglet **Tests** après exécution).

- **Collection** → bouton **Run** (Runner) → sélectionner toutes les requêtes → **Run MOKENGELI API** : vérifier que toutes les cases sont vertes (statut HTTP + JSON `success`).

Complément côté base : `infra/sql/003_integrity_verification.sql` dans le **SQL Editor** Supabase (contraintes FK + unicité `numero_transaction`).
