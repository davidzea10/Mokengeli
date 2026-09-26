import { useEffect, useRef, useState } from 'react';
import { analyzeWithLisungi, isApiConfigured, type LisungiAdvice, type LisungiAnalyzeData } from '../api';
import { useClientSession } from '../context/ClientSessionContext';
import { useTheme } from '../context/ThemeContext';

const SUGGESTIONS = [
  'Analyse mon comportement de paiement',
  'Quels marchands / bénéficiaires dominent ?',
  'Comment réduire mon risque de fraude ?',
  'Conseils pour améliorer mes habitudes',
];

const ANALYZE_STEPS = [
  'Connexion au profil client…',
  'Lecture de l’historique des transactions…',
  'Cartographie des marchands et bénéficiaires…',
  'Évaluation des scores de risque (M1 · M2 · M3)…',
  'Détection des habitudes et horaires…',
  'Rédaction des remarques et conseils…',
  'Finalisation des recommandations…',
];

const MIN_ANALYZE_MS = 3200;
const ITEM_REVEAL_MS = 720;
const SECTION_PAUSE_MS = 480;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

type RevealPhase = 'idle' | 'analyzing' | 'resume' | 'remarques' | 'conseils' | 'recommandations' | 'marchands' | 'done';

function AnalyzingPanel({
  stepIndex,
  progress,
  isDark,
}: {
  stepIndex: number;
  progress: number;
  isDark: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border p-5 sm:p-6 ${
        isDark
          ? 'border-mk-blue/40 bg-gradient-to-br from-mk-blue/20 to-black/40'
          : 'border-mk-blue/30 bg-gradient-to-br from-sky-50 via-white to-indigo-50'
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-mk-blue/20" />
          <span className="absolute inset-2 animate-[lisungiPulse_1.8s_ease-in-out_infinite] rounded-full border-2 border-mk-blue/40" />
          <span className="absolute inset-5 animate-[lisungiSpin_3s_linear_infinite] rounded-full border border-dashed border-mk-blue/50" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-mk-blue to-mk-blue-dark text-xl font-bold text-white shadow-lg shadow-mk-blue/40">
            L
          </span>
        </div>
        <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Lisungi analyse…
        </p>
        <p className={`mt-1.5 min-h-[1.25rem] text-sm ${isDark ? 'text-sky-200/90' : 'text-mk-blue-dark'}`}>
          {ANALYZE_STEPS[Math.min(stepIndex, ANALYZE_STEPS.length - 1)]}
        </p>
      </div>

      <div className="mt-5">
        <div className={`h-2 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-sky-100'}`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-mk-blue to-sky-400 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
          />
        </div>
        <p className={`mt-2 text-center text-xs tabular-nums ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
          {Math.min(99, Math.round(progress))} %
        </p>
      </div>

      <ul className="mt-5 space-y-2">
        {ANALYZE_STEPS.map((label, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li
              key={label}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition ${
                current
                  ? isDark
                    ? 'bg-mk-blue/25 text-white'
                    : 'bg-mk-blue/10 text-mk-blue-dark'
                  : done
                    ? isDark
                      ? 'text-emerald-300/90'
                      : 'text-emerald-700'
                    : isDark
                      ? 'text-neutral-500'
                      : 'text-gray-400'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : current
                      ? 'bg-mk-blue text-white'
                      : isDark
                        ? 'bg-white/10 text-neutral-500'
                        : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={current ? 'font-medium' : ''}>{label}</span>
              {current ? (
                <span className="ml-auto flex gap-0.5">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SectionWritingHeader({
  title,
  writing,
  isDark,
  tone,
}: {
  title: string;
  writing: boolean;
  isDark: boolean;
  tone: 'amber' | 'sky' | 'emerald' | 'neutral';
}) {
  const titles = {
    amber: isDark ? 'text-amber-200' : 'text-amber-900',
    sky: isDark ? 'text-sky-200' : 'text-sky-900',
    emerald: isDark ? 'text-emerald-200' : 'text-emerald-900',
    neutral: isDark ? 'text-white' : 'text-gray-900',
  };
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className={`text-sm font-semibold ${titles[tone]}`}>{title}</h3>
      {writing ? (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isDark ? 'bg-mk-blue/25 text-sky-200' : 'bg-mk-blue/10 text-mk-blue-dark'
          }`}
        >
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          Rédaction…
        </span>
      ) : (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          ✓ Prêt
        </span>
      )}
    </div>
  );
}

function ProgressiveAdviceSection({
  title,
  items,
  visibleCount,
  writing,
  tone,
  isDark,
}: {
  title: string;
  items: string[];
  visibleCount: number;
  writing: boolean;
  tone: 'amber' | 'sky' | 'emerald';
  isDark: boolean;
}) {
  if (!items.length && !writing) return null;
  const tones = {
    amber: isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50',
    sky: isDark ? 'border-sky-500/30 bg-sky-500/10' : 'border-sky-200 bg-sky-50',
    emerald: isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50',
  };
  const shown = items.slice(0, visibleCount);

  return (
    <section className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <SectionWritingHeader title={title} writing={writing} isDark={isDark} tone={tone} />
      <ul className={`space-y-2 text-sm leading-relaxed ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>
        {shown.map((item, i) => (
          <li
            key={`${title}-${i}`}
            className="flex gap-2 opacity-0 animate-[lisungiFadeUp_0.45s_ease-out_forwards]"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
            <span className="whitespace-pre-wrap">{item}</span>
          </li>
        ))}
        {writing && visibleCount < items.length ? (
          <li className={`flex items-center gap-2 text-xs ${isDark ? 'text-sky-200/80' : 'text-mk-blue'}`}>
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
            </span>
            Analyse du point suivant…
          </li>
        ) : null}
      </ul>
    </section>
  );
}

export function LisungiPage() {
  const { selectedProfile, userDisplayName } = useClientSession();
  const { isDark } = useTheme();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LisungiAnalyzeData | null>(null);
  const [phase, setPhase] = useState<RevealPhase>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visibleRemarques, setVisibleRemarques] = useState(0);
  const [visibleConseils, setVisibleConseils] = useState(0);
  const [visibleRecos, setVisibleRecos] = useState(0);
  const [showResume, setShowResume] = useState(false);
  const [showMarchands, setShowMarchands] = useState(false);

  const stepTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const revealCancelRef = useRef(false);

  useEffect(() => {
    return () => {
      revealCancelRef.current = true;
      if (stepTimerRef.current) window.clearInterval(stepTimerRef.current);
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    };
  }, []);

  const clearTimers = () => {
    if (stepTimerRef.current) {
      window.clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const resetReveal = () => {
    setShowResume(false);
    setShowMarchands(false);
    setVisibleRemarques(0);
    setVisibleConseils(0);
    setVisibleRecos(0);
  };

  const startAnalyzeMotion = () => {
    clearTimers();
    setStepIndex(0);
    setProgress(6);
    stepTimerRef.current = window.setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, ANALYZE_STEPS.length - 1));
    }, 480);
    progressTimerRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        return p + 2 + Math.random() * 4;
      });
    }, 220);
  };

  const revealAdviceSequentially = async (advice: LisungiAdvice, hasMarchands: boolean) => {
    setPhase('resume');
    await sleep(400);
    if (revealCancelRef.current) return;
    setShowResume(true);
    await sleep(SECTION_PAUSE_MS + 200);

    setPhase('remarques');
    for (let i = 1; i <= advice.remarques.length; i++) {
      if (revealCancelRef.current) return;
      setVisibleRemarques(i);
      await sleep(ITEM_REVEAL_MS);
    }
    await sleep(SECTION_PAUSE_MS);

    setPhase('conseils');
    for (let i = 1; i <= advice.conseils.length; i++) {
      if (revealCancelRef.current) return;
      setVisibleConseils(i);
      await sleep(ITEM_REVEAL_MS);
    }
    await sleep(SECTION_PAUSE_MS);

    setPhase('recommandations');
    for (let i = 1; i <= advice.recommandations.length; i++) {
      if (revealCancelRef.current) return;
      setVisibleRecos(i);
      await sleep(ITEM_REVEAL_MS);
    }
    await sleep(SECTION_PAUSE_MS);

    if (hasMarchands) {
      setPhase('marchands');
      await sleep(350);
      if (revealCancelRef.current) return;
      setShowMarchands(true);
      await sleep(500);
    }

    setPhase('done');
  };

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

    revealCancelRef.current = true;
    await sleep(30);
    revealCancelRef.current = false;

    setBusy(true);
    setResult(null);
    resetReveal();
    setPhase('analyzing');
    startAnalyzeMotion();
    const started = Date.now();

    try {
      const res = await analyzeWithLisungi(selectedProfile, prompt || undefined);
      const elapsed = Date.now() - started;
      if (elapsed < MIN_ANALYZE_MS) {
        await sleep(MIN_ANALYZE_MS - elapsed);
      }

      clearTimers();
      setStepIndex(ANALYZE_STEPS.length - 1);
      setProgress(100);

      if (!res.ok) {
        setError(res.message || 'Analyse impossible.');
        setResult(null);
        setPhase('idle');
        return;
      }

      await sleep(400);
      setResult(res.data);
      if (prompt) setQuestion(prompt);

      const advice = res.data.advice;
      const hasMarchands = Boolean(res.data.context_preview?.top_marchands?.length);
      await revealAdviceSequentially(advice, hasMarchands);
    } finally {
      clearTimers();
      setBusy(false);
      if (!revealCancelRef.current) {
        setPhase((p) => (p === 'analyzing' ? 'idle' : p));
      }
    }
  };

  const card = isDark ? 'border-white/10 bg-white/[0.04]' : 'border-gray-200 bg-white shadow-sm';
  const textMuted = isDark ? 'text-neutral-400' : 'text-gray-600';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const analyzing = phase === 'analyzing';
  const revealing = ['resume', 'remarques', 'conseils', 'recommandations', 'marchands'].includes(phase);
  const advice = result?.advice;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <style>{`
        @keyframes lisungiFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lisungiPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes lisungiSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

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
          disabled={busy}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex. Comment puis-je payer plus sûrement chez mes marchands habituels ?"
          className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-mk-blue/40 disabled:opacity-60 ${
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
              disabled={busy}
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
          disabled={busy}
          onClick={() => void runAnalyze()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mk-blue py-3 text-sm font-semibold text-white shadow-md shadow-mk-blue/25 transition hover:bg-mk-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {analyzing ? 'Analyse en cours…' : 'Rédaction des résultats…'}
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

      {analyzing ? <AnalyzingPanel stepIndex={stepIndex} progress={progress} isDark={isDark} /> : null}

      {(revealing || phase === 'done') && advice ? (
        <div className="space-y-3">
          {showResume ? (
            <div className={`rounded-2xl border p-4 opacity-0 animate-[lisungiFadeUp_0.5s_ease-out_forwards] ${card}`}>
              <SectionWritingHeader
                title="Synthèse"
                writing={phase === 'resume'}
                isDark={isDark}
                tone="neutral"
              />
              <p className={`mt-1 text-sm leading-relaxed ${textMain}`}>{advice.resume}</p>
              {result?.context_preview ? (
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
                  {advice.mode ? (
                    <span className="rounded-full border border-current/20 px-2 py-0.5">{advice.mode}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {(phase === 'remarques' ||
            phase === 'conseils' ||
            phase === 'recommandations' ||
            phase === 'marchands' ||
            phase === 'done' ||
            visibleRemarques > 0) &&
          advice.remarques.length > 0 ? (
            <ProgressiveAdviceSection
              title="Remarques"
              items={advice.remarques}
              visibleCount={visibleRemarques}
              writing={phase === 'remarques'}
              tone="amber"
              isDark={isDark}
            />
          ) : null}

          {(phase === 'conseils' ||
            phase === 'recommandations' ||
            phase === 'marchands' ||
            phase === 'done' ||
            visibleConseils > 0) &&
          advice.conseils.length > 0 ? (
            <ProgressiveAdviceSection
              title="Conseils"
              items={advice.conseils}
              visibleCount={visibleConseils}
              writing={phase === 'conseils'}
              tone="sky"
              isDark={isDark}
            />
          ) : null}

          {(phase === 'recommandations' || phase === 'marchands' || phase === 'done' || visibleRecos > 0) &&
          advice.recommandations.length > 0 ? (
            <ProgressiveAdviceSection
              title="Recommandations d’amélioration"
              items={advice.recommandations}
              visibleCount={visibleRecos}
              writing={phase === 'recommandations'}
              tone="emerald"
              isDark={isDark}
            />
          ) : null}

          {showMarchands && result?.context_preview?.top_marchands?.length ? (
            <section
              className={`rounded-2xl border p-4 opacity-0 animate-[lisungiFadeUp_0.55s_ease-out_forwards] ${card}`}
            >
              <SectionWritingHeader
                title="Marchands / bénéficiaires (contexte RAG)"
                writing={phase === 'marchands'}
                isDark={isDark}
                tone="neutral"
              />
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

          {phase === 'done' ? (
            <p className={`text-center text-xs ${textMuted}`}>Analyse Lisungi terminée.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
