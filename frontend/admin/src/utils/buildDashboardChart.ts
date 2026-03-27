import type { Transaction } from '../types';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Agrège les transactions sur les 7 derniers jours calendaires (au fuseau local).
 */
export function buildLast7DaysChart(txs: Transaction[]): { date: string; value: number; fraud: number }[] {
  const buckets: { key: string; date: string; value: number; fraud: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets.push({
      key: localDateKey(d),
      date: DAY_LABELS[d.getDay()],
      value: 0,
      fraud: 0,
    });
  }

  txs.forEach((tx) => {
    const raw = tx.transaction_event.metadata.date_transaction;
    const t = new Date(raw);
    if (Number.isNaN(t.getTime())) return;
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    const key = localDateKey(d);
    const b = buckets.find((x) => x.key === key);
    if (!b) return;
    b.value += 1;
    if (tx.target_labels.cible_fraude) b.fraud += 1;
  });

  return buckets.map(({ date, value, fraud }) => ({ date, value, fraud }));
}
