import type { ReactNode } from 'react';
import type { Transaction } from '../../types';
import type { AdminTransactionRow } from '../../api/adminApi';
import { getTransactionRiskPercent } from '../../utils/transactionRiskScore';

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '—';
  if (typeof v === 'string') return v.trim() === '' ? '—' : v;
  return JSON.stringify(v);
}

function formatUnknown(v: unknown): ReactNode {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object' && !Array.isArray(v)) {
    return (
      <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-100/95">
        {JSON.stringify(v, null, 2)}
      </pre>
    );
  }
  if (Array.isArray(v)) {
    return (
      <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-100/95">
        {JSON.stringify(v, null, 2)}
      </pre>
    );
  }
  return formatScalar(v);
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 py-2.5 last:border-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="min-w-0 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="flex items-start gap-2.5 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5 sm:px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-amber-300">
          {icon}
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-semibold tracking-tight text-slate-900 sm:text-sm">{title}</h4>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

function pickOne<T>(x: T | T[] | null | undefined): T | undefined {
  if (x == null) return undefined;
  return Array.isArray(x) ? x[0] : x;
}

/** Champs scalaires de la ligne transaction (hors jointures). */
function transactionPrimitiveEntries(row: AdminTransactionRow): [string, unknown][] {
  const skip = new Set([
    'clients',
    'beneficiaires',
    'sessions',
    'scores_evaluation',
  ]);
  return Object.entries(row as unknown as Record<string, unknown>).filter(
    ([k, v]) => !skip.has(k) && v !== null && typeof v !== 'object',
  );
}

function ObjectDetails({ data }: { data: Record<string, unknown> | null | undefined }) {
  if (!data || typeof data !== 'object') {
    return <p className="text-sm text-slate-500">—</p>;
  }
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return <p className="text-sm text-slate-500">—</p>;
  return (
    <dl>
      {entries.map(([k, v]) => (
        <DetailRow key={k} label={humanizeKey(k)} value={formatUnknown(v)} />
      ))}
    </dl>
  );
}

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  const event = transaction.transaction_event;
  const meta = event.metadata;
  const riskScore = getTransactionRiskPercent(transaction);
  const row = transaction._adminSource;

  const client = row ? pickOne(row.clients) : undefined;
  const benef = row ? pickOne(row.beneficiaires) : undefined;
  const session = row ? pickOne(row.sessions as Record<string, unknown> | Record<string, unknown>[] | null) : undefined;
  const scores = row ? pickOne(row.scores_evaluation) : undefined;

  const decision = transaction._api?.decision ?? null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-detail-title"
      onClick={onClose}
    >
      <div
        className="flex h-[min(92dvh,860px)] max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête compact — la zone blanche scrollable occupe le maximum */}
        <div className="shrink-0 border-b border-slate-800/20 bg-gradient-to-r from-slate-900 to-slate-800 px-3 py-2.5 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h2 id="tx-detail-title" className="truncate font-mono text-sm font-bold text-white sm:text-base">
                  {meta.numero_transaction}
                </h2>
                <span className="text-[11px] text-slate-400">
                  {new Date(meta.date_transaction).toLocaleString('fr-FR')}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                  Risque {riskScore}%
                </span>
                {decision && (
                  <span className="rounded-md bg-amber-500/25 px-2 py-0.5 text-[10px] font-medium text-amber-100">
                    {decision}
                  </span>
                )}
                {transaction.target_labels.cible_fraude && (
                  <span className="rounded-md bg-red-500/35 px-2 py-0.5 text-[10px] font-medium text-red-100">
                    Fraude
                  </span>
                )}
                <span className="text-[10px] text-slate-500">
                  Tx {transaction._api?.scoreTransaction ?? '—'} · S {transaction._api?.scoreSession ?? '—'} · C{' '}
                  {transaction._api?.scoreComportement ?? '—'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/15"
              aria-label="Fermer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 border-t border-white/10 pt-2">
            <div className="min-w-[7rem] flex-1 rounded-lg bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Montant</p>
              <p className="truncate text-sm font-semibold tabular-nums text-white">
                {meta.montant.toLocaleString('fr-FR')} {meta.devise}
              </p>
            </div>
            <div className="min-w-[5rem] flex-1 rounded-lg bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Type</p>
              <p className="truncate text-sm text-white">{meta.type_transaction}</p>
            </div>
            <div className="min-w-[5rem] flex-1 rounded-lg bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Canal</p>
              <p className="truncate text-sm text-white">{meta.canal}</p>
            </div>
          </div>
        </div>

        {/* Corps : fond blanc, scroll principal */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-3 py-3 sm:px-5 sm:py-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {!row && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Données détaillées limitées : cette ligne ne provient pas de l’API admin (pas de jointure client /
                bénéficiaire / session).
              </div>
            )}

            {row && (
              <>
                <SectionCard
                  title="Transaction (table)"
                  subtitle="Champs scalaires issus de la base"
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  }
                >
                  <dl>
                    {transactionPrimitiveEntries(row).map(([k, v]) => (
                      <DetailRow key={k} label={humanizeKey(k)} value={formatUnknown(v)} />
                    ))}
                  </dl>
                  {row.raw_payload && Object.keys(row.raw_payload).length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">raw_payload</p>
                      <pre className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-emerald-100/90">
                        {JSON.stringify(row.raw_payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Client"
                  subtitle="Jointure clients (+ comptes bancaires si présents)"
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                >
                  {client ? (
                    <>
                      <ObjectDetails
                        data={
                          {
                            reference_client: client.reference_client,
                            nom_complet: client.nom_complet,
                            email: client.email,
                            telephone: client.telephone,
                          } as Record<string, unknown>
                        }
                      />
                      {client.comptes_bancaires && (
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Comptes bancaires
                          </p>
                          {(Array.isArray(client.comptes_bancaires)
                            ? client.comptes_bancaires
                            : [client.comptes_bancaires]
                          ).map((cb, idx) => (
                            <div key={idx} className="mb-3 last:mb-0">
                              <ObjectDetails data={cb as Record<string, unknown>} />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">Aucune ligne client jointe.</p>
                  )}
                </SectionCard>

                <SectionCard
                  title="Bénéficiaire"
                  subtitle="Jointure beneficiaires"
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                >
                  {benef ? (
                    <ObjectDetails data={benef as Record<string, unknown>} />
                  ) : (
                    <p className="text-sm text-slate-500">Aucun bénéficiaire joint (vérifiez beneficiaire_id).</p>
                  )}
                </SectionCard>

                <SectionCard
                  title="Session"
                  subtitle="Jointure sessions"
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                >
                  {session && typeof session === 'object' ? (
                    <ObjectDetails data={session as Record<string, unknown>} />
                  ) : (
                    <p className="text-sm text-slate-500">
                      Aucune session jointe (colonne session_id ou FK à vérifier en base).
                    </p>
                  )}
                </SectionCard>

                <SectionCard
                  title="Évaluation & scores"
                  subtitle="scores_evaluation"
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                >
                  {scores && typeof scores === 'object' ? (
                    <ObjectDetails data={scores as Record<string, unknown>} />
                  ) : (
                    <p className="text-sm text-slate-500">Aucune ligne scores_evaluation jointe.</p>
                  )}
                </SectionCard>
              </>
            )}

            <SectionCard
              title="Signaux & features (modèle)"
              subtitle="Données enrichies pour scoring interne"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            >
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Réseau & anonymisation</p>
                  <ObjectDetails data={event.network_intelligence as unknown as Record<string, unknown>} />
                  <div className="mt-2">
                    <ObjectDetails data={event.anonymization_detection as unknown as Record<string, unknown>} />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Comportement (UEBA)</p>
                  <ObjectDetails data={event.behavioral_biometrics_ueba as unknown as Record<string, unknown>} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Features & graphe</p>
                  <ObjectDetails data={event.engineered_features_profiling as unknown as Record<string, unknown>} />
                  <div className="mt-2">
                    <ObjectDetails data={event.relational_graph_features as unknown as Record<string, unknown>} />
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-3 py-2 sm:px-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto sm:px-6"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
