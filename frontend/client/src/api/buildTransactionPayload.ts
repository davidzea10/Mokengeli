import type { ApiTransactionDocument } from './transactionPayloadEnglish';

/** Sous-type de virement lorsque le destinataire est un compte bancaire. */
export type BankFlow = 'rawbank_rawbank' | 'rawbank_autre' | 'rawbank_vers_mobile';

export interface ClientFormLike {
  montant: string;
  type_transaction: string;
  canal: string;
  heure: number;
  beneficiaire_nouveau: boolean;
  changement_appareil: boolean;
  ip_pays_inhabituel: boolean;
  /** Bénéficiaire : compte bancaire (avec sous-flux) ou mobile money */
  beneficiary_mode: 'banque' | 'mobile_money';
  /** Uniquement si beneficiary_mode === 'banque' */
  bank_flow: BankFlow;
  ben_compte_identifiant: string;
  /** Code banque (RAWBANK, autre RDC, etc.) — dérivé du flux */
  ben_banque_code: string;
  ben_titulaire: string;
  ben_telephone: string;
  ben_operateur: string;
}

/** Destinataire final = mobile (wallet ou virement RawBank → mobile). */
export function isMobileRecipientForm(form: ClientFormLike): boolean {
  if (form.beneficiary_mode === 'mobile_money') return true;
  return form.beneficiary_mode === 'banque' && form.bank_flow === 'rawbank_vers_mobile';
}

/** Libellé court pour historique / enveloppe API */
export function buildBeneficiarySummary(form: ClientFormLike): string {
  if (isMobileRecipientForm(form)) {
    const tel = form.ben_telephone.trim();
    const t = form.ben_titulaire.trim();
    if (!tel) return 'Mobile';
    // Ordre « titulaire · téléphone » pour l’admin (colonne nom / n° cohérentes).
    return t ? `${t} · ${tel}` : tel;
  }
  const parts = [form.ben_titulaire.trim(), form.ben_banque_code.trim(), form.ben_compte_identifiant.trim()].filter(
    Boolean
  );
  return parts.length ? parts.join(' · ') : 'Compte bancaire';
}

/**
 * Builds an API transaction document (English JSON keys) from the client form.
 * See docs/transaction_schema.json (English field names).
 */
export function buildTransactionFromClientForm(
  form: ClientFormLike,
  profileId: string,
  transactionNumber: string
): ApiTransactionDocument {
  const now = new Date();
  const amount = parseFloat(form.montant) || 0;
  const mobile = isMobileRecipientForm(form);

  return {
    transaction_event: {
      metadata: {
        transaction_date: now.toISOString(),
        transaction_number: transactionNumber,
        client_id: profileId,
        amount,
        currency: 'FC',
        hour: form.heure,
        weekday: now.getDay(),
        transaction_type: form.type_transaction,
        channel: form.canal,
        beneficiary_mode: mobile ? 'mobile_money' : 'bank',
        bank_flow: form.beneficiary_mode === 'banque' ? form.bank_flow : undefined,
        ...(mobile
          ? {
              beneficiary_phone: form.ben_telephone.trim(),
              beneficiary_mobile_operator: form.ben_operateur.trim() || undefined,
              beneficiary_account_holder: form.ben_titulaire.trim() || undefined,
            }
          : {
              beneficiary_account_identifier: form.ben_compte_identifiant.trim(),
              beneficiary_bank_code: form.ben_banque_code.trim(),
              beneficiary_account_holder: form.ben_titulaire.trim() || undefined,
            }),
      },
      network_intelligence: {
        ip_reputation_score: 0.85,
        ip_datacenter: false,
        unusual_country_ip: form.ip_pays_inhabituel,
        ip_blacklisted: false,
      },
      anonymization_detection: {
        tor_detected: false,
        vpn_detected: false,
        proxy_detected: false,
      },
      behavioral_biometrics_ueba: {
        session_duration_min: 15,
        session_screens_count: 3,
        otp_delay_s: 45,
        failed_logins_24h: 0,
        typing_speed: 50,
        mouse_entropy: 0.65,
        requests_per_minute: 4,
      },
      engineered_features_profiling: {
        velocity_24h: amount,
        amount_median_ratio_30d: 1,
        new_beneficiary: form.beneficiaire_nouveau,
        habit_distance_km: 5,
        device_change: form.changement_appareil,
      },
      relational_graph_features: {
        client_degree: 3,
        fraudulent_neighbors_count: 0,
        network_score: 0.85,
      },
      security_integrity: {
        transaction_signature_valid: true,
        certificate_valid: true,
        client_api_trust_score: 0.92,
      },
    },
    target_labels: {
      fraud_target: false,
      abnormal_session_target: false,
      atypical_behavior_target: false,
    },
  };
}

export interface EvaluateTransactionOptions {
  compteId?: string | null;
  beneficiaireId?: string | null;
  sessionId?: string | null;
  /** Obligatoire : position du client au moment de l’initiation (débit). */
  geolocation: {
    latitude_debit: number;
    longitude_debit: number;
    latitude_credit?: number | null;
    longitude_credit?: number | null;
  };
}

/**
 * Blocs obligatoires pour les API qui valident le schéma `transaction_event` complet (sinon 422).
 * Clés en français, alignées sur `docs` / types admin.
 */
function buildFrenchTransactionEventBlocks(form: ClientFormLike) {
  return {
    network_intelligence: {
      score_reputation_ip: 0,
      ip_datacenter: false,
      ip_pays_inhabituel: form.ip_pays_inhabituel,
      ip_sur_liste_noire: false,
    },
    anonymization_detection: {
      tor_detecte: false,
      vpn_detecte: false,
      proxy_detecte: false,
    },
    behavioral_biometrics_ueba: {
      duree_session_min: 0,
      nb_ecrans_session: 0,
      delai_otp_s: 0,
      nb_echecs_login_24h: 0,
      vitesse_frappe: 0,
      entropie_souris: 0,
      nombre_requetes_par_minute: 0,
    },
    engineered_features_profiling: {
      vitesse_24h: 0,
      ratio_montant_median_30j: 0,
      beneficiaire_nouveau: form.beneficiaire_nouveau,
      distance_km_habitude: 0,
      changement_appareil: form.changement_appareil,
    },
    relational_graph_features: {
      degre_client: 0,
      nb_voisins_frauduleux: 0,
      score_reseau: 0,
    },
    security_integrity: {
      signature_transaction_valide: false,
      certificat_valide: false,
      score_confiance_client_api: 0,
    },
  };
}

/**
 * Corps POST /api/v1/transactions/evaluate — métadonnées en français (validateur + persistance backend).
 * Inclut `transaction_event` complet + `target_labels` pour éviter 422 « validation du corps » côté API stricte.
 * Coordonnées dans `metadata` **et** à la racine du JSON (`latitude_debit` / `longitude_debit`) pour que le backend
 * ou PostgREST puisse persister dans `transactions` même si un validateur supprime des clés imbriquées.
 */
export function buildEvaluateTransactionBody(
  form: ClientFormLike,
  referenceClient: string,
  transactionNumber: string,
  options: EvaluateTransactionOptions
): Record<string, unknown> {
  const now = new Date();
  const amount = parseFloat(form.montant) || 0;
  const utcDay = now.getUTCDay();
  const jourSemaine = utcDay === 0 ? 7 : utcDay;
  const heure =
    typeof form.heure === 'number' && form.heure >= 0 && form.heure <= 23
      ? form.heure
      : now.getUTCHours();

  const geo = options.geolocation;
  const latD = geo.latitude_debit;
  const lonD = geo.longitude_debit;
  const latC = geo.latitude_credit ?? null;
  const lonC = geo.longitude_credit ?? null;

  const metadata: Record<string, unknown> = {
    date_transaction: now.toISOString(),
    numero_transaction: transactionNumber,
    id_client: referenceClient.trim(),
    montant: amount,
    devise: 'FC',
    heure,
    jour_semaine: jourSemaine,
    type_transaction: form.type_transaction,
    canal: form.canal,
    reference_beneficiaire: buildBeneficiarySummary(form),
    source_environnement: 'app',
    latitude_debit: latD,
    longitude_debit: lonD,
    ...(form.beneficiary_mode === 'banque' ? { flux_bancaire: form.bank_flow } : {}),
  };
  if (latC != null && lonC != null && Number.isFinite(latC) && Number.isFinite(lonC)) {
    metadata.latitude_credit = latC;
    metadata.longitude_credit = lonC;
  }

  const body: Record<string, unknown> = {
    transaction_event: {
      metadata,
      ...buildFrenchTransactionEventBlocks(form),
    },
    target_labels: {
      cible_fraude: false,
      cible_session_anormale: false,
      cible_comportement_atypique: false,
    },
    latitude_debit: latD,
    longitude_debit: lonD,
    latitude_credit: latC ?? null,
    longitude_credit: lonC ?? null,
  };

  if (options.compteId) body.compte_id = options.compteId;
  if (options.beneficiaireId) body.beneficiaire_id = options.beneficiaireId;
  if (options.sessionId) body.session_id = options.sessionId;

  return body;
}
