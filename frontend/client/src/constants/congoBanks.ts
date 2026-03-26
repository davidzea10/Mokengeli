/** Banques présentes en RDC — codes internes pour l’API (banque_code). */
export const CONGO_BANKS = [
  { code: 'RAWBANK', label: 'RawBank' },
  { code: 'EQUITY_BCDC', label: 'Equity BCDC' },
  { code: 'ECOBANK', label: 'Ecobank RDC' },
  { code: 'FBNBANK', label: 'FBNBank (First Bank)' },
  { code: 'TRUST', label: 'Trust Merchant Bank' },
  { code: 'BOA', label: 'Bank of Africa' },
  { code: 'ACCESS', label: 'Access Bank' },
  { code: 'SOLIDAIRE', label: 'Financière FCC (Solidaire)' },
  { code: 'STANBIC', label: 'Stanbic Bank' },
  { code: 'UBA', label: 'United Bank for Africa' },
  { code: 'AUTRE', label: 'Autre établissement' },
] as const;

export type CongoBankCode = (typeof CONGO_BANKS)[number]['code'];
