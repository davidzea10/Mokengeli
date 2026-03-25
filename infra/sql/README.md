# Scripts SQL MOKENGELI

| Ordre | Fichier | Contenu |
|------|---------|---------|
| 1 | **`001_mokengeli_schema.sql`** | Tables alignées sur `Docs/StructureBdd.tex`, `analyst_feedback`, `policy_config` |
| 2 | **`002_profiling_aggregates.sql`** | Index, fonctions d’agrégats (vitesse 24 h, médiane 30 j, graphe, vue journalière) |
| 3 | **`003_integrity_verification.sql`** | Inventaire contraintes (FK, UNIQUE) + tests négatifs `numero_transaction` / FK (transaction rollback) |

Copie miroir des références : `docs/sql/README.md` pointe ici.

## Point 5 — Intégrité (résumé)

Défini dans **`001`** :

- **FK** : chaîne `clients` → `comptes_bancaires` → `cartes_bancaires` ; `sessions` → `clients` ; `transactions` → `clients`, `comptes_bancaires`, `cartes_bancaires` (optionnel), `sessions` (optionnel) ; satellites + `scores_evaluation` + `cibles_entrainement` + `analyst_feedback` → `transactions`.
- **Unicité** : `transactions.numero_transaction` (`transactions_numero_transaction_unique`), `clients.reference_client`, `comptes_bancaires (client_id, numero_compte)`, `policy_config.cle`.

Vérification : exécuter **`003`** (sections A–B = lecture ; section C = tests automatiques avec `ROLLBACK`).

## Exécution (Supabase)

1. Dashboard Supabase → **SQL Editor** → **New query**.
2. Exécuter **`001`**, puis **`002`**, puis **`003`** (optionnel, après coup pour valider l’intégrité).
3. Extension **`pgcrypto`** : si erreur sur `CREATE EXTENSION`, activer dans **Database → Extensions**, ou retirer la ligne si `gen_random_uuid` est déjà disponible.

Base vide recommandée pour le **001** (pas de `DROP`). Le **002** peut être rejoué si les objets utilisent `CREATE OR REPLACE` / `IF NOT EXISTS` (indexes).

## Exemples (SQL Editor)

```sql
-- Toutes les features profilage + graphe pour un client à l’instant `now()`
SELECT *
FROM public.fn_profiling_features_depuis_historique(
  '00000000-0000-0000-0000-000000000001'::uuid,
  45000::numeric,
  now(),
  'BEN-REF-001',
  NULL
);

-- Agrégats journaliers (vue)
SELECT * FROM public.v_historique_client_journalier LIMIT 20;
```

## Point 6 — Tests (SQL Editor + Postman)

| Où | Quoi |
|----|------|
| **SQL Editor** | Coller tout **`003_integrity_verification.sql`** → **Run** : tableaux d’inventaire des contraintes ; notices `PASS: …` pour les tests C (sans persister de données grâce au `ROLLBACK`). |
| **Postman** | Importer `docs/postman/MOKENGELI-API.postman_collection.json` → **Collection** → **Run** (Runner) : les scripts **Tests** vérifient statut 200 et `success` sur chaque requête. Backend local : `cd backend && npm run dev`. |

Détail : `docs/postman/README.md`.
