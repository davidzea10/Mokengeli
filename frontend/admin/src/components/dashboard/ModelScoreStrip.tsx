/** Petites cartes : taux moyen des trois modèles de scoring (0–100 %). */

interface ModelScoreStripProps {
  scoreTransaction: number | null;
  scoreSession: number | null;
  scoreComportement: number | null;
}

function pctLabel(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n)} %`;
}

export function ModelScoreStrip({
  scoreTransaction,
  scoreSession,
  scoreComportement,
}: ModelScoreStripProps) {
  const cards = [
    {
      key: 'tx',
      code: 'M1',
      title: 'Modèle transactionnel',
      subtitle: 'Scoring opérationnel & financier',
      value: pctLabel(scoreTransaction),
    },
    {
      key: 'sess',
      code: 'M2',
      title: 'Modèle session',
      subtitle: 'Contexte de session & appareil',
      value: pctLabel(scoreSession),
    },
    {
      key: 'comp',
      code: 'M3',
      title: 'Modèle comportement',
      subtitle: 'Habitudes & biométrie',
      value: pctLabel(scoreComportement),
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{card.title}</p>
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {card.code} actif
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">{card.subtitle}</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-mk-ink">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
