# MOKENGELI — Backend

API Node.js + Express, structure **MVC** + couche **services**.

## Démarrage

```bash
cp .env.example .env
npm install
npm run dev
```

- Santé : `GET http://localhost:3000/api/v1/health`

## Étape 4.1 — Santé API et Supabase

**Objectif** : vérifier que l’API répond et que les variables Supabase sont chargées ; optionnellement que le projet Supabase répond (Auth `/health`).

| Méthode | Endpoint | Rôle |
|--------|----------|------|
| `GET` | `/health` | Healthcheck sans préfixe (Render, Docker, load balancer) |
| `GET` | `/api/v1/health` | Même chose que `/health`, sous préfixe API |
| `GET` | `/health/supabase` | Ping distant Supabase (`auth/v1/health`) |
| `GET` | `/api/v1/health/supabase` | Idem, sous préfixe `/api/v1` |

**Réponse type** (`success: true`) : `data.status`, `data.service`, `data.environment`, `data.apiVersion`, `data.timestamp`, `data.supabase.configured` ; pour les routes Supabase, `data.supabase.reachable` et `authHealth` si OK.

**Postman** : `docs/postman/MOKENGELI-API.postman_collection.json` — importer les 4 premières requêtes (Health racine, Health v1, 4.1 Supabase API v1, Supabase ping racine) → **Send** sur chacune ou **Run** sur la collection en ne sélectionnant que ces requêtes. Vérifier **Tests** verts et corps JSON.

## Étape 4.2 — Contexte client et soldes (`GET /me`)

**Objectif** : retourner le **client**, ses **comptes** avec **`solde_disponible`** et un **`solde_total`** (somme des comptes). Identification **démo** par query : `reference_client` (sans JWT pour l’instant).

| Méthode | Endpoint | Rôle |
|--------|----------|------|
| `GET` | `/api/v1/me?reference_client=<REF>` | Profil client + liste des comptes + soldes |

**Prérequis Supabase** : migrations **001** et **005** (colonnes `nom_complet`, adresse, `solde_disponible`, etc.). Un enregistrement dans `clients` avec la même `reference_client` que le paramètre (ex. `C-501`), et au moins un `comptes_bancaires` lié.

**Réponse** (`success: true`) : `data.client`, `data.comptes[]` (avec `solde_disponible` par compte), `data.solde_total`.

**Erreurs** : `404` client inconnu ; `503` si Supabase non configuré ; `422` si `reference_client` manquant.

**Postman** : requête **« 4.2 — Contexte client + comptes (GET /me) »** — adapter `reference_client` à une ligne réelle de ta base.

## Étape 4.3 — Bénéficiaires (banque ou mobile money)

**Prérequis** : migration **`004_beneficiaires.sql`** (table `beneficiaires`).

| Méthode | Endpoint | Rôle |
|--------|----------|------|
| `POST` | `/api/v1/beneficiaires` | Créer un bénéficiaire (`mode`: `compte_bancaire` ou `mobile_money`) |
| `GET` | `/api/v1/beneficiaires?limit=50` | Liste (tri par `created_at` desc, `limit` 1–100) |
| `GET` | `/api/v1/beneficiaires/:id` | Détail par UUID |

**Corps POST (banque)** : `mode`, `compte_identifiant`, optionnel `banque_code`, `titulaire_compte`, optionnel `reference_client_lie` (référence métier d’un client existant → `client_lie_id`).

**Corps POST (mobile)** : `mode`, `telephone`, optionnel `operateur_mobile`, optionnel `reference_client_lie`.

**Réponses** : `201` + `data` à la création ; `404` si `reference_client_lie` ne correspond à aucun client.

**Postman** : requêtes **4.3** (POST banque, POST mobile, GET liste, GET par id — variable `beneficiaireId` remplie après POST banque).

## Étape 4.4 — Sessions (`POST /api/v1/sessions`)

**Prérequis** : table **`sessions`** (migration **001**), client existant.

| Méthode | Endpoint | Rôle |
|--------|----------|------|
| `POST` | `/api/v1/sessions` | **Créer** une session (`reference_client` **ou** `client_id` UUID) + optionnel `canal`, `adresse_ip` → **201** |
| `POST` | `/api/v1/sessions` | **Mettre à jour** : `session_id` + `canal` / `adresse_ip` → **200** |

**Corps création** : `{ "reference_client": "C-501", "canal": "mobile", "adresse_ip": "..." }` **ou** `{ "client_id": "<uuid>", ... }`.

**Corps mise à jour** : `{ "session_id": "<uuid>", "canal": "web", "adresse_ip": "..." }`.

**Réponse** : `data.session` (id, client_id, date_debut, canal, adresse_ip), `data.operation` (`created` | `updated`).

**Postman** : **4.4 — POST session (nouvelle)** puis **4.4 — POST session (mise à jour)** (variable `sessionId`).

## Étape 4.5 — Évaluation transaction + persistance (`POST /api/v1/transactions/evaluate`)

**Objectif** : après calcul des features et du scoring (M1/M2/M3 + décision), **enregistrer** la transaction, les tables satellites et `scores_evaluation` lorsque les métadonnées sont complètes ; sinon la réponse reste **200** avec `data.persistence.status: "skipped"`.

**Prérequis** : Supabase configuré ; migrations **001**, **004** (bénéficiaire sur `transactions`), **005** (géolocalisation / soldes) selon les champs utilisés.

**Corps** : `transaction_event.metadata` doit contenir au minimum `numero_transaction`, `id_client` (référence métier), `montant`, `devise` pour déclencher la persistance. Optionnel à la racine : `session_id`, `beneficiaire_id`, `compte_id`, `latitude_debit` / `longitude_debit`, `latitude_credit` / `longitude_credit`.

**Réponse** (`success: true`) : `data.scoring`, `data.features_preview`, `data.persistence` — `status` : `persisted` (avec `transaction_id`, `numero_transaction`) ou `skipped` (avec `reason` : métadonnées incomplètes, Supabase absent, etc.).

**Erreurs** (échec métier de persistance) : `404` client ou bénéficiaire inconnu ; `400` compte invalide, session incohérente, fonds insuffisants ; `409` numéro de transaction déjà enregistré ; `422` date de transaction invalide ; `503` base indisponible ; `500` erreur SQL.

**Postman** : **Transactions — Evaluate** (corps minimal) ; **4.5 — POST evaluate (persistance)** après **4.4** (session) et éventuellement **4.3** (bénéficiaire) — `numero_transaction` unique (timestamp dans l’exemple). Pour rejouer la requête minimale sans **409**, changer `numero_transaction` à chaque envoi.

## Étape 4.6 — Back-office analyste (liste / détail transactions)

**Objectif** : exposer les **transactions évaluées** pour l’audit : liste **paginée** avec filtres optionnels, et **détail** avec client, compte, session, bénéficiaire, carte, **scores** et les **six tables satellites** (aligné sur le plan de travail, « routes liste/détail admin »).

| Méthode | Endpoint | Rôle |
|--------|----------|------|
| `GET` | `/api/v1/admin/transactions` | Liste (`page`, `limit`, optionnel `client_id`, `decision`, `date_from`, `date_to`) |
| `GET` | `/api/v1/admin/transactions/:id` | Détail par UUID |

**Prérequis** : Supabase + migrations **001** (et **005** pour colonnes étendues client/compte). Les lignes proviennent surtout de l’**étape 4.5** (`POST /evaluate` avec persistance).

**Réponse liste** (`success: true`) : `data.items`, `data.total`, `data.page`, `data.limit`, `data.totalPages`.

**Réponse détail** : objet transaction enrichi (jointures + satellites + `scores_evaluation` ; `texte_motifs` peut être exposé comme JSON parsé en `reason_codes` côté service).

**Erreurs** : `400` UUID invalide ; `404` transaction absente ; `503` Supabase non configuré ; `422` paramètres de requête invalides (Zod).

**Postman** : **4.6 — Admin liste transactions** ; **4.6 — Admin détail transaction** (variable `transactionId`, remplie après **4.5** si persistance `persisted`).

## Structure

Voir `docs/Architecture-backend.tex` (référence projet) — dossiers sous `src/` : `config`, `routes`, `controllers`, `services`, `models`, `views`, `middlewares`, `utils`, `validators`.

## Étape 2 (API REST)

- Préfixe **`/api/v1`** + réponses JSON uniformes `{ success, data }` / `{ success, error }`.
- Validation **Zod** sur `POST .../transactions/evaluate` et `POST .../sessions`.
- **`GET /health`** (racine) et **`GET /api/v1/health`** — même réponse JSON.
- Logs HTTP : **pino** + **pino-http** (niveau `LOG_LEVEL` dans `.env`).
- Collection Postman : **`docs/postman/MOKENGELI-API.postman_collection.json`** (à la racine du dépôt `Mokengeli`).
