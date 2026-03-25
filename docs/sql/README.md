# SQL MOKENGELI

Les scripts **versionnés** sont maintenus dans **`../infra/sql/`** (source unique).

| Fichier | Rôle |
|--------|------|
| `001_mokengeli_schema.sql` | Tables, contraintes, FK |
| `002_profiling_aggregates.sql` | Fonctions d’agrégats profilage / graphe, index, vue journalière |
| `003_integrity_verification.sql` | Inventaire contraintes + tests d’intégrité (SQL Editor) |

Ordre d’exécution : **001** puis **002** puis **003** (optionnel).
