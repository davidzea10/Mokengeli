-- =============================================================================
-- MOKENGELI — insertion de démo : 3 clients (compte principal + carte)
-- Mot de passe bcrypt via pgcrypto (modifier les valeurs si besoin avant exécution)
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) SIMBI DAVID
-- ---------------------------------------------------------------------------
WITH ins_client AS (
  INSERT INTO public.clients (
    reference_client,
    email,
    telephone,
    nom_complet,
    adresse_physique,
    ville,
    pays,
    password_hash,
    date_creation,
    date_mise_a_jour
  )
  VALUES (
    'SIMBI-DAVID',
    'simbi.david.contact@gmail.com',
    '0895123401',
    'Simbi David',
    'Avenue Tombalaka, n° 14, Bandalungwa',
    'Kinshasa',
    'République démocratique du Congo',
    crypt('Simbi+243', gen_salt('bf')),
    CURRENT_DATE,
    CURRENT_DATE
  )
  RETURNING id
),
ins_compte AS (
  INSERT INTO public.comptes_bancaires (
    client_id,
    numero_compte,
    devise_compte,
    libelle,
    est_compte_principal,
    date_ouverture,
    solde_disponible
  )
  SELECT
    id,
    'RW-CDH-08172345847-002',
    'CDF',
    'Compte courant — Rawbank (principal)',
    true,
    CURRENT_DATE,
    2750000.00
  FROM ins_client
  RETURNING id, client_id
)
INSERT INTO public.cartes_bancaires (
  compte_id,
  numero_carte,
  type_carte,
  date_expiration,
  statut
)
SELECT
  id,
  '4574 9285 5512 3044',
  'Visa Débit',
  (CURRENT_DATE + INTERVAL '4 years')::date,
  'active'
FROM ins_compte;

-- ---------------------------------------------------------------------------
-- 2) RUTH MOZA
-- ---------------------------------------------------------------------------
WITH ins_client AS (
  INSERT INTO public.clients (
    reference_client,
    email,
    telephone,
    nom_complet,
    adresse_physique,
    ville,
    pays,
    password_hash,
    date_creation,
    date_mise_a_jour
  )
  VALUES (
    'RUTH-MOZA',
    'ruth.moza.inbox@gmail.com',
    '0898237610',
    'Ruth Moza',
    'Rue de la Paix, n° 7, Gombe',
    'Kinshasa',
    'République démocratique du Congo',
    crypt('Ruth+243', gen_salt('bf')),
    CURRENT_DATE,
    CURRENT_DATE
  )
  RETURNING id
),
ins_compte AS (
  INSERT INTO public.comptes_bancaires (
    client_id,
    numero_compte,
    devise_compte,
    libelle,
    est_compte_principal,
    date_ouverture,
    solde_disponible
  )
  SELECT
    id,
    'RW-CDH-08172345847-003',
    'CDF',
    'Compte courant — Rawbank (principal)',
    true,
    CURRENT_DATE,
    3187500.50
  FROM ins_client
  RETURNING id, client_id
)
INSERT INTO public.cartes_bancaires (
  compte_id,
  numero_carte,
  type_carte,
  date_expiration,
  statut
)
SELECT
  id,
  '4574 9285 8891 2203',
  'Visa Débit',
  (CURRENT_DATE + INTERVAL '4 years')::date,
  'active'
FROM ins_compte;

-- ---------------------------------------------------------------------------
-- 3) ISAMBO LOUIS
-- ---------------------------------------------------------------------------
WITH ins_client AS (
  INSERT INTO public.clients (
    reference_client,
    email,
    telephone,
    nom_complet,
    adresse_physique,
    ville,
    pays,
    password_hash,
    date_creation,
    date_mise_a_jour
  )
  VALUES (
    'ISAMBO-LOUIS',
    'isambo.louis.mail@gmail.com',
    '0844902156',
    'Isambo Louis',
    'Avenue Watsa, n° 55, Limete',
    'Kinshasa',
    'République démocratique du Congo',
    crypt('Isambo+243', gen_salt('bf')),
    CURRENT_DATE,
    CURRENT_DATE
  )
  RETURNING id
),
ins_compte AS (
  INSERT INTO public.comptes_bancaires (
    client_id,
    numero_compte,
    devise_compte,
    libelle,
    est_compte_principal,
    date_ouverture,
    solde_disponible
  )
  SELECT
    id,
    'RW-CDH-08172345847-004',
    'CDF',
    'Compte courant — Rawbank (principal)',
    true,
    CURRENT_DATE,
    5025000.00
  FROM ins_client
  RETURNING id, client_id
)
INSERT INTO public.cartes_bancaires (
  compte_id,
  numero_carte,
  type_carte,
  date_expiration,
  statut
)
SELECT
  id,
  '4574 9285 4402 1189',
  'Visa Débit',
  (CURRENT_DATE + INTERVAL '3 years')::date,
  'active'
FROM ins_compte;

COMMIT;
