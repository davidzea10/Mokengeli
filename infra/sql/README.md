# Scripts SQL MOKENGELI

| Ordre | Fichier | Contenu |
|------|---------|---------|
| 1 | **`001_mokengeli_schema.sql`** | Tables alignées sur `Docs/StructureBdd.tex`, `analyst_feedback`, `policy_config` |
| 2 | **`002_profiling_aggregates.sql`** | Index, fonctions d’agrégats (vitesse 24 h, médiane 30 j, graphe, vue journalière) |

Copie miroir des références : `docs/sql/README.md` pointe ici.

## Exécution (Supabase)

1. Dashboard Supabase → **SQL Editor** → **New query**.
2. Exécuter **`001`** puis **`002`** dans l’ordre (le 2 dépend des tables du 1).
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
