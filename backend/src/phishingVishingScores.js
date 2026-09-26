/**
 * Couche phishing / vishing (ingénierie sociale).
 * Heuristique MVP alignée sur les seuils globaux :
 * - 0–39 %  → faible
 * - 40–69 % → moyen (OTP)
 * - 70–100 % → élevé (blocage potentiel)
 */

import { THRESHOLD_BLOCK, THRESHOLD_OTP } from './m2m3Scores.js';

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function asBool(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

function asNum(v, fallback = 0) {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function levelFromScore(score01) {
  if (score01 >= THRESHOLD_BLOCK) return 'eleve';
  if (score01 >= THRESHOLD_OTP) return 'moyen';
  return 'faible';
}

/**
 * Extrait des signaux utiles depuis features M1 / transaction_event.
 */
export function extractSocialSignals(features = {}, te = {}) {
  const net = te.network_intelligence || {};
  const anon = te.anonymization_detection || {};
  const beh = te.behavioral_biometrics_ueba || {};
  const eng = te.engineered_features_profiling || {};

  return {
    vpn: asBool(features.vpn_detecte ?? anon.vpn_detecte ?? anon.vpn_detected),
    tor: asBool(features.tor_detecte ?? anon.tor_detecte ?? anon.tor_detected),
    proxy: asBool(features.proxy_detecte ?? anon.proxy_detecte ?? anon.proxy_detected),
    ip_datacenter: asBool(features.ip_datacenter ?? net.ip_datacenter),
    ip_pays_inhabituel: asBool(features.ip_pays_inhabituel ?? net.ip_pays_inhabituel),
    ip_sur_liste_noire: asBool(features.ip_sur_liste_noire ?? net.ip_sur_liste_noire),
    beneficiaire_nouveau: asBool(features.beneficiaire_nouveau ?? eng.beneficiaire_nouveau),
    changement_appareil: asBool(features.changement_appareil ?? eng.changement_appareil),
    delai_otp_s: asNum(features.delai_otp_s ?? beh.delai_otp_s, 0),
    nb_echecs_login_24h: asNum(features.nb_echecs_login_24h ?? beh.nb_echecs_login_24h, 0),
    ratio_montant: asNum(features.ratio_montant_median_30j ?? eng.ratio_montant_median_30j, 0),
    distance_km: asNum(features.distance_km_habitude ?? eng.distance_km_habitude, 0),
    heure: asNum(features.heure, 12),
    score_reputation_ip: asNum(features.score_reputation_ip ?? net.score_reputation_ip, 0.7),
  };
}

/**
 * Score phishing (liens / appareils / IP / anonymisation).
 */
export function scorePhishing(signals) {
  let score = 0.04;
  const reasons = [];

  if (signals.tor) {
    // Tor seul → blocage (≥ 70 %)
    score += 0.7;
    reasons.push('tor_detecte');
  }
  if (signals.vpn) {
    // VPN seul → OTP (≥ 40 %)
    score += 0.4;
    reasons.push('vpn_detecte');
  }
  if (signals.proxy) {
    score += 0.12;
    reasons.push('proxy_detecte');
  }
  if (signals.ip_datacenter) {
    score += 0.12;
    reasons.push('ip_datacenter');
  }
  if (signals.ip_pays_inhabituel) {
    score += 0.14;
    reasons.push('ip_pays_inhabituel');
  }
  if (signals.ip_sur_liste_noire) {
    score += 0.2;
    reasons.push('ip_sur_liste_noire');
  }
  if (signals.changement_appareil) {
    score += 0.16;
    reasons.push('changement_appareil');
  }
  if (signals.beneficiaire_nouveau) {
    score += 0.12;
    reasons.push('beneficiaire_nouveau');
  }
  if (signals.score_reputation_ip > 0 && signals.score_reputation_ip < 0.35) {
    score += 0.15;
    reasons.push('ip_reputation_faible');
  }
  if (signals.distance_km >= 400) {
    score += 0.08;
    reasons.push('distance_inhabituelle');
  }

  const finalScore = clamp01(Math.round(score * 10000) / 10000);
  return {
    score: finalScore,
    niveau: levelFromScore(finalScore),
    reasons,
    model: 'm-phishing-heuristique-0.1',
  };
}

/**
 * Score vishing (pression téléphonique / OTP / urgence).
 */
export function scoreVishing(signals) {
  let score = 0.03;
  const reasons = [];

  if (signals.delai_otp_s >= 90) {
    score += 0.22;
    reasons.push('delai_otp_eleve');
  } else if (signals.delai_otp_s >= 45) {
    score += 0.12;
    reasons.push('delai_otp_modere');
  }

  if (signals.nb_echecs_login_24h >= 3) {
    score += 0.18;
    reasons.push('echecs_login_multiples');
  } else if (signals.nb_echecs_login_24h >= 1) {
    score += 0.08;
    reasons.push('echec_login_recent');
  }

  if (signals.beneficiaire_nouveau && signals.ratio_montant >= 2.5) {
    score += 0.2;
    reasons.push('urgence_nouveau_beneficiaire');
  } else if (signals.beneficiaire_nouveau) {
    score += 0.1;
    reasons.push('beneficiaire_nouveau');
  }

  if (signals.ratio_montant >= 3.5) {
    score += 0.14;
    reasons.push('montant_atypique');
  }

  if (signals.heure < 6 || signals.heure >= 22) {
    score += 0.1;
    reasons.push('horaire_sensible');
  }

  if (signals.changement_appareil && signals.delai_otp_s >= 45) {
    score += 0.12;
    reasons.push('appareil_et_otp_sous_pression');
  }

  const finalScore = clamp01(Math.round(score * 10000) / 10000);
  return {
    score: finalScore,
    niveau: levelFromScore(finalScore),
    reasons,
    model: 'm-vishing-heuristique-0.1',
  };
}

/**
 * Évalue la couche sociale et ajuste la décision M1/M2/M3.
 * @param {{ score_combined: number, decision: string, reason_codes: string[] }} base
 * @param {object} features
 * @param {object} te transaction_event
 */
export function applyPhishingVishingLayer(base, features, te) {
  const signals = extractSocialSignals(features, te);
  const phishing = scorePhishing(signals);
  const vishing = scoreVishing(signals);
  const socialMax = Math.max(phishing.score, vishing.score);

  let decision = base.decision;
  const reason_codes = [...(base.reason_codes || [])];

  // Escalade : un score social élevé force au minimum OTP / block
  if (socialMax >= THRESHOLD_BLOCK) {
    if (decision !== 'block') {
      decision = 'block';
      reason_codes.push('social_engineering_block');
    }
  } else if (socialMax >= THRESHOLD_OTP) {
    if (decision === 'allow') {
      decision = 'challenge';
      reason_codes.push('social_engineering_otp');
    }
  }

  // Règles dures : Tor → block ; VPN → au moins OTP
  if (signals.tor && decision !== 'block') {
    decision = 'block';
    reason_codes.push('tor_hard_block');
  } else if (signals.vpn && decision === 'allow') {
    decision = 'challenge';
    reason_codes.push('vpn_hard_otp');
  }

  if (phishing.niveau !== 'faible') {
    reason_codes.push(`phishing_${phishing.niveau}`);
    reason_codes.push(...phishing.reasons.slice(0, 3).map((r) => `ph:${r}`));
  }
  if (vishing.niveau !== 'faible') {
    reason_codes.push(`vishing_${vishing.niveau}`);
    reason_codes.push(...vishing.reasons.slice(0, 3).map((r) => `vi:${r}`));
  }

  // Score combiné affiché : max(moyenne modèles, couche sociale) pour cohérence seuils
  const score_combined = clamp01(Math.max(base.score_combined, socialMax * 0.85 + base.score_combined * 0.15));

  return {
    score_combined,
    decision,
    reason_codes: [...new Set(reason_codes)],
    phishing,
    vishing,
    social_max: socialMax,
  };
}

export function buildSocialMotifsPayload(phishing, vishing, reasonCodes) {
  return {
    reason_codes: reasonCodes,
    phishing: {
      score: phishing.score,
      niveau: phishing.niveau,
      reasons: phishing.reasons,
      model: phishing.model,
    },
    vishing: {
      score: vishing.score,
      niveau: vishing.niveau,
      reasons: vishing.reasons,
      model: vishing.model,
    },
  };
}
