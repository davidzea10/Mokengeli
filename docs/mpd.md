-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.analyst_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  type_feedback text NOT NULL,
  commentaire text,
  analyste_reference text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT analyst_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT analyst_feedback_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.beneficiaires (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode = ANY (ARRAY['compte_bancaire'::text, 'mobile_money'::text])),
  compte_identifiant text,
  banque_code text,
  titulaire_compte text,
  telephone text,
  operateur_mobile text,
  client_lie_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT beneficiaires_pkey PRIMARY KEY (id),
  CONSTRAINT beneficiaires_client_lie_id_fkey FOREIGN KEY (client_lie_id) REFERENCES public.clients(id)
);
CREATE TABLE public.cartes_bancaires (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  compte_id uuid NOT NULL,
  numero_carte text NOT NULL,
  type_carte text,
  date_expiration date,
  statut text NOT NULL DEFAULT 'active'::text,
  CONSTRAINT cartes_bancaires_pkey PRIMARY KEY (id),
  CONSTRAINT cartes_bancaires_compte_id_fkey FOREIGN KEY (compte_id) REFERENCES public.comptes_bancaires(id)
);
CREATE TABLE public.cibles_entrainement (
  transaction_id uuid NOT NULL,
  cible_fraude boolean,
  cible_session_anormale boolean,
  cible_comportement_atypique boolean,
  date_etiquetage timestamp with time zone NOT NULL DEFAULT now(),
  origine_etiquetage text,
  CONSTRAINT cibles_entrainement_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT cibles_entrainement_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reference_client text NOT NULL UNIQUE,
  email text,
  telephone text,
  date_creation date NOT NULL DEFAULT CURRENT_DATE,
  date_mise_a_jour date NOT NULL DEFAULT CURRENT_DATE,
  nom_complet text,
  password_hash text,
  adresse_physique text,
  ville text,
  pays text,
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.comptes_bancaires (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  numero_compte text NOT NULL,
  devise_compte text NOT NULL,
  libelle text,
  est_compte_principal boolean NOT NULL DEFAULT false,
  date_ouverture date,
  solde_disponible numeric NOT NULL DEFAULT 0 CHECK (solde_disponible >= 0::numeric),
  CONSTRAINT comptes_bancaires_pkey PRIMARY KEY (id),
  CONSTRAINT comptes_bancaires_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.notifications_client (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['transfer_sent'::text, 'transfer_received'::text])),
  lu boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_client_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_client_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.policy_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cle text NOT NULL UNIQUE,
  valeur jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT policy_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.scores_evaluation (
  transaction_id uuid NOT NULL,
  score_modele_transaction double precision,
  score_modele_session double precision,
  score_modele_comportement double precision,
  score_combine double precision,
  decision text,
  texte_motifs text,
  date_calcul timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT scores_evaluation_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT scores_evaluation_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  date_debut timestamp with time zone NOT NULL DEFAULT now(),
  canal text,
  adresse_ip text,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.transaction_biometrie_session (
  transaction_id uuid NOT NULL,
  duree_session_min double precision,
  nb_ecrans_session integer,
  delai_otp_s double precision,
  nb_echecs_login_24h integer,
  vitesse_frappe double precision,
  entropie_souris double precision,
  nombre_requetes_par_minute integer,
  score_probabilite_automatisation double precision,
  CONSTRAINT transaction_biometrie_session_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transaction_biometrie_session_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.transaction_detecte_anonymisation (
  transaction_id uuid NOT NULL,
  tor_detecte boolean NOT NULL DEFAULT false,
  vpn_detecte boolean NOT NULL DEFAULT false,
  proxy_detecte boolean NOT NULL DEFAULT false,
  score_anonimisation_reseau double precision,
  CONSTRAINT transaction_detecte_anonymisation_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transaction_detecte_anonymisation_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.transaction_graphe_relationnel (
  transaction_id uuid NOT NULL,
  degre_client integer,
  nb_voisins_frauduleux integer,
  score_reseau double precision,
  CONSTRAINT transaction_graphe_relationnel_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transaction_graphe_relationnel_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.transaction_integrite_securite (
  transaction_id uuid NOT NULL,
  signature_transaction_valide boolean NOT NULL DEFAULT false,
  certificat_valide boolean NOT NULL DEFAULT false,
  score_confiance_client_api double precision,
  signature_requete_valide boolean NOT NULL DEFAULT false,
  integrite_payload_requete boolean NOT NULL DEFAULT false,
  certificat_revoque boolean NOT NULL DEFAULT false,
  CONSTRAINT transaction_integrite_securite_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transaction_integrite_securite_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.transaction_intelligence_reseau (
  transaction_id uuid NOT NULL,
  score_reputation_ip double precision,
  ip_datacenter boolean NOT NULL DEFAULT false,
  ip_pays_inhabituel boolean NOT NULL DEFAULT false,
  ip_sur_liste_noire boolean NOT NULL DEFAULT false,
  numero_asn bigint,
  fournisseur_asn text,
  type_reseau_asn text,
  CONSTRAINT transaction_intelligence_reseau_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transaction_intelligence_reseau_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.transaction_profil_calcule (
  transaction_id uuid NOT NULL,
  vitesse_24h double precision,
  ratio_montant_median_30j double precision,
  beneficiaire_nouveau boolean NOT NULL DEFAULT false,
  distance_km_habitude double precision,
  changement_appareil boolean NOT NULL DEFAULT false,
  CONSTRAINT transaction_profil_calcule_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transaction_profil_calcule_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_transaction text NOT NULL UNIQUE,
  client_id uuid NOT NULL,
  compte_id uuid NOT NULL,
  carte_id uuid,
  session_id uuid,
  date_transaction timestamp with time zone NOT NULL,
  montant numeric NOT NULL,
  devise text NOT NULL,
  heure integer NOT NULL CHECK (heure >= 0 AND heure <= 23),
  jour_semaine integer NOT NULL,
  type_transaction text NOT NULL,
  canal text NOT NULL,
  reference_beneficiaire text,
  beneficiaire_id uuid,
  latitude_debit double precision,
  longitude_debit double precision,
  latitude_credit double precision,
  longitude_credit double precision,
  source_environnement text NOT NULL DEFAULT 'demo'::text,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT transactions_compte_id_fkey FOREIGN KEY (compte_id) REFERENCES public.comptes_bancaires(id),
  CONSTRAINT transactions_carte_id_fkey FOREIGN KEY (carte_id) REFERENCES public.cartes_bancaires(id),
  CONSTRAINT transactions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT transactions_beneficiaire_id_fkey FOREIGN KEY (beneficiaire_id) REFERENCES public.beneficiaires(id)
);