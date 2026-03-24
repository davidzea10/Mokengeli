# SQL MOKENGELI

Les scripts **versionnés** sont maintenus dans **`../infra/sql/`** (source unique).

| Fichier | Rôle |
|--------|------|
| `001_mokengeli_schema.sql` | Tables, contraintes, FK |
| `002_profiling_aggregates.sql` | Fonctions d’agrégats profilage / graphe, index, vue journalière |

Ordre d’exécution : **001** puis **002**.
