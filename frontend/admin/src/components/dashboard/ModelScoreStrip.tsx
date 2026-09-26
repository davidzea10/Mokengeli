/** Petites cartes : taux moyen des modèles de scoring (0–100 %). */

interface ModelScoreStripProps {
  scoreTransaction: number | null;
  scoreSession: number | null;
  scoreComportement: number | null;
  scorePhishing?: number | null;
  scoreVishing?: number | null;
}

function pctLabel(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n)} %`;
}

export function ModelScoreStrip({
  scoreTransaction,
  scoreSession,
  scoreComportement,
  scorePhishing = null,
  scoreVishing = null,
}: ModelScoreStripProps) {
  const cards = [
    {
      key: 'tx',
      code: 'M1',
      title: 'Modèle transactionnel',
      subtitle: 'Scoring opérationnel & financier',
      value: pctLabel(scoreTransaction),
      tone: 'emerald' as const,
    },
    {
      key: 'sess',
      code: 'M2',
      title: 'Modèle session',
      subtitle: 'Contexte de session & appareil',
      value: pctLabel(scoreSession),
      tone: 'emerald' as const,
    },
    {
      key: 'comp',
      code: 'M3',
      title: 'Modèle comportement',
      subtitle: 'Habitudes & biométrie',
      value: pctLabel(scoreComportement),
      tone: 'emerald' as const,
    },
    {
      key: 'ph',
      code: 'Ph',
      title: 'Phishing',
      subtitle: 'Liens / IP / anonymisation · seuils 40 / 70',
      value: pctLabel(scorePhishing),
      tone: 'violet' as const,
    },
    {
      key: 'vi',
      code: 'Vi',
      title: 'Vishing',
      subtitle: 'Pression téléphonique / OTP · seuils 40 / 70',
      value: pctLabel(scoreVishing),
      tone: 'rose' as const,
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{card.title}</p>
            <span
              className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                card.tone === 'violet'
                  ? 'bg-violet-50 text-violet-800 ring-violet-100'
                  : card.tone === 'rose'
                    ? 'bg-rose-50 text-rose-800 ring-rose-100'
                    : 'bg-emerald-50 text-emerald-800 ring-emerald-100'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  card.tone === 'violet'
                    ? 'bg-violet-500'
                    : card.tone === 'rose'
                      ? 'bg-rose-500'
                      : 'bg-emerald-500'
                }`}
              />
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
