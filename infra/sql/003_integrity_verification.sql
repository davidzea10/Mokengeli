-- =============================================================================
-- MOKENGELI — Point 5 : contraintes d’intégrité (inventaire + tests optionnels)
-- Prérequis : 001_mokengeli_schema.sql exécuté
-- =============================================================================
--
-- Déjà garanti par 001 :
--   • Clés étrangères (FK) entre clients → comptes → cartes, sessions, transactions,
--     satellites, scores, cibles, analyst_feedback
--   • UNicité métier : transactions.numero_transaction (constraint transactions_numero_transaction_unique)
--   • clients.reference_client UNIQUE ; comptes (client_id, numero_compte) UNIQUE ;
--     policy_config.cle UNIQUE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Inventaire : contraintes sur le schéma public (lecture seule)
-- -----------------------------------------------------------------------------
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  COALESCE(
    (
      SELECT
        pg_get_constraintdef(c.oid)
      FROM
        pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE
        n.nspname = 'public'
        AND cl.relname = tc.table_name
        AND c.conname = tc.constraint_name
    ),
    ''
  ) AS definition_postgres
FROM
  information_schema.table_constraints tc
WHERE
  tc.table_schema = 'public'
  AND tc.table_name NOT LIKE 'pg_%'
ORDER BY
  tc.table_name,
  tc.constraint_type,
  tc.constraint_name;

-- -----------------------------------------------------------------------------
-- B. Liste rapide des clés étrangères (nom + tables liées)
-- -----------------------------------------------------------------------------
SELECT
  tc.table_name AS table_source,
  kcu.column_name AS colonne,
  ccu.table_name AS table_cible,
  ccu.column_name AS colonne_cible,
  tc.constraint_name
FROM
  information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE
  tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY
  tc.table_name;

-- -----------------------------------------------------------------------------
-- C. Tests négatifs (à lancer dans une transaction — rien n’est persisté)
--     Résultat attendu : NOTICE « PASS: … » pour chaque test
-- -----------------------------------------------------------------------------
BEGIN;

DO $$
DECLARE
  cid uuid;
  accid uuid;
  suffix text;
BEGIN
  suffix := gen_random_uuid ()::text;

  INSERT INTO public.clients (reference_client)
    VALUES ('INT-TEST-' || suffix)
  RETURNING
    id INTO cid;

  INSERT INTO public.comptes_bancaires (client_id, numero_compte, devise_compte)
    VALUES (cid, 'ACC-INT-' || suffix, 'CDF')
  RETURNING
    id INTO accid;

  INSERT INTO public.transactions (
    numero_transaction,
    client_id,
    compte_id,
    date_transaction,
    montant,
    devise,
    heure,
    jour_semaine,
    type_transaction,
    canal
  )
  VALUES (
    'TXN-DUP-' || suffix,
    cid,
    accid,
    now(),
    1,
    'CDF',
    10,
    1,
    'P2P',
    'mobile'
  );

  INSERT INTO public.transactions (
    numero_transaction,
    client_id,
    compte_id,
    date_transaction,
    montant,
    devise,
    heure,
    jour_semaine,
    type_transaction,
    canal
  )
  VALUES (
    'TXN-DUP-' || suffix,
    cid,
    accid,
    now(),
    2,
    'CDF',
    10,
    1,
    'P2P',
    'mobile'
  );

  RAISE EXCEPTION 'ÉCHEC TEST: doublon numero_transaction aurait dû être rejeté';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'PASS: unicité numero_transaction (contrainte UNIQUE active)';
END
$$;

DO $$
BEGIN
  INSERT INTO public.transactions (
    numero_transaction,
    client_id,
    compte_id,
    date_transaction,
    montant,
    devise,
    heure,
    jour_semaine,
    type_transaction,
    canal
  )
  VALUES (
    '__TXN_FK_TEST__',
    gen_random_uuid (),
    gen_random_uuid (),
    now (),
    1,
    'CDF',
    10,
    1,
    'P2P',
    'mobile'
  );

  RAISE EXCEPTION 'ÉCHEC TEST: FK client_id / compte_id aurait dû échouer';
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE 'PASS: FK vers clients / comptes_bancaires appliquée';
END
$$;

ROLLBACK;

-- Après ROLLBACK : aucune ligne de test ne reste en base.
