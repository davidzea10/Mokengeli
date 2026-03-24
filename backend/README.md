# MOKENGELI — Backend

API Node.js + Express, structure **MVC** + couche **services**.

## Démarrage

```bash
cp .env.example .env
npm install
npm run dev
```

- Santé : `GET http://localhost:3000/api/v1/health`

## Structure

Voir `docs/Architecture-backend.tex` (référence projet) — dossiers sous `src/` : `config`, `routes`, `controllers`, `services`, `models`, `views`, `middlewares`, `utils`, `validators`.

## Étape 2 (API REST)

- Préfixe **`/api/v1`** + réponses JSON uniformes `{ success, data }` / `{ success, error }`.
- Validation **Zod** sur `POST .../transactions/evaluate` et `POST .../sessions`.
- **`GET /health`** (racine) et **`GET /api/v1/health`** — même réponse JSON.
- Logs HTTP : **pino** + **pino-http** (niveau `LOG_LEVEL` dans `.env`).
- Collection Postman : **`docs/postman/MOKENGELI-API.postman_collection.json`** (à la racine du dépôt `Mokengeli`).
