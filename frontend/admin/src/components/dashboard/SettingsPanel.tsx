import { useState } from 'react';

const models = [
  {
    id: 'm1',
    name: 'Scoring transactionnel',
    code: 'M1',
    version: 'v1.2.0',
    updated: '15/03/2026',
    desc: 'Score de risque par transaction',
    color: 'from-rb-yellow to-rb-yellow-dark',
  },
  {
    id: 'm2',
    name: 'Détection de session',
    code: 'M2',
    version: 'v1.1.5',
    updated: '10/03/2026',
    desc: 'Anomalies de session et appareil',
    color: 'from-violet-500 to-violet-600',
  },
  {
    id: 'm3',
    name: 'Comportement',
    code: 'M3',
    version: 'v1.0.8',
    updated: '01/03/2026',
    desc: 'Biométrie comportementale (UEBA)',
    color: 'from-emerald-500 to-emerald-600',
  },
] as const;

function PolicySlider({
  label,
  description,
  value,
  onChange,
  hint,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  return (
    <div className="group rounded-2xl border border-neutral-200/80 bg-white p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-rb-black">{label}</p>
          <p className="mt-1 text-sm text-neutral-500 leading-relaxed">{description}</p>
          <p className="mt-2 text-xs text-neutral-400">{hint}</p>
        </div>
        <div className="flex shrink-0 items-baseline gap-1 rounded-xl bg-rb-page px-3 py-2 ring-1 ring-neutral-100">
          <span className="text-2xl font-bold tabular-nums text-rb-yellow-dark">{value}</span>
          <span className="text-sm font-medium text-neutral-500">%</span>
        </div>
      </div>
      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-rb-yellow [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rb-yellow [&::-webkit-slider-thumb]:shadow-md"
        />
        <div className="mt-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-neutral-400">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const [blockThreshold, setBlockThreshold] = useState(70);
  const [verifyThreshold, setVerifyThreshold] = useState(40);
  const [newBeneficiaryVerify, setNewBeneficiaryVerify] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-rb-page to-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-rb-black sm:text-xl">Paramètres</h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              Politiques de décision et versions des modèles ML. Les changements s’appliquent aux nouvelles transactions.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rb-yellow px-4 py-2.5 text-sm font-semibold text-rb-black shadow-sm shadow-rb-yellow/30 transition hover:bg-rb-yellow-dark sm:mt-0 sm:w-auto"
          >
            {savedFlash ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Enregistré
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l3 3m0 0l3-3m-3 3V4" />
                </svg>
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-neutral-100 bg-rb-page/90 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rb-yellow-muted text-rb-yellow-dark">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-rb-black">Politiques de décision</h3>
              <p className="text-sm text-neutral-500">Seuils de score et règles métiers</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <PolicySlider
            label="Seuil de blocage automatique"
            description="Au-delà de ce score combiné, la transaction est refusée sans revue manuelle."
            hint="Recommandé : 65–80 % selon votre tolérance au risque."
            value={blockThreshold}
            onChange={setBlockThreshold}
          />
          <PolicySlider
            label="Seuil de vérification"
            description="Entre ce score et le seuil de blocage, une étape de vérification (OTP, agent) est exigée."
            hint="Doit rester inférieur au seuil de blocage."
            value={verifyThreshold}
            onChange={setVerifyThreshold}
          />

          <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-rb-black">Nouveaux bénéficiaires</p>
                  <p className="mt-1 text-sm text-neutral-500">Exiger une vérification renforcée pour le premier paiement vers un bénéficiaire inconnu.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={newBeneficiaryVerify}
                onClick={() => setNewBeneficiaryVerify(!newBeneficiaryVerify)}
                className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rb-yellow focus-visible:ring-offset-2 ${
                  newBeneficiaryVerify ? 'bg-rb-yellow' : 'bg-neutral-200'
                }`}
              >
                <span
                  className={`pointer-events-none absolute top-0.5 left-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
                    newBeneficiaryVerify ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-neutral-100 bg-rb-page/90 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-rb-black">Modèles ML</h3>
              <p className="text-sm text-neutral-500">Pipeline de scoring — production</p>
            </div>
          </div>
        </div>
        <ul className="divide-y divide-neutral-100">
          {models.map((m) => (
            <li key={m.id} className="group flex flex-col gap-4 p-4 transition-colors hover:bg-rb-yellow-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-5">
              <div className="flex min-w-0 flex-1 gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} text-sm font-bold ${m.id === 'm1' ? 'text-rb-black' : 'text-white'} shadow-md shadow-rb-black/10`}
                >
                  {m.code}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-rb-black">{m.name}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">{m.desc}</p>
                  <p className="mt-2 text-xs text-neutral-400">Dernière mise à jour · {m.updated}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 pl-16 sm:pl-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Actif {m.version}
                </span>
                <button
                  type="button"
                  className="rounded-lg p-2 text-neutral-400 transition hover:bg-white hover:text-rb-yellow-dark hover:shadow-sm"
                  aria-label={`Détails ${m.code}`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
