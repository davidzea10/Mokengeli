import type { AdminAlertItem } from '../../api/adminApi';

const severityStyles = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
  },
  info: {
    bg: 'bg-rb-yellow-muted',
    border: 'border-rb-yellow/40',
    icon: 'text-rb-yellow-dark',
    badge: 'bg-rb-yellow/25 text-rb-black',
  },
} as const;

function normalizeSeverity(s: AdminAlertItem['severity']): keyof typeof severityStyles {
  if (s === 'critical' || s === 'warning' || s === 'info') return s;
  return 'info';
}

export interface AlertsPanelProps {
  alerts: AdminAlertItem[];
  total: number;
  loading?: boolean;
  error?: string | null;
}

export function AlertsPanel({ alerts, total, loading = false, error = null }: AlertsPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-neutral-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-rb-black">Alertes en temps réel</h2>
          <span className="px-2 py-1 text-xs font-medium text-white bg-neutral-600 rounded-full tabular-nums">
            {total}
          </span>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>
      )}

      {loading && alerts.length === 0 && !error && (
        <div className="px-4 py-10 text-center text-sm text-neutral-500">Chargement des alertes…</div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-neutral-500">
          Aucune alerte pour le moment. Les alertes seront alimentées lorsque le modèle et la table associée seront
          disponibles.
        </div>
      )}

      {alerts.length > 0 && (
      <div className="divide-y divide-neutral-200 max-h-96 overflow-y-auto">
        {alerts.map((alert) => {
          const sev = normalizeSeverity(alert.severity);
          const styles = severityStyles[sev];

          return (
            <div
              key={alert.id}
              className={`p-4 hover:bg-rb-yellow-muted/40 transition-colors cursor-pointer ${styles.bg}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${styles.bg}`}>
                  {sev === 'critical' && (
                    <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  )}
                  {sev === 'warning' && (
                    <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  {sev === 'info' && (
                    <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
                      {sev === 'critical' ? 'Critique' : sev === 'warning' ? 'Avertissement' : 'Info'}
                    </span>
                    {alert.time ? <span className="text-xs text-neutral-500">{alert.time}</span> : null}
                  </div>
                  <h3 className="text-sm font-semibold text-rb-black">{alert.title}</h3>
                  {alert.description ? (
                    <p className="text-sm text-neutral-600 mt-1">{alert.description}</p>
                  ) : null}
                  {alert.transactionId && (
                    <p className="text-xs text-rb-yellow-dark mt-2 font-medium">Ref: {alert.transactionId}</p>
                  )}
                </div>

                <span className="flex-shrink-0 p-2 text-neutral-400" aria-hidden>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
