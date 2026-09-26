# MOKENGELI

Plateforme d’intelligence artificielle prédictive anti-fraude en temps réel.

## Structure du dépôt

| Dossier | Rôle |
|--------|------|
| `backend/` | API Node.js + Express |
| `frontend/client/` | Application React — parcours client |
| `frontend/admin/` | Application React — back-office analyste |
| `docs/` | Documentation technique |
| `ml/` | Artefacts et scripts des modèles |

## Équipe

Brainsoft — voir le dépôt pour les contributeurs.

## Démarrage

```bash
cp .env.example .env
# Renseigner SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans backend/.env
npm install
npm --prefix backend run dev
npm --prefix frontend/client run dev
npm --prefix frontend/admin run dev
```

- Backend local : port **`PORT`** (défaut **3002** via `backend/.env`)
- Client : http://localhost:5174
- Admin : http://localhost:5173

### Auth

Par défaut `AUTH_DISABLED=true` pour la démo locale. Les clients se connectent avec référence / e-mail / téléphone + `password_hash` (bcrypt) en base.

### Modèles

- **M1** : fraude transactionnelle (`ml/Transaction/log_reg.joblib`)
- **M2 / M3** : session et comportement (heuristiques branchées sur les features live)
