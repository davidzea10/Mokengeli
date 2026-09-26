import { useState } from 'react';
import { analyzeWithLisungi, isApiConfigured, type LisungiAnalyzeData } from '../api';
import { useClientSession } from '../context/ClientSessionContext';
import { useTheme } from '../context/ThemeContext';

const SUGGESTIONS = [
  'Analyse mon comportement de paiement',
  'Quels marchands / bénéficiaires dominent ?',
  'Comment réduire mon risque de fraude ?',
  'Conseils pour améliorer mes habitudes',
];

function AdviceList({
  title,
  items,
  tone,
  isDark,
}: {
  title: string;
  items: string[];
  tone: 'amber' | 'sky' | 'emerald';
  isDark: boolean;
}) {
  if (!items?.length) return null;
  const tones = {
    amber: isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50',
    sky: isDark ? 'border-sky-500/30 bg-sky-500/10' : 'border-sky-200 bg-sky-50',
    emerald: isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50',
  };
  const titles = {
    amber: isDark ? 'text-amber-200' : 'text-amber-900',
    sky: isDark ? 'text-sky-200' : 'text-sky-900',
    emerald: isDark ? 'text-emerald-200' : 'text-emerald-900',
  };
  return (
    <section className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <h3 className={`text-sm font-semibold ${titles[tone]}`}>{title}</h3>
      <ul className={`mt-2 space-y-2 text-sm leading-relaxed ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>
        {items.map((item, i) => (
          <li key={`${title}-${i}`} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
            <span className="whitespace-pre-wrap">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LisungiPage() {
  const { selectedProfile, userDisplayName } = useClientSession();
  const { isDark } = useTheme();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LisungiAnalyzeData | null>(null);

  const runAnalyze = async (q?: string) => {
    const prompt = (q ?? question).trim();
    setError('');
    if (!selectedProfile) {
      setError('Session client introuvable. Reconnectez-vous.');
      return;
    }
    if (!isApiConfigured()) {
      setError('API non configurée (VITE_API_BASE_URL).');
      return;
    }
    setLoading(true);
    try {
      const res = await analyzeWithLisungi(selectedProfile, prompt || undefined);
      if (!res.ok) {
        setError(res.message || 'Analyse impossible.');
        setResult(null);
        return;
      }
      setResult(res.data);
      if (prompt) setQuestion(prompt);
    } finally {
      setLoading(false);
    }
  };

  const card = isDark ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-white shadow-sm';
  const textMuted = isDark ? 'text-neutral-400' : 'text-gray-600';
  const textMain = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className={`rounded-2xl border p-5 ${card}`}>
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-mk-blue to-mk-blue-dark text-lg font-bold text-white shadow-md shadow-mk-blue/30">
            L
          </div>
          <div className="min-w-0">
            <h1 className={`text-xl font-bold tracking-tight ${textMain}`}>Lisungi</h1>
            <p className={`mt-1 text-sm leading-relaxed ${textMuted}`}>
              Votre assistant analyse vos transactions, marchands / bénéficiaires et habitudes pour
              proposer remarques, conseils et recommandations d’amélioration.
            </p>
            <p className={`mt-2 text-xs ${textMuted}`}>
              Profil : <span className="font-medium text-mk-blue">{userDisplayName}</span>
            </p>
          </div>
        </div>
      </header>

      <div className={`rounded-2xl border p-4 sm:p-5 ${card}`}>
        <label className={`mb-2 block text-sm font-medium ${textMain}`} htmlFor="lisungi-q">
          Votre question (optionnel)
        </label>
        <textarea
          id="lisungi-q"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex. Comment puis-je payer plus sûrement chez mes marchands habituels ?"
          className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-mk-blue/40 ${
            isDark
              ? 'border-white/10 bg-black/30 text-white placeholder:text-neutral-500'
              : 'border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400'
          }`}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => void runAnalyze(s)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition disabled:opacity-50 ${
                isDark
                  ? 'border-white/10 text-neutral-300 hover:border-mk-blue/50 hover:text-white'
                  : 'border-gray-200 text-gray-700 hover:border-mk-blue/40 hover:bg-mk-blue/5'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runAnalyze()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mk-blue py-3 text-sm font-semibold text-white shadow-md shadow-mk-blue/25 transition hover:bg-mk-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Analyse en cours…
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Lancer Lisungi
            </>
          )}
        </button>
        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}
      </div>

      {result?.advice ? (
        <div className="space-y-3">
          <div className={`rounded-2xl border p-4 ${card}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>Synthèse</p>
            <p className={`mt-2 text-sm leading-relaxed ${textMain}`}>{result.advice.resume}</p>
            {result.context_preview ? (
              <div className={`mt-3 flex flex-wrap gap-2 text-[11px] ${textMuted}`}>
                {result.context_preview.nb_transactions != null ? (
                  <span className="rounded-full border border-current/20 px-2 py-0.5">
                    {result.context_preview.nb_transactions} ops
                  </span>
                ) : null}
                {result.context_preview.avg_risk_pct != null ? (
                  <span className="rounded-full border border-current/20 px-2 py-0.5">
                    Risque moy. {result.context_preview.avg_risk_pct} %
                  </span>
                ) : null}
                {result.advice.mode ? (
                  <span className="rounded-full border border-current/20 px-2 py-0.5">{result.advice.mode}</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <AdviceList title="Remarques" items={result.advice.remarques} tone="amber" isDark={isDark} />
          <AdviceList title="Conseils" items={result.advice.conseils} tone="sky" isDark={isDark} />
          <AdviceList
            title="Recommandations d’amélioration"
            items={result.advice.recommandations}
            tone="emerald"
            isDark={isDark}
          />

          {result.context_preview?.top_marchands && result.context_preview.top_marchands.length > 0 ? (
            <section className={`rounded-2xl border p-4 ${card}`}>
              <h3 className={`text-sm font-semibold ${textMain}`}>Marchands / bénéficiaires (contexte RAG)</h3>
              <ul className={`mt-2 space-y-1.5 text-sm ${textMuted}`}>
                {result.context_preview.top_marchands.map((m) => (
                  <li key={m.name} className="flex justify-between gap-2">
                    <span className={`truncate ${textMain}`}>{m.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {m.count} · {Math.round(m.total).toLocaleString('fr-FR')} FC
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
