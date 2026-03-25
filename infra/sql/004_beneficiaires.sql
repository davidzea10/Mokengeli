-- =============================================================================
-- MOKENGELI — bénéficiaires (banque ou mobile money)
-- À exécuter après 001_mokengeli_schema.sql
-- =============================================================================

CREATE TABLE public.beneficiaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  mode text NOT NULL,
  compte_identifiant text,
  banque_code text,
  titulaire_compte text,
  telephone text,
  operateur_mobile text,
  client_lie_id uuid REFERENCES public.clients (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now (),
  CONSTRAINT beneficiaires_mode_check CHECK (
    mode IN ('compte_bancaire', 'mobile_money')
  ),
  CONSTRAINT beneficiaires_coherence_mode CHECK (
    (
      mode = 'compte_bancaire'
      AND compte_identifiant IS NOT NULL
      AND length(trim(compte_identifiant)) > 0
    )
    OR (
      mode = 'mobile_money'
      AND telephone IS NOT NULL
      AND length(trim(telephone)) > 0
    )
  )
);

CREATE INDEX idx_beneficiaires_client_lie ON public.beneficiaires (client_lie_id)
WHERE
  client_lie_id IS NOT NULL;

COMMENT ON TABLE public.beneficiaires IS 'Destinataire d’un envoi : compte bancaire (RawBank ou autre) ou mobile money';

COMMENT ON COLUMN public.beneficiaires.mode IS 'compte_bancaire | mobile_money';

COMMENT ON COLUMN public.beneficiaires.compte_identifiant IS 'IBAN, RIB ou identifiant compte selon la norme métier';

COMMENT ON COLUMN public.beneficiaires.banque_code IS 'RAWBANK, BIC, AUTRE, etc.';

COMMENT ON COLUMN public.beneficiaires.client_lie_id IS 'Si le bénéficiaire est aussi un client enregistré';

-- Lien depuis le fait transactionnel (nullable : rétrocompat avec reference_beneficiaire texte)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS beneficiaire_id uuid REFERENCES public.beneficiaires (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_beneficiaire ON public.transactions (beneficiaire_id)
WHERE
  beneficiaire_id IS NOT NULL;

COMMENT ON COLUMN public.transactions.beneficiaire_id IS 'FK vers beneficiaires ; reference_beneficiaire peut rester pour libellé ou migration';

-- Exemples (à adapter avec de vrais UUID clients) :
--
-- INSERT INTO public.beneficiaires (mode, compte_identifiant, banque_code, titulaire_compte)
-- VALUES ('compte_bancaire', 'CD123000456789012', 'RAWBANK', 'Jean Dupont');
--
-- INSERT INTO public.beneficiaires (mode, telephone, operateur_mobile)
-- VALUES ('mobile_money', '+243900000000', 'Orange');
