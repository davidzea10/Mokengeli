/** Chiffres uniquement (pour validation téléphone RDC). */
export function digitsOnly(s: string): string {
  return String(s || '').replace(/\D/g, '');
}

/** Forme locale 10 chiffres (alignée backend : +243… → 0XXXXXXXXX). */
export function canonicalRdc10(s: string): string | null {
  const d = digitsOnly(s);
  if (!d.length) return null;
  if (d.length === 12 && d.startsWith('243')) {
    const national = d.slice(3);
    if (national.length === 9) return `0${national}`;
  }
  if (d.length === 10) return d;
  if (d.length === 9) return `0${d}`;
  if (d.length > 10) return d.slice(-10);
  return null;
}

/** Saisie acceptée pour l’envoi (10 chiffres locaux ou +243…). */
export function isValidPhoneRdcInput(s: string): boolean {
  const c = canonicalRdc10(s);
  return c != null && c.length === 10;
}
