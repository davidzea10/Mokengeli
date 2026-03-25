-- =============================================================================
-- MOKENGELI — connexion (hash mot de passe), adresse client, solde compte, géo transaction
-- À exécuter après 001 (et idéalement 004 si bénéficiaires)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- clients : nom affiché, hash mot de passe (jamais en clair), adresse facultative
-- -----------------------------------------------------------------------------
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS nom_complet text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS password_hash text;

COMMENT ON COLUMN public.clients.password_hash IS 'Hash Argon2/bcrypt — jamais le mot de passe en clair ; nullable si auth gérée par Supabase Auth (auth.users)';

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS adresse_physique text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS ville text;

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS pays text;

-- Un seul compte actif par email renseigné (facultatif : désactiver si doublons déjà en base)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_unique ON public.clients (email)
WHERE
  email IS NOT NULL
  AND btrim(email) <> '';

-- -----------------------------------------------------------------------------
-- comptes_bancaires : solde disponible (règle métier : montant <= solde à l’envoi)
-- -----------------------------------------------------------------------------
ALTER TABLE public.comptes_bancaires
ADD COLUMN IF NOT EXISTS solde_disponible numeric(18, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_constraint
    WHERE
      conname = 'comptes_bancaires_solde_non_negatif'
  ) THEN
    ALTER TABLE public.comptes_bancaires
    ADD CONSTRAINT comptes_bancaires_solde_non_negatif CHECK (solde_disponible >= 0);
  END IF;
END
$$;

COMMENT ON COLUMN public.comptes_bancaires.solde_disponible IS 'Solde utilisable ; mise à jour atomique avec les transactions';

-- -----------------------------------------------------------------------------
-- transactions : positions débit / crédit (remplies par l’app : GPS, carte, géocodage)
-- -----------------------------------------------------------------------------
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS latitude_debit double precision;

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS longitude_debit double precision;

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS latitude_credit double precision;

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS longitude_credit double precision;

COMMENT ON COLUMN public.transactions.latitude_debit IS 'Point départ (où part l’argent) — WGS84';

COMMENT ON COLUMN public.transactions.longitude_debit IS 'Point départ — WGS84';

COMMENT ON COLUMN public.transactions.latitude_credit IS 'Point arrivée (bénéficiaire) — WGS84';

COMMENT ON COLUMN public.transactions.longitude_credit IS 'Point arrivée — WGS84';
