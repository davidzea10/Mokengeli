-- =============================================================================
-- MOKENGELI — Requêtes avec jointures : client « Strategie » (référence métier)
-- Remplacez 'STRATEGIE-PAUUL' si votre référence en base est différente.
-- =============================================================================
-- Débit / crédit en base :
--   • Une ligne `transactions` est toujours liée au payeur via `client_id` + `compte_id` (compte débité).
--   • Le destinataire est décrit par `beneficiaire_id` → `beneficiaires` (et éventuellement `client_lie_id`
--     si le bénéficiaire est aussi un client enregistré).
--   • La mise à jour des soldes (`comptes_bancaires.solde_disponible`) dépend de votre logique backend
--     ou de triggers SQL : vérifiez dans le code d’évaluation / persistance si les deux comptes sont ajustés.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Fiche complète Strategie : client + compte(s) + carte(s)
-- ---------------------------------------------------------------------------
SELECT
  c.id AS client_id,
  c.reference_client,
  c.nom_complet,
  c.email,
  c.telephone,
  c.adresse_physique,
  c.ville,
  c.pays,
  c.date_creation,
  cb.id AS compte_id,
  cb.numero_compte,
  cb.devise_compte,
  cb.libelle,
  cb.est_compte_principal,
  cb.solde_disponible,
  cb.date_ouverture,
  cart.id AS carte_id,
  cart.numero_carte,
  cart.type_carte,
  cart.date_expiration,
  cart.statut
FROM public.clients c
LEFT JOIN public.comptes_bancaires cb ON cb.client_id = c.id
LEFT JOIN public.cartes_bancaires cart ON cart.compte_id = cb.id
WHERE c.reference_client = 'ISAMBO-LOUIS'
ORDER BY cb.est_compte_principal DESC NULLS LAST, cart.id NULLS LAST;

-- ---------------------------------------------------------------------------
-- 2) Opérations initiées PAR Strategie (débit sur son compte = vous payez depuis chez lui)
--     → utile si vous êtes connecté comme Strategie et vous envoyez vers un autre.
-- ---------------------------------------------------------------------------
SELECT
  t.id,
  t.numero_transaction,
  t.date_transaction,
  t.montant,
  t.devise,
  t.type_transaction,
  t.canal,
  t.reference_beneficiaire,
  c.reference_client AS payeur_reference,
  c.nom_complet AS payeur_nom,
  cb.numero_compte AS compte_debite,
  b.id AS beneficiaire_id,
  b.mode AS beneficiaire_mode,
  b.compte_identifiant,
  b.telephone AS beneficiaire_telephone,
  b.titulaire_compte,
  b.client_lie_id AS beneficiaire_client_id_lie
FROM public.transactions t
JOIN public.clients c ON c.id = t.client_id
LEFT JOIN public.comptes_bancaires cb ON cb.id = t.compte_id
LEFT JOIN public.beneficiaires b ON b.id = t.beneficiaire_id
WHERE c.reference_client = 'STRATEGIE-PAUUL'
ORDER BY t.date_transaction DESC NULLS LAST;

-- ---------------------------------------------------------------------------
-- 3) Opérations dont le bénéficiaire est relié à Strategie (`beneficiaires.client_lie_id`)
--     = quelqu’un d’autre envoie vers un bénéficiaire mappé sur le client Strategie (crédit côté lui).
--     Nécessite que l’app ait renseigné `client_lie_id` lors de la création du bénéficiaire.
-- ---------------------------------------------------------------------------
SELECT
  t.id,
  t.numero_transaction,
  t.date_transaction,
  t.montant,
  t.devise,
  t.type_transaction,
  t.canal,
  payeur.reference_client AS payeur_reference,
  payeur.nom_complet AS payeur_nom,
  credite.reference_client AS credite_reference,
  credite.nom_complet AS credite_nom,
  cb_payeur.numero_compte AS compte_debite_payeur,
  b.compte_identifiant AS beneficiaire_compte,
  b.telephone AS beneficiaire_tel
FROM public.transactions t
JOIN public.beneficiaires b ON b.id = t.beneficiaire_id
JOIN public.clients credite ON credite.id = b.client_lie_id
LEFT JOIN public.clients payeur ON payeur.id = t.client_id
LEFT JOIN public.comptes_bancaires cb_payeur ON cb_payeur.id = t.compte_id
WHERE credite.reference_client = 'STRATEGIE-PAUUL'
ORDER BY t.date_transaction DESC NULLS LAST;

-- ---------------------------------------------------------------------------
-- 4) Vue synthèse : une ligne par transaction impliquant Strategie (payeur OU crédité via client_lie)
-- ---------------------------------------------------------------------------
WITH s AS (
  SELECT id
  FROM public.clients
  WHERE reference_client = 'STRATEGIE-PAUUL'
)
SELECT
  t.numero_transaction,
  t.date_transaction,
  t.montant,
  t.devise,
  CASE
    WHEN t.client_id = (SELECT id FROM s) THEN 'debit_emis_par_strategie'
    WHEN b.client_lie_id = (SELECT id FROM s) THEN 'credit_recu_par_strategie'
    ELSE 'autre'
  END AS sens_pour_strategie,
  p.nom_complet AS initiateur,
  p.reference_client AS initiateur_ref,
  cred.nom_complet AS beneficiaire_client_lie_nom,
  t.reference_beneficiaire
FROM public.transactions t
LEFT JOIN public.clients p ON p.id = t.client_id
LEFT JOIN public.beneficiaires b ON b.id = t.beneficiaire_id
LEFT JOIN public.clients cred ON cred.id = b.client_lie_id
WHERE t.client_id = (SELECT id FROM s)
   OR b.client_lie_id = (SELECT id FROM s)
ORDER BY t.date_transaction DESC NULLS LAST;

-- ---------------------------------------------------------------------------
-- 5) Contrôle des soldes après opérations (à lancer avant / après un envoi de l’app)
-- ---------------------------------------------------------------------------
SELECT
  c.reference_client,
  cb.numero_compte,
  cb.solde_disponible,
  cb.devise_compte
FROM public.clients c
JOIN public.comptes_bancaires cb ON cb.client_id = c.id
WHERE c.reference_client = 'STRATEGIE-PAUUL';

-- ---------------------------------------------------------------------------
-- 6) Diagnostic admin (tableau : expéditeur / destinataire vides) — remplacer le TXN
-- ---------------------------------------------------------------------------
-- Vérifie que compte_id et beneficiaire_id pointent vers des lignes existantes
-- et que reference_beneficiaire est renseigné si besoin d’affichage sans jointure.
SELECT
  t.numero_transaction,
  t.compte_id,
  cb.numero_compte AS compte_debite_numero,
  t.beneficiaire_id,
  b.titulaire_compte AS benef_titulaire,
  t.reference_beneficiaire
FROM public.transactions t
LEFT JOIN public.comptes_bancaires cb ON cb.id = t.compte_id
LEFT JOIN public.beneficiaires b ON b.id = t.beneficiaire_id
WHERE t.numero_transaction = 'TXN-1774612348015';
