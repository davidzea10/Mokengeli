import type { Transaction } from '../types';

export type CanalMode = 'banque' | 'mobile' | '—';

function formatModeLabel(mode: CanalMode): string {
  if (mode === 'banque') return 'Banque';
  if (mode === 'mobile') return 'Mobile';

  return '—';
}

/** Infère banque vs mobile à partir du libellé canal de la transaction. */
export function canalToMode(canal: string): CanalMode {
  const c = canal.toLowerCase();
  if (c.includes('mobile') || c.includes('ussd') || c.includes('m-pesa') || c.includes('mpesa'))
    return 'mobile';
  if (
    c.includes('web') ||
    c.includes('agence') ||
    c.includes('virement') ||
    c.includes('banque') ||
    c === 'app' ||
    c.includes('application')
  )
    return 'banque';
  return '—';
}

/** Découpe un affichage du type « REF (Nom complet) ». */
function parseClientDisplay(id: string): { nom: string; compte: string } {
  const m = id.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (m) return { compte: m[1].trim(), nom: m[2].trim() };
  return { nom: id, compte: id };
}

export function getTransactionParties(tx: Transaction): {
  expediteur: { nom: string; compte_ou_numero: string; mode: CanalMode };
  destinataire: { nom: string; compte_ou_numero: string; mode: CanalMode };
  expediteurModeLabel: string;
  destinataireModeLabel: string;
} {
  const meta = tx.transaction_event.metadata;
  const parties = meta.parties;
  const canalExp = canalToMode(meta.canal);

  if (parties) {
    return {
      expediteur: parties.expediteur,
      destinataire: parties.destinataire,
      expediteurModeLabel: formatModeLabel(parties.expediteur.mode),
      destinataireModeLabel: formatModeLabel(parties.destinataire.mode),
    };
  }

  const parsed = parseClientDisplay(meta.id_client);
  return {
    expediteur: {
      nom: parsed.nom,
      compte_ou_numero: parsed.compte,
      mode: canalExp,
    },
    destinataire: {
      nom: '—',
      compte_ou_numero: '—',
      mode: '—',
    },
    expediteurModeLabel: formatModeLabel(canalExp),
    destinataireModeLabel: '—',
  };
}
