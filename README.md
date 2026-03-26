# MOKENGELI — Backend

API Node.js + Express, structure **MVC** + couche **services**.

Plateforme d’intelligence artificielle prédictive anti-fraude en temps réel — Hackathon RawBank.

## Structure du dépôt

| Dossier | Rôle |
|--------|------|
| `backend/` | API Node.js + Express |
| `frontend/client/` | Application React — parcours client (démo) |
| `frontend/admin/` | Application React — back-office analyste |
| `docs/` | Cahier des charges, MERISE, UML, plan de travail |
| `ml/` | Notebooks Jupyter, scripts, exports modèles |

## Équipe

Brainsoft — voir le dépôt pour les contributeurs.

## Démarrage

```bash
cp .env.example .env
npm install
npm run dev
```

- **Deux chemins** (même routes Express) :
  - **Public** (hackathon / Vercel) : HTTPS **sans** cert client, port **`PORT`** (défaut **3000**). `GET /health` → `{ success, data: { status: "ok", ... } }`.
  - **mTLS** (optionnel) : `MTLS_ENABLED=true`, port **`MTLS_PORT`** (défaut **8443**), cert client obligatoire. `GET /health` → `{ "status": "secure", "mtls": true }`.
- Certificats serveur : `certs/server.crt`, `certs/server.key` ; pour mTLS uniquement : `certs/ca-chain.crt`.

### Tests smoke (`npm run test:smoke`)

Le serveur doit déjà tourner (`npm run dev`). Le script lit `backend/.env`.

| Condition | Comportement |
|-----------|--------------|
| `AUTH_DISABLED=true` dans `.env` et `SMOKE_AUTH_MODE=auto` (défaut) | Health + routes métier **sans** JWT. |
| `AUTH_DISABLED=false` dans `.env` et `SMOKE_AUTH_MODE=auto` | JWT + tests 401 / 403 / rôles `simulation` / `analyste`. |
| `SMOKE_AUTH_MODE=disabled` | Force le scénario sans JWT (ignore la ligne `AUTH_DISABLED` du fichier). |
| `SMOKE_AUTH_MODE=jwt` | JWT signés localement avec `JWT_SECRET`. |
| `SMOKE_AUTH_MODE=supabase` | `signInWithPassword` + `access_token` (voir variables `SMOKE_SUPABASE_*`). |

Si tu forces le mode JWT / Supabase alors que le serveur accepte encore les requêtes sans JWT, le script s’arrête avec un message explicite (redémarrer le backend après avoir mis `AUTH_DISABLED=false` et `SUPABASE_JWT_SECRET` si besoin).

### Auth Supabase (JWT générés par Supabase Auth)

1. **Dashboard Supabase** → *Authentication* → créer **deux** utilisateurs (ex. un pour la simulation, un pour l’analyste).
2. Pour chaque utilisateur → *User Metadata* (JSON) :  
   `{ "mokengeli_role": "simulation" }` ou `{ "mokengeli_role": "analyste" }`  
   (tu peux aussi utiliser *App Metadata* avec la même clé.)
3. Dans `backend/.env` côté serveur : **`SUPABASE_JWT_SECRET`** = *Settings → API → JWT Secret* (pas la `service_role` ni l’`anon`). **`AUTH_DISABLED=false`**.
4. Tests smoke avec tokens réels : ajoute **`SUPABASE_ANON_KEY`**, les quatre variables **`SMOKE_SUPABASE_*`**, puis :  
   `SMOKE_AUTH_MODE=supabase npm run test:smoke`  
   (sous Windows : `set SMOKE_AUTH_MODE=supabase` puis `npm run test:smoke`).

L’API accepte toujours les **JWT locaux** signés avec **`JWT_SECRET`** si tu les utilises encore en parallèle.

## Structure

Voir `docs/Architecture-backend.tex` (référence projet) — dossiers sous `src/` : `config`, `routes`, `controllers`, `services`, `models`, `views`, `middlewares`, `utils`, `validators`.

## Étape 2 (API REST)

- Préfixe **`/api/v1`** + réponses JSON uniformes `{ success, data }` / `{ success, error }`.
- Validation **Zod** sur `POST .../transactions/evaluate` et `POST .../sessions`.
- **`GET /health`** (racine) et **`GET /api/v1/health`** — même réponse JSON.
- Logs HTTP : **pino** + **pino-http** (niveau `LOG_LEVEL` dans `.env`).
- Collection Postman : **`docs/postman/MOKENGELI-API.postman_collection.json`** (à la racine du dépôt `Mokengeli`).
