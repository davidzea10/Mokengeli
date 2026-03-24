# Collection Postman — MOKENGELI

1. Ouvrir Postman → **Import** → fichier `MOKENGELI-API.postman_collection.json`.
2. Variable de collection **`baseUrl`** : `http://localhost:3000` (ou l’URL Render en prod).
3. Démarrer le backend : `cd backend && npm run dev`.

Endpoints inclus : `GET /health`, `GET /api/v1/health`, `POST /api/v1/transactions/evaluate`, `POST /api/v1/sessions`, `GET /api/v1/admin/transactions`.
