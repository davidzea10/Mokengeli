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
