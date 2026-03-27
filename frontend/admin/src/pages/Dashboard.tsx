import { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from '../components/dashboard/Sidebar';
import { Header } from '../components/dashboard/Header';
import { StatsCard } from '../components/dashboard/StatsCard';
import { TransactionTable } from '../components/dashboard/TransactionTable';
import { RiskChart } from '../components/dashboard/RiskChart';
import { AlertsPanel } from '../components/dashboard/AlertsPanel';
import { ModelScoreStrip } from '../components/dashboard/ModelScoreStrip';
import { SettingsPanel } from '../components/dashboard/SettingsPanel';
import type { Transaction } from '../types';
import type { AdminAlertItem } from '../api/adminApi';
import { isApiConfigured } from '../api/config';
import { fetchAdminTransactions, fetchAdminAlerts } from '../api/adminApi';
import { mapAdminRowToTransaction } from '../utils/mapAdminTransaction';
import { buildLast7DaysChart } from '../utils/buildDashboardChart';
import { getTransactionRiskPercent } from '../utils/transactionRiskScore';

/** Intervalle de rafraîchissement automatique sur le tableau de bord (ms). */
const DASHBOARD_POLL_MS = 12_000;

/** Lignes par page sur l’onglet Transactions (liste paginée). */
const TRANSACTIONS_PAGE_SIZE = 10;

/** Liste clients : à brancher sur une API dédiée ; pas de mockClients / MOCK_STATS. */
type ClientRow = { id: string; name: string; segment: string; score: number; status: string };
const emptyClients: ClientRow[] = [];

interface DashboardProps {
  activeTab?: string;
}

export function Dashboard({ activeTab: initialTab }: DashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);
  
  // Transaction filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [transactionsListPage, setTransactionsListPage] = useState(1);
  const [transactionsListRows, setTransactionsListRows] = useState<Transaction[]>([]);
  const [transactionsListTotal, setTransactionsListTotal] = useState(0);
  const [transactionsListTotalPages, setTransactionsListTotalPages] = useState(1);
  const [transactionsListLoading, setTransactionsListLoading] = useState(false);
  const [transactionsListError, setTransactionsListError] = useState<string | null>(null);

  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const [remoteTransactions, setRemoteTransactions] = useState<Transaction[]>([]);
  const [apiTotal, setApiTotal] = useState<number | null>(null);
  const [apiLoadState, setApiLoadState] = useState<
    'idle' | 'loading' | 'ok' | 'error' | 'skipped'
  >(() => (isApiConfigured() ? 'loading' : 'skipped'));
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [alertsItems, setAlertsItems] = useState<AdminAlertItem[]>([]);
  const [alertsStats, setAlertsStats] = useState({
    pending: 0,
    confirmedFraud: 0,
    falsePositives: 0,
  });
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const refreshAlerts = useCallback(async () => {
    if (!isApiConfigured()) return;
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const res = await fetchAdminAlerts();
      if (!res.ok) {
        setAlertsError(res.message);
        setAlertsItems([]);
        setAlertsTotal(0);
        setAlertsStats({ pending: 0, confirmedFraud: 0, falsePositives: 0 });
        return;
      }
      setAlertsItems(res.data.items);
      setAlertsTotal(res.data.total);
      setAlertsStats(res.data.stats);
    } catch (e) {
      setAlertsError(e instanceof Error ? e.message : 'Erreur réseau');
      setAlertsItems([]);
      setAlertsTotal(0);
      setAlertsStats({ pending: 0, confirmedFraud: 0, falsePositives: 0 });
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isApiConfigured()) return;
    void refreshAlerts();
    const id = window.setInterval(() => void refreshAlerts(), DASHBOARD_POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshAlerts]);

  const refreshTransactions = useCallback(async (silent: boolean) => {
    if (!isApiConfigured()) return;
    const res = await fetchAdminTransactions({ page: 1, limit: 100 });
    if (!res.ok) {
      if (!silent) {
        setApiErrorMessage(res.message);
        setApiLoadState('error');
      }
      return;
    }
    setRemoteTransactions(res.data.items.map(mapAdminRowToTransaction));
    setApiTotal(typeof res.data.total === 'number' ? res.data.total : res.data.items.length);
    setApiLoadState('ok');
    setLastSyncedAt(new Date());
  }, []);

  /** Chargement initial */
  useEffect(() => {
    if (!isApiConfigured()) return;
    void refreshTransactions(false);
  }, [refreshTransactions]);

  /** Rafraîchissement automatique sur l’onglet Tableau de bord (sans recharger la page). */
  useEffect(() => {
    if (!isApiConfigured()) return;
    if (activeTab !== 'dashboard') return;
    const id = window.setInterval(() => {
      void refreshTransactions(true);
    }, DASHBOARD_POLL_MS);
    return () => window.clearInterval(id);
  }, [activeTab, refreshTransactions]);

  /** Synchro au retour sur l’onglet navigateur */
  useEffect(() => {
    if (!isApiConfigured()) return;
    const onVis = () => {
      if (document.visibilityState === 'visible' && activeTab === 'dashboard') {
        void refreshTransactions(true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [activeTab, refreshTransactions]);

  /** Données issues uniquement de l’API (aucune donnée fictive). */
  const allTransactions: Transaction[] = useMemo(() => {
    if (apiLoadState === 'ok') return remoteTransactions;
    return [];
  }, [apiLoadState, remoteTransactions]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setTransactionsListPage(1);
  }, [debouncedSearch, typeFilter, statusFilter]);

  const loadTransactionsListPage = useCallback(
    async (signal?: AbortSignal) => {
      if (!isApiConfigured()) return;
      setTransactionsListLoading(true);
      setTransactionsListError(null);
      try {
        const res = await fetchAdminTransactions({
          page: transactionsListPage,
          limit: TRANSACTIONS_PAGE_SIZE,
          q: debouncedSearch || undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          signal,
        });
        if (signal?.aborted) return;
        if (!res.ok) {
          setTransactionsListError(res.message);
          setTransactionsListRows([]);
          return;
        }
        setTransactionsListRows(res.data.items.map(mapAdminRowToTransaction));
        setTransactionsListTotal(res.data.total);
        setTransactionsListTotalPages(res.data.totalPages);
        setTransactionsListPage((p) => Math.min(p, Math.max(1, res.data.totalPages)));
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setTransactionsListError(e instanceof Error ? e.message : 'Erreur réseau');
        setTransactionsListRows([]);
      } finally {
        setTransactionsListLoading(false);
      }
    },
    [transactionsListPage, debouncedSearch, typeFilter, statusFilter],
  );

  useEffect(() => {
    if (!isApiConfigured()) return;
    if (activeTab !== 'transactions') return;
    const ac = new AbortController();
    void loadTransactionsListPage(ac.signal);
    const id = window.setInterval(() => {
      void loadTransactionsListPage();
    }, DASHBOARD_POLL_MS);
    return () => {
      ac.abort();
      window.clearInterval(id);
    };
  }, [activeTab, loadTransactionsListPage]);

  const safeTransactionsPage = Math.min(transactionsListPage, transactionsListTotalPages);

  const qClients = clientSearchQuery.trim().toLowerCase();
  const filteredClients = emptyClients.filter((client) => {
    if (!qClients) return true;
    return (
      client.id.toLowerCase().includes(qClients) ||
      client.name.toLowerCase().includes(qClients) ||
      client.segment.toLowerCase().includes(qClients) ||
      client.status.toLowerCase().includes(qClients) ||
      String(client.score).includes(qClients)
    );
  });

  const stats = useMemo(() => {
    if (apiLoadState !== 'ok') {
      return {
        totalTransactions: 0,
        fraudDetected: 0,
        riskScore: 0,
      };
    }
    const txs = remoteTransactions;
    const n = txs.length;
    const totalInDb = apiTotal ?? n;
    if (n === 0) {
      return {
        totalTransactions: totalInDb,
        fraudDetected: 0,
        riskScore: 0,
      };
    }
    const fraudCount = txs.filter((t) => t.target_labels.cible_fraude).length;
    const risks = txs.map(getTransactionRiskPercent);
    const avgRisk = Math.round(risks.reduce((a, b) => a + b, 0) / n);
    return {
      totalTransactions: totalInDb,
      fraudDetected: fraudCount,
      riskScore: avgRisk,
    };
  }, [apiLoadState, remoteTransactions, apiTotal]);

  const dashboardChartData = useMemo(() => {
    if (apiLoadState === 'ok') return buildLast7DaysChart(remoteTransactions);
    return buildLast7DaysChart([]);
  }, [apiLoadState, remoteTransactions]);

  const riskChartSummary = useMemo(() => {
    if (apiLoadState !== 'ok') return null;
    const txs = remoteTransactions;
    const n = txs.length;
    if (n === 0) {
      return {
        total: apiTotal ?? 0,
        validatedPct: 0,
        suspectPct: 0,
        fraudPct: 0,
      };
    }
    const fraud = txs.filter((t) => t.target_labels.cible_fraude).length;
    const suspect = txs.filter((t) => {
      const r = getTransactionRiskPercent(t);
      return !t.target_labels.cible_fraude && r >= 40 && r < 75;
    }).length;
    const validated = n - fraud - suspect;
    return {
      total: apiTotal ?? n,
      validatedPct: (validated / n) * 100,
      suspectPct: (suspect / n) * 100,
      fraudPct: (fraud / n) * 100,
    };
  }, [apiLoadState, remoteTransactions, apiTotal]);

  const analyticsTx = useMemo(() => {
    const n = remoteTransactions.length;
    const fraud = remoteTransactions.filter((t) => t.target_labels.cible_fraude).length;
    return {
      n,
      fraud,
      detectionPct: n > 0 ? Math.round((fraud / n) * 100) : null,
    };
  }, [remoteTransactions]);

  const canalDistribution = useMemo(() => {
    if (apiLoadState !== 'ok' || remoteTransactions.length === 0) return [];
    const buckets = new Map<string, number>();
    remoteTransactions.forEach((tx) => {
      const c = tx.transaction_event.metadata.canal?.trim() || '—';
      buckets.set(c, (buckets.get(c) ?? 0) + 1);
    });
    const n = remoteTransactions.length;
    return [...buckets.entries()].map(([canal, count]) => ({
      canal,
      percentage: Math.round((count / n) * 100),
    }));
  }, [apiLoadState, remoteTransactions]);

  const modelScoreAverages = useMemo(() => {
    if (apiLoadState !== 'ok') {
      return { scoreTransaction: null, scoreSession: null, scoreComportement: null };
    }
    if (remoteTransactions.length === 0) {
      return { scoreTransaction: null, scoreSession: null, scoreComportement: null };
    }
    const txs = remoteTransactions;
    const avg = (sel: (t: Transaction) => number | null | undefined) => {
      const vals = txs.map(sel).filter((v): v is number => v != null && Number.isFinite(v));
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    return {
      scoreTransaction: avg((t) => t._api?.scoreTransaction ?? null),
      scoreSession: avg((t) => t._api?.scoreSession ?? null),
      scoreComportement: avg((t) => t._api?.scoreComportement ?? null),
    };
  }, [apiLoadState, remoteTransactions]);

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Tableau de bord';
      case 'transactions': return 'Transactions';
      case 'alerts': return 'Alertes';
      case 'analytics': return 'Analytique';
      case 'clients': return 'Clients';
      case 'settings': return 'Paramètres';
      default: return 'Tableau de bord';
    }
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Aperçu en temps réel de l\'activité anti-fraude';
      case 'transactions': return 'Historique de toutes les transactions analysées';
      case 'alerts': return 'Alertes de fraude en attente d\'analyse';
      case 'analytics': return 'Statistiques et métriques';
      case 'clients': return 'Gestion des clients';
      case 'settings': return 'Configuration du système';
      default: return '';
    }
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-rb-page">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-rb-black/50 backdrop-blur-[2px] lg:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(id) => {
          setActiveTab(id);
          setMobileNavOpen(false);
        }}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <main
        className={`flex-1 min-w-0 transition-[margin] duration-300 ease-out ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <Header
          title={getTitle()}
          subtitle={getSubtitle()}
          onMenuClick={() => setMobileNavOpen(true)}
          onNotificationsClick={() => {
            setActiveTab('alerts');
            setMobileNavOpen(false);
          }}
          notificationCount={alertsStats.pending}
        />

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {!isApiConfigured() && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Définissez <code className="rounded bg-white px-1">VITE_API_BASE_URL</code> dans{' '}
              <code className="rounded bg-white px-1">frontend/admin/.env</code> pour charger les données depuis la base.
            </div>
          )}
          {isApiConfigured() && apiLoadState === 'loading' && (
            <div className="rounded-lg border border-rb-yellow/40 bg-rb-yellow-muted px-4 py-3 text-sm text-rb-black">
              Chargement des transactions depuis l’API…
            </div>
          )}
          {isApiConfigured() && apiLoadState === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Impossible de charger l’API ({apiErrorMessage}). Vérifiez le backend et la base de données.
            </div>
          )}
          {isApiConfigured() && apiLoadState === 'ok' && remoteTransactions.length === 0 && (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
              Aucune transaction en base pour l’instant.
            </div>
          )}

          {activeTab === 'dashboard' && (
            <>
              {isApiConfigured() && apiLoadState === 'ok' && lastSyncedAt && (
                <p className="text-xs text-neutral-500 text-right -mt-1 mb-0" title="Mise à jour automatique toutes les 12 s sur cet onglet">
                  Dernière synchro :{' '}
                  {lastSyncedAt.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Total Transactions"
                  value={stats.totalTransactions.toLocaleString('fr-FR')}
                  trend="up"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Fraudes Détectées"
                  value={stats.fraudDetected}
                  trend="down"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Score de Risque Moyen"
                  value={`${stats.riskScore}%`}
                  trend="up"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Alertes récentes"
                  value={alertsStats.pending}
                  trend="neutral"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  }
                />
              </div>

              <ModelScoreStrip
                scoreTransaction={modelScoreAverages.scoreTransaction}
                scoreSession={modelScoreAverages.scoreSession}
                scoreComportement={modelScoreAverages.scoreComportement}
              />

              <TransactionTable
                transactions={allTransactions}
                maxRows={5}
                title="5 dernières transactions"
              />

              <div className="space-y-6">
                <RiskChart data={dashboardChartData} summary={riskChartSummary} />
                <AlertsPanel
                  alerts={alertsItems}
                  total={alertsTotal}
                  loading={alertsLoading}
                  error={alertsError}
                />
              </div>
            </>
          )}

          {activeTab === 'transactions' && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                    Historique des transactions
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {transactionsListTotal.toLocaleString('fr-FR')} transaction(s) au total
                    {transactionsListTotal > 0
                      ? ` · ${TRANSACTIONS_PAGE_SIZE} par page (pagination serveur)`
                      : ''}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch lg:w-auto lg:max-w-none">
                  <input 
                    type="text" 
                    placeholder="Rechercher (n°, réf. bénéficiaire)…" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-rb-yellow/60 focus:bg-white focus:ring-2 focus:ring-rb-yellow/30"
                  />
                  <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm shadow-sm focus:border-rb-yellow/60 focus:bg-white focus:ring-2 focus:ring-rb-yellow/30 sm:min-w-[11rem]"
                  >
                    <option value="all">Tous les types</option>
                    <option value="Virement">Virement</option>
                    <option value="Paiement">Paiement</option>
                    <option value="Retrait">Retrait</option>
                  </select>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm shadow-sm focus:border-rb-yellow/60 focus:bg-white focus:ring-2 focus:ring-rb-yellow/30 sm:min-w-[11rem]"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="authorized">Autorisé</option>
                    <option value="blocked">Bloqué</option>
                    <option value="pending">En attente</option>
                  </select>
                </div>
              </div>
              
              {transactionsListError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {transactionsListError}
                </div>
              )}

              {(debouncedSearch || typeFilter !== 'all' || statusFilter !== 'all') && (
                <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-slate-800">
                    Filtres actifs — {transactionsListTotal.toLocaleString('fr-FR')} résultat(s) correspondant(s)
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                      setStatusFilter('all');
                    }}
                    className="text-sm font-medium text-amber-900/90 underline-offset-2 hover:underline"
                  >
                    Réinitialiser
                  </button>
                </div>
              )}
              
              <TransactionTable
                transactions={transactionsListRows}
                title="Liste des transactions"
                hideToolbar
                isLoading={transactionsListLoading}
                pagination={{
                  page: safeTransactionsPage,
                  pageCount: transactionsListTotalPages,
                  pageSize: TRANSACTIONS_PAGE_SIZE,
                  totalItems: transactionsListTotal,
                  onPageChange: setTransactionsListPage,
                }}
              />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard
                  title="Alertes en attente"
                  value={alertsStats.pending}
                  trend="neutral"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Fraudes confirmées"
                  value={alertsStats.confirmedFraud}
                  trend="neutral"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Faux positifs"
                  value={alertsStats.falsePositives}
                  trend="neutral"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  }
                />
              </div>
              <AlertsPanel
                alerts={alertsItems}
                total={alertsTotal}
                loading={alertsLoading}
                error={alertsError}
              />
            </div>
          )}


          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Taux de détection (échantillon chargé)"
                  value={
                    apiLoadState === 'ok' && analyticsTx.detectionPct != null
                      ? `${analyticsTx.detectionPct}%`
                      : '—'
                  }
                  trend="up"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Faux positifs (alertes)"
                  value={alertsStats.falsePositives}
                  trend="neutral"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Latence moyenne"
                  value="—"
                  trend="down"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Volume (total en base)"
                  value={
                    apiLoadState === 'ok' && stats.totalTransactions != null
                      ? stats.totalTransactions.toLocaleString('fr-FR')
                      : '—'
                  }
                  trend="up"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RiskChart data={dashboardChartData} summary={riskChartSummary} />
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Répartition par canal (échantillon)</h3>
                  <div className="space-y-4">
                    {canalDistribution.length === 0 ? (
                      <p className="text-sm text-neutral-500">Aucune donnée — chargez l’API avec des transactions.</p>
                    ) : (
                      canalDistribution.map((item, i) => {
                        const colors = ['bg-rb-yellow', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-blue-500'];
                        return (
                          <div key={item.canal}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">{item.canal}</span>
                              <span className="font-medium text-gray-800">{item.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`${colors[i % colors.length]} h-2 rounded-full`}
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="bg-white rounded-xl border border-neutral-200/80 shadow-sm p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-rb-black">Gestion des Clients</h2>
                <button type="button" className="w-full sm:w-auto px-4 py-2.5 bg-rb-yellow text-rb-black rounded-lg hover:bg-rb-yellow-dark text-sm font-medium shrink-0 shadow-sm shadow-rb-yellow/25">
                  Ajouter un client
                </button>
              </div>

              <div className="relative mb-4">
                <label htmlFor="client-search" className="sr-only">
                  Rechercher un client
                </label>
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="client-search"
                  type="search"
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  placeholder="Rechercher par ID, nom, segment, statut ou score…"
                  autoComplete="off"
                  className="w-full rounded-xl border border-neutral-200 bg-rb-page/90 py-2.5 pl-10 pr-10 text-sm text-rb-black placeholder:text-neutral-400 outline-none transition focus:border-rb-yellow focus:bg-white focus:ring-2 focus:ring-rb-yellow/25"
                />
                {clientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setClientSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-neutral-400 hover:bg-rb-yellow-muted hover:text-neutral-700"
                    aria-label="Effacer la recherche"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {qClients && (
                <p className="mb-3 text-sm text-neutral-500">
                  {filteredClients.length} résultat{filteredClients.length !== 1 ? 's' : ''}
                  {filteredClients.length === 0 && ' — essayez un autre terme'}
                </p>
              )}

              <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-rb-page/90">
                      <th className="text-left py-3 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wide text-neutral-600 whitespace-nowrap">ID Client</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-600">Nom</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-600">Segment</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-600">Score Moyen</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-600">Statut</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-neutral-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-neutral-500">
                          Aucun client ne correspond à votre recherche.
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => (
                        <tr key={client.id} className="border-b border-neutral-100 hover:bg-rb-yellow-muted/40">
                          <td className="py-3 px-4 text-sm font-medium text-rb-black">{client.id}</td>
                          <td className="py-3 px-4 text-sm text-neutral-800">{client.name}</td>
                          <td className="py-3 px-4 text-sm text-neutral-600">{client.segment}</td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              client.score < 30 ? 'bg-green-100 text-green-800' :
                              client.score < 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {client.score}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              client.status === 'Actif' ? 'bg-green-100 text-green-800' :
                              client.status === 'Surveillance' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {client.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button type="button" className="text-rb-yellow-dark hover:text-rb-black text-sm font-medium">
                              Voir
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </main>
    </div>
  );
}
