-- =============================================================================
-- MOKENGELI — agrégats de profilage & graphe (lecture historiques)
-- Dépend de : 001_mokengeli_schema.sql
-- Colonnes cibles : transaction_profil_calcule, transaction_graphe_relationnel
-- =============================================================================

-- Index pour fenêtres temporelles et jointures graphe
CREATE INDEX IF NOT EXISTS idx_transactions_client_date ON public.transactions (
  client_id,
  date_transaction DESC
);

CREATE INDEX IF NOT EXISTS idx_transactions_beneficiaire ON public.transactions (reference_beneficiaire)
WHERE
  reference_beneficiaire IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Nombre d’opérations du client sur les 24 h glissantes se terminant à p_ref
-- (exclut optionnellement une transaction en cours d’évaluation)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profiling_vitesse_24h (
  p_client_id uuid,
  p_ref timestamptz,
  p_exclude_transaction_id uuid DEFAULT NULL
) RETURNS bigint
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    count(*)::bigint
  FROM
    public.transactions t
  WHERE
    t.client_id = p_client_id
    AND t.date_transaction > p_ref - interval '24 hours'
    AND t.date_transaction <= p_ref
    AND (
      p_exclude_transaction_id IS NULL
      OR t.id <> p_exclude_transaction_id
    );
$$;

-- -----------------------------------------------------------------------------
-- Ratio montant / médiane des montants sur 30 jours strictement avant p_ref
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profiling_ratio_montant_median_30j (
  p_client_id uuid,
  p_montant numeric,
  p_ref timestamptz,
  p_exclude_transaction_id uuid DEFAULT NULL
) RETURNS double precision
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH
    med AS (
      SELECT
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY
            t.montant
        ) AS m
      FROM
        public.transactions t
      WHERE
        t.client_id = p_client_id
        AND t.date_transaction >= p_ref - interval '30 days'
        AND t.date_transaction < p_ref
        AND (
          p_exclude_transaction_id IS NULL
          OR t.id <> p_exclude_transaction_id
        )
    )
  SELECT
    CASE
      WHEN med.m IS NULL
      OR med.m = 0 THEN NULL::double precision
      ELSE (p_montant / med.m)::double precision
    END
  FROM
    med;
$$;

-- -----------------------------------------------------------------------------
-- Bénéficiaire jamais payé avant p_ref (profil « nouveau »)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profiling_beneficiaire_nouveau (
  p_client_id uuid,
  p_reference_beneficiaire text,
  p_ref timestamptz,
  p_exclude_transaction_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p_reference_beneficiaire IS NULL
      OR btrim(p_reference_beneficiaire) = '' THEN NULL::boolean
      ELSE NOT EXISTS (
        SELECT
          1
        FROM
          public.transactions t
        WHERE
          t.client_id = p_client_id
          AND t.reference_beneficiaire = p_reference_beneficiaire
          AND t.date_transaction < p_ref
          AND (
            p_exclude_transaction_id IS NULL
            OR t.id <> p_exclude_transaction_id
          )
      )
    END;
$$;

-- -----------------------------------------------------------------------------
-- Graphe : degré = nombre de bénéficiaires distincts (liens sortants)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profiling_degre_client (p_client_id uuid) RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    count(DISTINCT t.reference_beneficiaire)::integer
  FROM
    public.transactions t
  WHERE
    t.client_id = p_client_id
    AND t.reference_beneficiaire IS NOT NULL;
$$;

-- -----------------------------------------------------------------------------
-- Graphe : bénéficiaires du client ayant au moins une transaction étiquetée fraude
-- (jointure historique cibles_entrainement)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profiling_nb_voisins_frauduleux (p_client_id uuid) RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH
    benef_client AS (
      SELECT DISTINCT
        t.reference_beneficiaire AS b
      FROM
        public.transactions t
      WHERE
        t.client_id = p_client_id
        AND t.reference_beneficiaire IS NOT NULL
    )
  SELECT
    count(DISTINCT bc.b)::integer
  FROM
    benef_client bc
  WHERE
    EXISTS (
      SELECT
        1
      FROM
        public.transactions t2
        INNER JOIN public.cibles_entrainement c ON c.transaction_id = t2.id
      WHERE
        t2.reference_beneficiaire = bc.b
        AND COALESCE(c.cible_fraude, FALSE)
    );
$$;

-- -----------------------------------------------------------------------------
-- Moyenne des score_reseau (satellite graphe) sur 90 jours glissants avant p_ref
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profiling_score_reseau_moyen_90j (
  p_client_id uuid,
  p_ref timestamptz,
  p_exclude_transaction_id uuid DEFAULT NULL
) RETURNS double precision
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    avg(g.score_reseau)::double precision
  FROM
    public.transactions t
    INNER JOIN public.transaction_graphe_relationnel g ON g.transaction_id = t.id
  WHERE
    t.client_id = p_client_id
    AND t.date_transaction >= p_ref - interval '90 days'
    AND t.date_transaction < p_ref
    AND (
      p_exclude_transaction_id IS NULL
      OR t.id <> p_exclude_transaction_id
    );
$$;

-- -----------------------------------------------------------------------------
-- Vue synthèse : une ligne par client × jour (dashboards / audits)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_historique_client_journalier AS
SELECT
  t.client_id,
  (date_trunc('day', t.date_transaction))::date AS jour,
  count(*)::bigint AS nb_transactions,
  sum(t.montant) AS volume_montant,
  avg(t.montant)::numeric(18, 2) AS moyenne_montant,
  percentile_cont(0.5) WITHIN GROUP (
    ORDER BY
      t.montant
  ) AS mediane_montant
FROM
  public.transactions t
GROUP BY
  t.client_id,
  (date_trunc('day', t.date_transaction))::date;

COMMENT ON VIEW public.v_historique_client_journalier IS 'Agrégats journaliers par client (lecture historique)';

COMMENT ON FUNCTION public.fn_profiling_vitesse_24h (uuid, timestamptz, uuid) IS 'Compte des opérations sur 24 h glissantes (vitesse_24h)';

COMMENT ON FUNCTION public.fn_profiling_ratio_montant_median_30j (uuid, numeric, timestamptz, uuid) IS 'Montant / médiane 30 j (ratio_montant_median_30j)';

COMMENT ON FUNCTION public.fn_profiling_degre_client (uuid) IS 'Nombre de bénéficiaires distincts (degre_client)';

COMMENT ON FUNCTION public.fn_profiling_nb_voisins_frauduleux (uuid) IS 'Bénéficiaires du client liés à au moins une fraude étiquetée (nb_voisins_frauduleux)';

COMMENT ON FUNCTION public.fn_profiling_score_reseau_moyen_90j (uuid, timestamptz, uuid) IS 'Moyenne score_reseau satellite sur 90 j';

-- -----------------------------------------------------------------------------
-- Fonction tout-en-un pour alimenter transaction_profil_calcule + champs graphe
-- (distance_km_habitude / changement_appareil : hors SQL — données externes)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_profiling_features_depuis_historique (
  p_client_id uuid,
  p_montant numeric,
  p_ref timestamptz,
  p_reference_beneficiaire text DEFAULT NULL,
  p_exclude_transaction_id uuid DEFAULT NULL
) RETURNS TABLE (
  vitesse_24h double precision,
  ratio_montant_median_30j double precision,
  beneficiaire_nouveau boolean,
  degre_client integer,
  nb_voisins_frauduleux integer,
  score_reseau_moyen_90j double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    public.fn_profiling_vitesse_24h(p_client_id, p_ref, p_exclude_transaction_id)::double precision,
    public.fn_profiling_ratio_montant_median_30j(p_client_id, p_montant, p_ref, p_exclude_transaction_id),
    public.fn_profiling_beneficiaire_nouveau(p_client_id, p_reference_beneficiaire, p_ref, p_exclude_transaction_id),
    public.fn_profiling_degre_client(p_client_id),
    public.fn_profiling_nb_voisins_frauduleux(p_client_id),
    public.fn_profiling_score_reseau_moyen_90j(p_client_id, p_ref, p_exclude_transaction_id);
$$;

COMMENT ON FUNCTION public.fn_profiling_features_depuis_historique (uuid, numeric, timestamptz, text, uuid) IS 'Jeu de features profilage + graphe à partir des historiques (StructureBdd)';
