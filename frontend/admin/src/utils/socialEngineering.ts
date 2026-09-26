/**
 * Parse `scores_evaluation.texte_motifs` pour la couche phishing / vishing.
 */

export type SocialNiveau = 'faible' | 'moyen' | 'eleve';

export interface SocialLayerScore {
  scorePercent: number | null;
  niveau: SocialNiveau | null;
  reasons: string[];
  model?: string | null;
}

export interface SocialLayers {
  phishing: SocialLayerScore;
  vishing: SocialLayerScore;
  reasonCodes: string[];
}

function emptyLayer(): SocialLayerScore {
  return { scorePercent: null, niveau: null, reasons: [], model: null };
}

function toPercent(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const pct = n <= 1 ? n * 100 : n;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

function asNiveau(v: unknown): SocialNiveau | null {
  const s = String(v || '').toLowerCase();
  if (s === 'faible' || s === 'moyen' || s === 'eleve' || s === 'élevé') {
    return s === 'élevé' ? 'eleve' : (s as SocialNiveau);
  }
  return null;
}

export function parseSocialLayersFromMotifs(texteMotifs: unknown): SocialLayers {
  const empty: SocialLayers = {
    phishing: emptyLayer(),
    vishing: emptyLayer(),
    reasonCodes: [],
  };
  if (texteMotifs == null) return empty;

  let raw: unknown = texteMotifs;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return empty;
    try {
      raw = JSON.parse(t);
    } catch {
      return { ...empty, reasonCodes: t.startsWith('[') ? [] : [t] };
    }
  }

  if (Array.isArray(raw)) {
    return { ...empty, reasonCodes: raw.map(String) };
  }

  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  if (!o) return empty;

  const ph = o.phishing && typeof o.phishing === 'object' ? (o.phishing as Record<string, unknown>) : null;
  const vi = o.vishing && typeof o.vishing === 'object' ? (o.vishing as Record<string, unknown>) : null;
  const codes = Array.isArray(o.reason_codes) ? o.reason_codes.map(String) : [];

  return {
    reasonCodes: codes,
    phishing: {
      scorePercent: toPercent(ph?.score),
      niveau: asNiveau(ph?.niveau),
      reasons: Array.isArray(ph?.reasons) ? ph!.reasons.map(String) : [],
      model: ph?.model != null ? String(ph.model) : null,
    },
    vishing: {
      scorePercent: toPercent(vi?.score),
      niveau: asNiveau(vi?.niveau),
      reasons: Array.isArray(vi?.reasons) ? vi!.reasons.map(String) : [],
      model: vi?.model != null ? String(vi.model) : null,
    },
  };
}

export function socialNiveauLabel(n: SocialNiveau | null | undefined): string {
  switch (n) {
    case 'eleve':
      return 'Élevé';
    case 'moyen':
      return 'Moyen';
    case 'faible':
      return 'Faible';
    default:
      return '—';
  }
}

export function socialBadgeClasses(n: SocialNiveau | null | undefined): string {
  switch (n) {
    case 'eleve':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'moyen':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'faible':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}
