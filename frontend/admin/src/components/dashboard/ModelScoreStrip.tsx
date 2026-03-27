/** Petites cartes : taux moyen des trois modèles de scoring (0–100 % ou indisponible). */

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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        {
          key: 'tx',
          title: 'Modèle transactionnel',
          subtitle: 'Scoring opérationnel & financier',
          value: pctLabel(scoreTransaction),
        },
        {
          key: 'sess',
          title: 'Modèle session',
          subtitle: 'Contexte de session & appareil',
          value: pctLabel(scoreSession),
        },
        {
          key: 'comp',
          title: 'Modèle comportement',
          subtitle: 'Habitudes & biométrie',
          value: pctLabel(scoreComportement),
        },
      ].map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{card.title}</p>
          <p className="mt-1 text-xs text-neutral-500">{card.subtitle}</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-rb-black">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
