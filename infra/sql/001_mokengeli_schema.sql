-- =============================================================================
-- MOKENGELI — schéma relationnel (MPD)
-- Aligné sur Docs/StructureBdd.tex + tables transverses (plan étape 3.2)
-- Exécuter dans Supabase : SQL Editor (rôle postgres / service)
-- =============================================================================

-- Extensions utiles (Supabase : souvent déjà activées)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. clients
-- -----------------------------------------------------------------------------
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  reference_client text NOT NULL,
  email text,
  telephone text,
  date_creation date NOT NULL DEFAULT CURRENT_DATE,
  date_mise_a_jour date NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT clients_reference_client_unique UNIQUE (reference_client)
);

CREATE INDEX idx_clients_email ON public.clients (email)
WHERE
  email IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. comptes_bancaires
-- -----------------------------------------------------------------------------
CREATE TABLE public.comptes_bancaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE RESTRICT,
  numero_compte text NOT NULL,
  devise_compte text NOT NULL,
  libelle text,
  est_compte_principal boolean NOT NULL DEFAULT false,
  date_ouverture date,
  CONSTRAINT comptes_bancaires_client_numero UNIQUE (client_id, numero_compte)
);

CREATE INDEX idx_comptes_bancaires_client ON public.comptes_bancaires (client_id);

-- -----------------------------------------------------------------------------
-- 3. cartes_bancaires
-- -----------------------------------------------------------------------------
CREATE TABLE public.cartes_bancaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  compte_id uuid NOT NULL REFERENCES public.comptes_bancaires (id) ON DELETE RESTRICT,
  numero_carte text NOT NULL,
  type_carte text,
  date_expiration date,
  statut text NOT NULL DEFAULT 'active'
);

CREATE INDEX idx_cartes_bancaires_compte ON public.cartes_bancaires (compte_id);

-- -----------------------------------------------------------------------------
-- 4. sessions
-- -----------------------------------------------------------------------------
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE RESTRICT,
  date_debut timestamptz NOT NULL DEFAULT now(),
  canal text,
  adresse_ip text
);

CREATE INDEX idx_sessions_client ON public.sessions (client_id);

-- -----------------------------------------------------------------------------
-- 5. transactions (fait central — unicité métier numero_transaction)
-- -----------------------------------------------------------------------------
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  numero_transaction text NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE RESTRICT,
  compte_id uuid NOT NULL REFERENCES public.comptes_bancaires (id) ON DELETE RESTRICT,
  carte_id uuid REFERENCES public.cartes_bancaires (id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.sessions (id) ON DELETE SET NULL,
  date_transaction timestamptz NOT NULL,
  montant numeric(18, 2) NOT NULL,
  devise text NOT NULL,
  heure integer NOT NULL CHECK (
    heure >= 0
    AND heure <= 23
  ),
  jour_semaine integer NOT NULL,
  type_transaction text NOT NULL,
  canal text NOT NULL,
  reference_beneficiaire text,
  source_environnement text NOT NULL DEFAULT 'demo',
  CONSTRAINT transactions_numero_transaction_unique UNIQUE (numero_transaction)
);

CREATE INDEX idx_transactions_client ON public.transactions (client_id);

CREATE INDEX idx_transactions_date ON public.transactions (date_transaction);

-- -----------------------------------------------------------------------------
-- 6–11. Tables satellites (1:1 avec transactions)
-- -----------------------------------------------------------------------------
CREATE TABLE public.transaction_intelligence_reseau (
  transaction_id uuid PRIMARY KEY REFERENCES public.transactions (id) ON DELETE CASCADE,
  score_reputation_ip double precision,
  ip_datacenter boolean NOT NULL DEFAULT false,
  ip_pays_inhabituel boolean NOT NULL DEFAULT false,
  ip_sur_liste_noire boolean NOT NULL DEFAULT false,
  numero_asn bigint,
  fournisseur_asn text,
  type_reseau_asn text
);

CREATE TABLE public.transaction_detecte_anonymisation (
  transaction_id uuid PRIMARY KEY REFERENCES public.transactions (id) ON DELETE CASCADE,
  tor_detecte boolean NOT NULL DEFAULT false,
  vpn_detecte boolean NOT NULL DEFAULT false,
  proxy_detecte boolean NOT NULL DEFAULT false,
  score_anonimisation_reseau double precision
);

CREATE TABLE public.transaction_biometrie_session (
  transaction_id uuid PRIMARY KEY REFERENCES public.transactions (id) ON DELETE CASCADE,
  duree_session_min double precision,
  nb_ecrans_session integer,
  delai_otp_s double precision,
  nb_echecs_login_24h integer,
  vitesse_frappe double precision,
  entropie_souris double precision,
  nombre_requetes_par_minute integer,
  score_probabilite_automatisation double precision
);

CREATE TABLE public.transaction_profil_calcule (
  transaction_id uuid PRIMARY KEY REFERENCES public.transactions (id) ON DELETE CASCADE,
  vitesse_24h double precision,
  ratio_montant_median_30j double precision,
  beneficiaire_nouveau boolean NOT NULL DEFAULT false,
  distance_km_habitude double precision,
  changement_appareil boolean NOT NULL DEFAULT false
);

CREATE TABLE public.transaction_graphe_relationnel (
  transaction_id uuid PRIMARY KEY REFERENCES public.transactions (id) ON DELETE CASCADE,
  degre_client integer,
  nb_voisins_frauduleux integer,
  score_reseau double precision
);

CREATE TABLE public.transaction_integrite_securite (
  transaction_id uuid PRIMARY KEY REFERENCES public.transactions (id) ON DELETE CASCADE,
  signature_transaction_valide boolean NOT NULL DEFAULT false,
  certificat_valide boolean NOT NULL DEFAULT false,
  score_confiance_client_api double precision,
  signature_requete_valide boolean NOT NULL DEFAULT false,
  integrite_payload_requete boolean NOT NULL DEFAULT false,
  certificat_revoque boolean NOT NULL DEFAULT false
);

-- -----------------------------------------------------------------------------
-- 12. scores_evaluation
-- -----------------------------------------------------------------------------
CREATE TABLE public.scores_evaluation (
  transaction_id uuid PRIMARY KEY REFERENCES public.transactions (id) ON DELETE CASCADE,
  score_modele_transaction double precision,
  score_modele_session double precision,
  score_modele_comportement double precision,
  score_combine double precision,
  decision text,
  texte_motifs text,
  date_calcul timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 13. cibles_entrainement (0:1 — pas utilisé en inférence temps réel)
-- -----------------------------------------------------------------------------
CREATE TABLE public.cibles_entrainement (
  transaction_id uuid PRIMARY KEY REFERENCES public.transactions (id) ON DELETE CASCADE,
  cible_fraude boolean,
  cible_session_anormale boolean,
  cible_comportement_atypique boolean,
  date_etiquetage timestamptz NOT NULL DEFAULT now(),
  origine_etiquetage text
);

-- -----------------------------------------------------------------------------
-- 14–15. Tables transverses (plan de travail)
-- -----------------------------------------------------------------------------
CREATE TABLE public.analyst_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  transaction_id uuid NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
  type_feedback text NOT NULL,
  commentaire text,
  analyste_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analyst_feedback_transaction ON public.analyst_feedback (transaction_id);

CREATE TABLE public.policy_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  cle text NOT NULL UNIQUE,
  valeur jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Commentaires (documentation catalogue)
-- -----------------------------------------------------------------------------
COMMENT ON TABLE public.clients IS 'Référentiel titulaires — StructureBdd.tex';

COMMENT ON TABLE public.transactions IS 'Fait central ; numero_transaction unique métier';

COMMENT ON TABLE public.cibles_entrainement IS 'Labels entraînement — hors flux inférence temps réel';

COMMENT ON TABLE public.analyst_feedback IS 'Feedback analystes (1:N par transaction)';

COMMENT ON TABLE public.policy_config IS 'Paramètres politique métier / seuils (clé-valeur JSON)';
