import { useState, useEffect } from 'react';
import { Sidebar } from '../components/dashboard/Sidebar';
import { Header } from '../components/dashboard/Header';
import { StatsCard } from '../components/dashboard/StatsCard';
import { TransactionTable } from '../components/dashboard/TransactionTable';
import { RiskChart } from '../components/dashboard/RiskChart';
import { AlertsPanel } from '../components/dashboard/AlertsPanel';
import { SettingsPanel } from '../components/dashboard/SettingsPanel';
import type { Transaction } from '../types';

const mockTransactions: Transaction[] = [
  {
    transaction_event: {
      metadata: {
        date_transaction: '2024-03-24T10:30:00Z',
        numero_transaction: 'TXN-2024-001247',
        id_client: 'CLT-89234',
        montant: 2500.00,
        devise: 'EUR',
        heure: 10,
        jour_semaine: 1,
        type_transaction: 'Virement',
        canal: 'Mobile'
      },
      network_intelligence: {
        score_reputation_ip: 0.85,
        ip_datacenter: false,
        ip_pays_inhabituel: false,
        ip_sur_liste_noire: false
      },
      anonymization_detection: {
        tor_detecte: false,
        vpn_detecte: false,
        proxy_detecte: false
      },
      behavioral_biometrics_ueba: {
        duree_session_min: 15.5,
        nb_ecrans_session: 4,
        delai_otp_s: 30,
        nb_echecs_login_24h: 0,
        vitesse_frappe: 45,
        entropie_souris: 0.75,
        nombre_requetes_par_minute: 3
      },
      engineered_features_profiling: {
        vitesse_24h: 500,
        ratio_montant_median_30j: 1.2,
        beneficiaire_nouveau: false,
        distance_km_habitude: 5,
        changement_appareil: false
      },
      relational_graph_features: {
        degre_client: 3,
        nb_voisins_frauduleux: 0,
        score_reseau: 0.9
      },
      security_integrity: {
        signature_transaction_valide: true,
        certificat_valide: true,
        score_confiance_client_api: 0.95
      }
    },
    target_labels: {
      cible_fraude: false,
      cible_session_anormale: false,
      cible_comportement_atypique: false
    }
  },
  {
    transaction_event: {
      metadata: {
        date_transaction: '2024-03-24T11:45:00Z',
        numero_transaction: 'TXN-2024-001248',
        id_client: 'CLT-12456',
        montant: 15000.00,
        devise: 'EUR',
        heure: 11,
        jour_semaine: 1,
        type_transaction: 'Paiement',
        canal: 'Web'
      },
      network_intelligence: {
        score_reputation_ip: 0.15,
        ip_datacenter: true,
        ip_pays_inhabituel: true,
        ip_sur_liste_noire: true
      },
      anonymization_detection: {
        tor_detecte: true,
        vpn_detecte: true,
        proxy_detecte: false
      },
      behavioral_biometrics_ueba: {
        duree_session_min: 2.5,
        nb_ecrans_session: 1,
        delai_otp_s: 180,
        nb_echecs_login_24h: 5,
        vitesse_frappe: 120,
        entropie_souris: 0.1,
        nombre_requetes_par_minute: 15
      },
      engineered_features_profiling: {
        vitesse_24h: 5000,
        ratio_montant_median_30j: 5.0,
        beneficiaire_nouveau: true,
        distance_km_habitude: 500,
        changement_appareil: true
      },
      relational_graph_features: {
        degre_client: 8,
        nb_voisins_frauduleux: 3,
        score_reseau: 0.2
      },
      security_integrity: {
        signature_transaction_valide: false,
        certificat_valide: false,
        score_confiance_client_api: 0.1
      }
    },
    target_labels: {
      cible_fraude: true,
      cible_session_anormale: true,
      cible_comportement_atypique: true
    }
  },
  {
    transaction_event: {
      metadata: {
        date_transaction: '2024-03-24T12:15:00Z',
        numero_transaction: 'TXN-2024-001249',
        id_client: 'CLT-45678',
        montant: 750.00,
        devise: 'EUR',
        heure: 12,
        jour_semaine: 1,
        type_transaction: 'Achat',
        canal: 'Mobile'
      },
      network_intelligence: {
        score_reputation_ip: 0.7,
        ip_datacenter: false,
        ip_pays_inhabituel: false,
        ip_sur_liste_noire: false
      },
      anonymization_detection: {
        tor_detecte: false,
        vpn_detecte: true,
        proxy_detecte: false
      },
      behavioral_biometrics_ueba: {
        duree_session_min: 8.0,
        nb_ecrans_session: 3,
        delai_otp_s: 45,
        nb_echecs_login_24h: 1,
        vitesse_frappe: 55,
        entropie_souris: 0.6,
        nombre_requetes_par_minute: 5
      },
      engineered_features_profiling: {
        vitesse_24h: 800,
        ratio_montant_median_30j: 0.8,
        beneficiaire_nouveau: false,
        distance_km_habitude: 10,
        changement_appareil: false
      },
      relational_graph_features: {
        degre_client: 2,
        nb_voisins_frauduleux: 0,
        score_reseau: 0.85
      },
      security_integrity: {
        signature_transaction_valide: true,
        certificat_valide: true,
        score_confiance_client_api: 0.8
      }
    },
    target_labels: {
      cible_fraude: false,
      cible_session_anormale: false,
      cible_comportement_atypique: false
    }
  },
  {
    transaction_event: {
      metadata: {
        date_transaction: '2024-03-24T13:00:00Z',
        numero_transaction: 'TXN-2024-001250',
        id_client: 'CLT-78901',
        montant: 3200.00,
        devise: 'EUR',
        heure: 13,
        jour_semaine: 1,
        type_transaction: 'Virement',
        canal: 'Guichet'
      },
      network_intelligence: {
        score_reputation_ip: 0.9,
        ip_datacenter: false,
        ip_pays_inhabituel: false,
        ip_sur_liste_noire: false
      },
      anonymization_detection: {
        tor_detecte: false,
        vpn_detecte: false,
        proxy_detecte: false
      },
      behavioral_biometrics_ueba: {
        duree_session_min: 20.0,
        nb_ecrans_session: 6,
        delai_otp_s: 25,
        nb_echecs_login_24h: 0,
        vitesse_frappe: 40,
        entropie_souris: 0.8,
        nombre_requetes_par_minute: 2
      },
      engineered_features_profiling: {
        vitesse_24h: 300,
        ratio_montant_median_30j: 1.1,
        beneficiaire_nouveau: false,
        distance_km_habitude: 2,
        changement_appareil: false
      },
      relational_graph_features: {
        degre_client: 5,
        nb_voisins_frauduleux: 1,
        score_reseau: 0.7
      },
      security_integrity: {
        signature_transaction_valide: true,
        certificat_valide: true,
        score_confiance_client_api: 0.92
      }
    },
    target_labels: {
      cible_fraude: false,
      cible_session_anormale: false,
      cible_comportement_atypique: false
    }
  },
  {
    transaction_event: {
      metadata: {
        date_transaction: '2024-03-24T14:30:00Z',
        numero_transaction: 'TXN-2024-001251',
        id_client: 'CLT-34567',
        montant: 8500.00,
        devise: 'EUR',
        heure: 14,
        jour_semaine: 1,
        type_transaction: 'Paiement',
        canal: 'Web'
      },
      network_intelligence: {
        score_reputation_ip: 0.4,
        ip_datacenter: true,
        ip_pays_inhabituel: true,
        ip_sur_liste_noire: false
      },
      anonymization_detection: {
        tor_detecte: false,
        vpn_detecte: true,
        proxy_detecte: true
      },
      behavioral_biometrics_ueba: {
        duree_session_min: 3.0,
        nb_ecrans_session: 2,
        delai_otp_s: 90,
        nb_echecs_login_24h: 3,
        vitesse_frappe: 85,
        entropie_souris: 0.3,
        nombre_requetes_par_minute: 8
      },
      engineered_features_profiling: {
        vitesse_24h: 2500,
        ratio_montant_median_30j: 3.5,
        beneficiaire_nouveau: true,
        distance_km_habitude: 200,
        changement_appareil: true
      },
      relational_graph_features: {
        degre_client: 6,
        nb_voisins_frauduleux: 2,
        score_reseau: 0.4
      },
      security_integrity: {
        signature_transaction_valide: true,
        certificat_valide: false,
        score_confiance_client_api: 0.5
      }
    },
    target_labels: {
      cible_fraude: false,
      cible_session_anormale: true,
      cible_comportement_atypique: true
    }
  }
];

const chartData = [
  { date: 'Lun', value: 180, fraud: 5 },
  { date: 'Mar', value: 220, fraud: 8 },
  { date: 'Mer', value: 195, fraud: 4 },
  { date: 'Jeu', value: 240, fraud: 12 },
  { date: 'Ven', value: 210, fraud: 6 },
  { date: 'Sam', value: 120, fraud: 3 },
  { date: 'Dim', value: 82, fraud: 2 },
];

const mockClients = [
  { id: 'C-501', name: 'John Doe', segment: 'Particulier', score: 15, status: 'Actif' },
  { id: 'C-502', name: 'Jane Smith', segment: 'Particulier', score: 72, status: 'Surveillance' },
  { id: 'C-503', name: 'Acme Corp', segment: 'Entreprise', score: 25, status: 'Actif' },
  { id: 'C-504', name: 'Bob Martin', segment: 'Particulier', score: 89, status: 'Bloqué' },
  { id: 'C-505', name: 'Alice Dubois', segment: 'VIP', score: 8, status: 'Actif' },
] as const;

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
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [clientSearchQuery, setClientSearchQuery] = useState('');
  
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

  const qClients = clientSearchQuery.trim().toLowerCase();
  const filteredClients = mockClients.filter((client) => {
    if (!qClients) return true;
    return (
      client.id.toLowerCase().includes(qClients) ||
      client.name.toLowerCase().includes(qClients) ||
      client.segment.toLowerCase().includes(qClients) ||
      client.status.toLowerCase().includes(qClients) ||
      String(client.score).includes(qClients)
    );
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
              
              <TransactionTable transactions={filteredTransactions} />
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
