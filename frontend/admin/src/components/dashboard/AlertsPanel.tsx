interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  time: string;
  transactionId?: string;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    severity: 'critical',
    title: 'Fraude détectée',
    description: 'Transaction suspecte de 15,000€ identifiée - IPTOR détectée',
    time: 'Il y a 5 min',
    transactionId: 'TXN-2024-000002'
  },
  {
    id: '2',
    severity: 'warning',
    title: 'Comportement atypique',
    description: 'Multiple tentatives de connexion échouées',
    time: 'Il y a 12 min',
    transactionId: 'TXN-2024-000031'
  },
  {
    id: '3',
    severity: 'info',
    title: 'Changement d\'appareil',
    description: 'Nouveau dispositif détecté pour le client CLT-10045',
    time: 'Il y a 25 min'
  },
  {
    id: '4',
    severity: 'warning',
    title: 'Vitesse élevée',
    description: 'Volume de transactions inhabituel: 5000€ en 24h',
    time: 'Il y a 1h'
  },
  {
    id: '5',
    severity: 'info',
    title: 'Bénéficiaire nouveau',
    description: 'Premier virement vers un nouveau bénéficiaire',
    time: 'Il y a 2h'
  }
];

export function AlertsPanel() {
  const severityStyles = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-700'
    },
    warning: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      badge: 'bg-orange-100 text-orange-700'
    },
    info: {
      bg: 'bg-rb-yellow-muted',
      border: 'border-rb-yellow/40',
      icon: 'text-rb-yellow-dark',
      badge: 'bg-rb-yellow/25 text-rb-black'
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-neutral-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-rb-black">Alertes en temps réel</h2>
          <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full">5</span>
        </div>
        <button type="button" className="text-sm text-rb-yellow-dark hover:text-rb-black font-medium self-start sm:self-auto shrink-0">
          Voir tout
        </button>
      </div>

      <div className="divide-y divide-neutral-200 max-h-96 overflow-y-auto">
        {mockAlerts.map((alert) => {
          const styles = severityStyles[alert.severity];
          
          return (
            <div 
              key={alert.id} 
              className={`p-4 hover:bg-rb-yellow-muted/40 transition-colors cursor-pointer ${styles.bg}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${styles.bg}`}>
                  {alert.severity === 'critical' && (
                    <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  {alert.severity === 'warning' && (
                    <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {alert.severity === 'info' && (
                    <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
                      {alert.severity === 'critical' ? 'Critique' : alert.severity === 'warning' ? 'Avertissement' : 'Info'}
                    </span>
                    <span className="text-xs text-neutral-500">{alert.time}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-rb-black">{alert.title}</h3>
                  <p className="text-sm text-neutral-600 mt-1">{alert.description}</p>
                  {alert.transactionId && (
                    <p className="text-xs text-rb-yellow-dark mt-2 font-medium">Ref: {alert.transactionId}</p>
                  )}
                </div>
                
                <button className="flex-shrink-0 p-2 hover:bg-white/50 rounded-lg transition-colors">
                  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
