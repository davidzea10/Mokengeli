# Collection Postman — MOKENGELI

1. Ouvrir Postman → **Import** → fichier `MOKENGELI-API.postman_collection.json`.
2. Variable de collection **`baseUrl`** : `http://localhost:3000` (ou l’URL Render en prod).
3. Démarrer le backend : `cd backend && npm run dev`.

Endpoints inclus : `GET /health`, `GET /api/v1/health`, `GET /health/supabase`, `POST /api/v1/transactions/evaluate`, `POST /api/v1/sessions`, `GET /api/v1/admin/transactions`.

## Tests automatiques (point 6)

Chaque requête inclut des scripts **Tests** (onglet **Tests** après exécution).

- **Collection** → bouton **Run** (Runner) → sélectionner toutes les requêtes → **Run MOKENGELI API** : vérifier que toutes les cases sont vertes (statut HTTP + JSON `success`).

Complément côté base : `infra/sql/003_integrity_verification.sql` dans le **SQL Editor** Supabase (contraintes FK + unicité `numero_transaction`).
