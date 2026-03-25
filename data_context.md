# Contexte des données — portail client (`/client`)

Ce document décrit **comment les données sont préparées et envoyées** depuis le frontend vers le backend pour la page **simulateur client** (`http://localhost:5173/client`). Il sert de référence pour l’implémentation côté API et l’alignement avec `docs/transaction_schema.json`.

---

## 1. Vue d’ensemble

| Élément | Rôle |
|--------|------|
| **Code source** | `mokengeli-frontend/src/api/` (contrats, construction des payloads, HTTP) |
| **Page React** | `mokengeli-frontend/src/pages/Client.tsx` |
| **Format** | JSON, clés en **anglais**, `Content-Type: application/json` |
| **Journalisation** | Chaque envoi est d’abord affiché dans la **console** du navigateur sous la forme `[Mokengeli API] POST <chemin>`, puis un `fetch` POST est tenté **uniquement si** la base URL API est configurée. |

---

## 2. Configuration

- Variable d’environnement : **`VITE_API_BASE_URL`** (URL du backend, **sans** slash final).
- Exemple : `VITE_API_BASE_URL=http://localhost:8000`
- Fichier d’exemple : `mokengeli-frontend/.env.example`
- Si `VITE_API_BASE_URL` est **vide ou absente** : aucune requête HTTP n’est émise ; les payloads restent visibles dans la console (mode frontend seul).

---

## 3. Comportement d’envoi

1. **Construction** du corps JSON typé (`contracts.ts`, `transactionPayloadEnglish.ts`, `buildTransactionPayload.ts`).
2. **`console.log`** : `JSON.stringify(payload, null, 2)` avec le préfixe `[Mokengeli API]`.
3. **`fetch` POST** (si base URL définie) : `POST {VITE_API_BASE_URL}{route}`, en-têtes `Content-Type: application/json` et `Accept: application/json`.
4. Les erreurs réseau ou HTTP non-2xx sont **journalisées** (`console.warn`) sans bloquer l’interface (démo locale).

---

## 4. Connexion — `POST /api/v1/client/login`

**Déclencheur** : soumission du formulaire « Connexion » (champs **Nom** et **Mot de passe**).

**Fonction** : `sendClientLogin` dans `src/api/clientPortal.ts`.

### Corps JSON

| Champ | Type | Description |
|-------|------|-------------|
| `name` | string | Identifiant saisi par l’utilisateur (nom / alias démo). |
| `password` | string | Mot de passe en clair (**à ne jamais logger en production** ; utiliser HTTPS). |
| `client_sent_at` | string (ISO 8601) | Horodatage généré côté client au moment de l’envoi. |

### Exemple

```json
{
  "name": "demo",
  "password": "demo123",
  "client_sent_at": "2026-03-25T12:38:28.586Z"
}
```

**Note** : la validation « comptes démo » (profils C-501, C-502, DEMO_01) reste **côté frontend** après cet envoi ; le backend peut implémenter sa propre authentification et sessions.

---

## 5. Déconnexion — `POST /api/v1/client/logout`

**Déclencheur** : clic sur **Déconnexion**.

**Fonction** : `sendClientLogout`.

### Corps JSON

| Champ | Type | Description |
|-------|------|-------------|
| `profile_id` | string | Identifiant de profil interne (ex. `DEMO_01`, `C-501`). |
| `user_display_name` | string | Nom affiché associé à la session. |
| `client_sent_at` | string (ISO 8601) | Horodatage côté client. |

---

## 6. Simulation de transaction — `POST /api/v1/client/transactions/simulate`

**Déclencheur** : clic sur **Simuler la transaction** (après contrôle du solde).

**Fonction** : `sendClientTransactionSimulation`.

### Enveloppe (niveau racine)

| Champ | Type | Description |
|-------|------|-------------|
| `kind` | literal | Toujours `"client_transaction_simulation"`. |
| `profile_id` | string | Profil connecté (ex. `DEMO_01`). |
| `user_display_name` | string | Nom affiché de l’utilisateur. |
| `client_sent_at` | string (ISO 8601) | Horodatage de l’envoi. |
| `beneficiary` | string | Bénéficiaire saisi dans le formulaire (chaîne vide → `"Unknown"`). |
| `account_balance_snapshot` | number | Solde disponible au moment de la simulation (FC). |
| `transaction` | object | Document transactionnel complet (voir ci-dessous). |

### Objet `transaction`

Il reprend la structure décrite dans **`docs/transaction_schema.json`** :

- **`transaction_event`** : métadonnées de l’opération, intelligence réseau, détection d’anonymisation, biométrie comportementale, features ingénierie, graphe relationnel, intégrité sécurité.
- **`target_labels`** : libellés cibles (ici valeurs par défaut `false` pour la démo ; le backend peut les recalculer).

Les champs détaillés du formulaire (montant, type, canal, cases à cocher) sont **mappés** dans `buildTransactionPayload.ts` vers ces sous-objets (clés en anglais).

### Exemple complet (illustratif)

```json
{
  "kind": "client_transaction_simulation",
  "profile_id": "DEMO_01",
  "user_display_name": "demo",
  "client_sent_at": "2026-03-25T12:39:01.336Z",
  "beneficiary": "89564235",
  "account_balance_snapshot": 10000000,
  "transaction": {
    "transaction_event": {
      "metadata": {
        "transaction_date": "2026-03-25T12:39:01.336Z",
        "transaction_number": "TXN-CLIENT-1774442341336",
        "client_id": "DEMO_01",
        "amount": 5000,
        "currency": "FC",
        "hour": 13,
        "weekday": 3,
        "transaction_type": "virement",
        "channel": "app"
      },
      "network_intelligence": {
        "ip_reputation_score": 0.85,
        "ip_datacenter": false,
        "unusual_country_ip": false,
        "ip_blacklisted": false
      },
      "anonymization_detection": {
        "tor_detected": false,
        "vpn_detected": false,
        "proxy_detected": false
      },
      "behavioral_biometrics_ueba": {
        "session_duration_min": 15,
        "session_screens_count": 3,
        "otp_delay_s": 45,
        "failed_logins_24h": 0,
        "typing_speed": 50,
        "mouse_entropy": 0.65,
        "requests_per_minute": 4
      },
      "engineered_features_profiling": {
        "velocity_24h": 5000,
        "amount_median_ratio_30d": 1,
        "new_beneficiary": false,
        "habit_distance_km": 5,
        "device_change": false
      },
      "relational_graph_features": {
        "client_degree": 3,
        "fraudulent_neighbors_count": 0,
        "network_score": 0.85
      },
      "security_integrity": {
        "transaction_signature_valid": true,
        "certificate_valid": true,
        "client_api_trust_score": 0.92
      }
    },
    "target_labels": {
      "fraud_target": false,
      "abnormal_session_target": false,
      "atypical_behavior_target": false
    }
  }
}
```

**Remarques** :

- `transaction_number` est généré côté client (`TXN-CLIENT-<timestamp>`) ; le backend peut le remplacer.
- Certaines valeurs (biométrie, graphe, sécurité) sont des **valeurs par défaut** pour la démo ; un backend réel enrichirait ou remplacerait via scoring / bases internes.
- `weekday` : `0` = dimanche, …, `6` = samedi (convention `Date.getDay()` JavaScript).

---

## 7. Schéma de référence

Le fichier **`docs/transaction_schema.json`** liste les types attendus par champ pour l’objet transaction (noms de champs en anglais, alignés sur les payloads ci-dessus).

---

## 8. Sécurité et production

- Exiger **HTTPS** pour toute authentification par mot de passe.
- Ne pas activer le log des mots de passe en clair côté client en production.
- Prévoir côté API : validation, limitation de débit, sessions ou JWT selon votre architecture.

---

## 9. Fichiers utiles (frontend)

| Fichier | Contenu |
|---------|---------|
| `src/api/config.ts` | Lecture de `VITE_API_BASE_URL` |
| `src/api/http.ts` | `fetch` POST JSON |
| `src/api/contracts.ts` | Types des corps et chemins d’API |
| `src/api/transactionPayloadEnglish.ts` | Types du document `transaction` |
| `src/api/buildTransactionPayload.ts` | Construction de `transaction` depuis le formulaire |
| `src/api/clientPortal.ts` | `sendClientLogin`, `sendClientLogout`, `sendClientTransactionSimulation` |
| `src/api/index.ts` | Réexport public |

---

*Document généré pour le projet Mokengeli — portail client.*
