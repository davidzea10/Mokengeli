import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sidebar } from '../components/dashboard/Sidebar';
import { Header } from '../components/dashboard/Header';
import { StatsCard } from '../components/dashboard/StatsCard';
import { TransactionTable } from '../components/dashboard/TransactionTable';
import { RiskChart } from '../components/dashboard/RiskChart';
import { AlertsPanel } from '../components/dashboard/AlertsPanel';
import { SettingsPanel } from '../components/dashboard/SettingsPanel';
import { TransactionMapPanel } from '../components/dashboard/TransactionMapPanel';
import { mockTransactions } from '../data/mockTransactions';

const chartData = [
  { date: 'Lun', value: 180, fraud: 5 },
  { date: 'Mar', value: 220, fraud: 8 },
  { date: 'Mer', value: 195, fraud: 4 },
  { date: 'Jeu', value: 240, fraud: 12 },
  { date: 'Ven', value: 210, fraud: 6 },
  { date: 'Sam', value: 120, fraud: 3 },
  { date: 'Dim', value: 82, fraud: 2 },
];

const VALID_TABS = new Set([
  'dashboard',
  'transactions',
  'alerts',
  'carte',
  'analytics',
  'settings',
]);

interface DashboardProps {
  activeTab?: string;
}

export function Dashboard({ activeTab: initialTab }: DashboardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const txFromUrl = searchParams.get('tx');

  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab) return initialTab;
    if (tabFromUrl && VALID_TABS.has(tabFromUrl)) return tabFromUrl;
    return 'dashboard';
  });

  useEffect(() => {
    if (tabFromUrl && VALID_TABS.has(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (tabFromUrl === 'clients') {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set('tab', 'dashboard');
          return n;
        },
        { replace: true }
      );
      setActiveTab('dashboard');
    }
  }, [tabFromUrl, setSearchParams]);

  const detailTxFromUrl = useMemo(() => {
    if (!txFromUrl) return null;
    return (
      mockTransactions.find((t) => t.transaction_event.metadata.numero_transaction === txFromUrl) ?? null
    );
  }, [txFromUrl]);

  const syncTabToUrl = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set('tab', id);
          if (id !== 'transactions') n.delete('tx');
          return n;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const clearTxFromUrl = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete('tx');
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);
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
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter transactions based on search and filters
  const filteredTransactions = mockTransactions.filter(tx => {
    const matchesSearch = searchQuery === '' || 
      tx.transaction_event.metadata.numero_transaction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.transaction_event.metadata.id_client.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || 
      tx.transaction_event.metadata.type_transaction === typeFilter;
    
    // For demo, randomly assign status based on some logic
    const status = tx.transaction_event.metadata.montant > 5000 ? 'blocked' : 'authorized';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    totalTransactions: 12547,
    fraudDetected: 342,
    riskScore: 72,
    recentAlerts: 18
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Tableau de bord';
      case 'transactions': return 'Transactions';
      case 'alerts': return 'Alertes';
      case 'carte': return 'Carte des flux';
      case 'analytics': return 'Analytique';
      case 'settings': return 'Paramètres';
      default: return 'Tableau de bord';
    }
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Aperçu en temps réel de l\'activité anti-fraude';
      case 'transactions': return 'Historique de toutes les transactions analysées';
      case 'alerts': return 'Alertes de fraude en attente d\'analyse';
      case 'carte':
        return 'Localisation des flux entre émetteurs et bénéficiaires';
      case 'analytics': return 'Statistiques et métriques';
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
          syncTabToUrl(id);
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
        />

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Total Transactions"
                  value={stats.totalTransactions.toLocaleString('fr-FR')}
                  change={12.5}
                  changeLabel="vs hier"
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
                  change={-8.2}
                  changeLabel="vs semaine dernière"
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
                  change={3.1}
                  changeLabel="vs hier"
                  trend="up"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Alertes Récentes"
                  value={stats.recentAlerts}
                  change={5.0}
                  changeLabel="nouvelles aujourd'hui"
                  trend="up"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  }
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <TransactionTable transactions={mockTransactions} />
                </div>
                <div className="space-y-6">
                  <RiskChart data={chartData} />
                  <AlertsPanel />
                </div>
              </div>
            </>
          )}

          {activeTab === 'transactions' && (
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-start lg:justify-between">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 shrink-0">Historique des Transactions</h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch w-full lg:w-auto lg:max-w-none">
                  <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-w-0 flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rb-yellow/50 text-sm"
                  />
                  <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rb-yellow/50 text-sm min-w-0 sm:min-w-[11rem]"
                  >
                    <option value="all">Tous les types</option>
                    <option value="Virement">Virement</option>
                    <option value="Paiement">Paiement</option>
                    <option value="Retrait">Retrait</option>
                  </select>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rb-yellow/50 text-sm min-w-0 sm:min-w-[11rem]"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="authorized">Autorisé</option>
                    <option value="blocked">Bloqué</option>
                    <option value="pending">En attente</option>
                  </select>
                </div>
              </div>
              
              {/* Filter results info */}
              {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all') && (
                <div className="mb-4 p-3 bg-rb-yellow-muted rounded-lg flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-rb-black">
                    Filtres actifs: {filteredTransactions.length} résultat(s) trouvé(s)
                  </span>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                      setStatusFilter('all');
                    }}
                    className="text-sm text-rb-yellow-dark hover:text-rb-black"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}
              
              <TransactionTable
                transactions={filteredTransactions}
                openTransactionNumero={txFromUrl}
                detailTransactionOverride={detailTxFromUrl}
                onCloseDetailFromUrl={clearTxFromUrl}
              />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard
                  title="Alertes en attente"
                  value="24"
                  change={-15}
                  changeLabel="vs hier"
                  trend="down"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Fraudes confirmées"
                  value="8"
                  change={2}
                  changeLabel="aujourd'hui"
                  trend="up"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Faux positifs"
                  value="12"
                  change={-5}
                  changeLabel="vs semaine dernière"
                  trend="down"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  }
                />
              </div>
              <AlertsPanel />
            </div>
          )}

          {activeTab === 'carte' && (
            <div className="space-y-4">
              <TransactionMapPanel
                transactions={mockTransactions}
                onNavigateToTransaction={(numero) => {
                  setActiveTab('transactions');
                  setSearchParams(
                    (prev) => {
                      const n = new URLSearchParams(prev);
                      n.set('tab', 'transactions');
                      n.set('tx', numero);
                      return n;
                    },
                    { replace: false }
                  );
                }}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Taux de détection"
                  value="97.2%"
                  change={0.8}
                  changeLabel="ce mois"
                  trend="up"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Faux positifs"
                  value="2.8%"
                  change={-0.5}
                  changeLabel="vs mois dernier"
                  trend="down"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Latence moyenne"
                  value="45ms"
                  change={-10}
                  changeLabel="vs semaine dernière"
                  trend="down"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Transactions/Jour"
                  value="12.5K"
                  change={5}
                  changeLabel="vs hier"
                  trend="up"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RiskChart data={chartData} />
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Répartition par canal</h3>
                  <div className="space-y-4">
                    {[
                      { canal: 'Application Mobile', percentage: 45, color: 'bg-rb-yellow' },
                      { canal: 'Web Banking', percentage: 30, color: 'bg-green-500' },
                      { canal: 'USSD', percentage: 15, color: 'bg-yellow-500' },
                      { canal: 'Agence', percentage: 10, color: 'bg-purple-500' },
                    ].map((item) => (
                      <div key={item.canal}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{item.canal}</span>
                          <span className="font-medium text-gray-800">{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </main>
    </div>
  );
}
