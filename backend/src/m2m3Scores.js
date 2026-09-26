/**
 * M2 (session anormale) et M3 (comportement atypique).
 * Pas d’artefacts joblib dans le dépôt : scoring heuristique sur les features
 * déjà collectées (même vecteur que M1 / schéma satellites).
 */

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function num(v, d = 0) {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : d;
}

/**
 * M2 — anomalie de session (UEBA / biométrie session).
 * @param {Record<string, number>} f features M1 (ou équivalent)
 */
export function scoreM2Session(f) {
  const reasons = [];
  const echecs = clamp01(num(f.nb_echecs_login_24h) / 8);
  if (echecs >= 0.35) reasons.push('m2_echecs_login');

  const otp = clamp01(num(f.delai_otp_s) / 90);
  if (otp >= 0.4) reasons.push('m2_delai_otp');

  const auto = clamp01(num(f.score_probabilite_automatisation));
  if (auto >= 0.4) reasons.push('m2_automatisation');

  const rpm = clamp01(num(f.nombre_requetes_par_minute) / 40);
  if (rpm >= 0.45) reasons.push('m2_requetes_minute');

  const duree = num(f.duree_session_min);
  let dureeScore = 0;
  if (duree > 0 && duree < 0.5) {
    dureeScore = 0.55;
    reasons.push('m2_session_tres_courte');
  } else if (duree > 180) {
    dureeScore = clamp01((duree - 180) / 180);
    reasons.push('m2_session_tres_longue');
  }

  const ecrans = clamp01(num(f.nb_ecrans_session) / 40);
  if (ecrans >= 0.5) reasons.push('m2_parcours_anormal');

  const score = clamp01(
    0.22 * echecs +
      0.18 * otp +
      0.25 * auto +
      0.15 * rpm +
      0.12 * dureeScore +
      0.08 * ecrans,
  );

  return {
    score,
    model: 'm2-heuristique-session-0.1',
    reasons,
  };
}

/**
 * M3 — comportement atypique vs profil habituel.
 * @param {Record<string, number>} f features M1 (ou équivalent)
 */
export function scoreM3Behavior(f) {
  const reasons = [];

  const nouveau = num(f.beneficiaire_nouveau) >= 0.5 ? 0.55 : 0;
  if (nouveau) reasons.push('m3_beneficiaire_nouveau');

  const appareil = num(f.changement_appareil) >= 0.5 ? 0.5 : 0;
  if (appareil) reasons.push('m3_changement_appareil');

  const ratio = num(f.ratio_montant_median_30j);
  let ratioScore = 0;
  if (ratio >= 2.5) {
    ratioScore = clamp01((ratio - 1) / 4);
    reasons.push('m3_montant_atypique');
  } else if (ratio > 0 && ratio < 0.15) {
    ratioScore = 0.25;
  }

  const dist = clamp01(num(f.distance_km_habitude) / 400);
  if (dist >= 0.4) reasons.push('m3_distance_habitude');

  const pays = num(f.ip_pays_inhabituel) >= 0.5 ? 0.55 : 0;
  if (pays) reasons.push('m3_ip_pays_inhabituel');

  const vitesse = clamp01(num(f.vitesse_24h) / 20);
  if (vitesse >= 0.5) reasons.push('m3_vitesse_24h');

  const score = clamp01(
    0.2 * nouveau +
      0.15 * appareil +
      0.25 * ratioScore +
      0.15 * dist +
      0.15 * pays +
      0.1 * vitesse,
  );

  return {
    score,
    model: 'm3-heuristique-comportement-0.1',
    reasons,
  };
}

/**
 * Politique combinée : moyenne M1/M2/M3, seuil 0.5 → challenge.
 */
export function combineScores(m1Proba, m2, m3) {
  const s1 = clamp01(m1Proba);
  const s2 = clamp01(m2?.score);
  const s3 = clamp01(m3?.score);
  const combined = clamp01((s1 + s2 + s3) / 3);
  const decision = combined >= 0.5 ? 'challenge' : 'allow';
  const reason_codes = [
    ...(m1Proba >= 0.5 ? ['m1_fraude'] : []),
    ...((m2?.reasons || []).slice(0, 3)),
    ...((m3?.reasons || []).slice(0, 3)),
  ];
  return { score_combined: combined, decision, reason_codes };
}
