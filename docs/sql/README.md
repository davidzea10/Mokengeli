# SQL MOKENGELI

Les scripts **versionnés** sont maintenus dans **`../infra/sql/`** (source unique).

| Fichier | Rôle |
|--------|------|
| `001_mokengeli_schema.sql` | Tables, contraintes, FK |
| `002_profiling_aggregates.sql` | Fonctions d’agrégats profilage / graphe, index, vue journalière |
| `003_integrity_verification.sql` | Inventaire contraintes + tests d’intégrité (SQL Editor) |
| `004_beneficiaires.sql` | Table `beneficiaires` + colonne `transactions.beneficiaire_id` |
| `005_auth_solde_geo.sql` | Nom, hash MDP, adresse client ; solde compte ; coordonnées sur transactions |

Ordre d’exécution : **001** → **002** → **003** (optionnel) → **004** (optionnel) → **005** (optionnel).
