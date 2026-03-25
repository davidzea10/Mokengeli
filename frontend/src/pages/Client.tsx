import { useState, type FormEvent } from 'react';
import { sendClientLogin, sendClientLogout, sendClientTransactionSimulation } from '../api';

interface TransactionResult {
  score_m1: number;
  score_m2: number;
  score_m3: number;
  score_combined: number;
  decision: 'allow' | 'block' | 'challenge';
  decision_reason_codes: string[];
}

interface TransactionHistory {
  id: string;
  numero_transaction: string;
  date: string;
  montant: number;
  type_transaction: string;
  beneficiaire: string;
  decision: 'allow' | 'block' | 'challenge';
}

/** Comptes de démo : mot de passe commun — voir texte d’aide sur l’écran de connexion */
const DEMO_LOGIN_ACCOUNTS: {
  profileId: string;
  password: string;
  nomAliases: string[];
}[] = [
  {
    profileId: 'C-501',
    password: 'demo123',
    nomAliases: ['standard', 'client standard', 'c-501', 'c501'],
  },
  {
    profileId: 'C-502',
    password: 'demo123',
    nomAliases: ['risque', 'client à risque', 'c-502', 'c502'],
  },
  {
    profileId: 'DEMO_01',
    password: 'demo123',
    nomAliases: ['demo', 'compte démo', 'demo_01', 'démo', 'demo01'],
  },
];

function normalizeNom(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function matchDemoLogin(nomInput: string, password: string): string | null {
  const n = normalizeNom(nomInput);
  if (!n || !password) return null;
  for (const acc of DEMO_LOGIN_ACCOUNTS) {
    if (acc.password !== password) continue;
    for (const alias of acc.nomAliases) {
      if (normalizeNom(alias) === n) return acc.profileId;
    }
  }
  return null;
}

/** Solde initial (FC) par profil — démo */
const PROFILE_INITIAL_BALANCE: Record<string, number> = {
  'C-501': 5_000_000,
  'C-502': 1_500_000,
  DEMO_01: 10_000_000,
};

const OPERATION_TYPE_LABELS: Record<string, string> = {
  virement: 'Virement',
  p2p: 'P2P',
  carte: 'Paiement carte',
  retrait: 'Retrait',
  facture: 'Paiement facture',
  mobile_money: 'Mobile money',
};

export function Client() {
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [userDisplayName, setUserDisplayName] = useState('');
  const [loginNom, setLoginNom] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'new_transaction' | 'history'>('dashboard');
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountBalance, setAccountBalance] = useState(5_000_000);
  const [balanceError, setBalanceError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    montant: '',
    type_transaction: 'virement',
    beneficiaire: '',
    canal: 'app',
    heure: new Date().getHours(),
    beneficiaire_nouveau: false,
    changement_appareil: false,
    ip_pays_inhabituel: false,
  });

  const [history, setHistory] = useState<TransactionHistory[]>([
    { id: '1', numero_transaction: 'TXN-001', date: '2026-03-24 10:30', montant: 75000, type_transaction: 'P2P', beneficiaire: 'John D.', decision: 'allow' },
    { id: '2', numero_transaction: 'TXN-002', date: '2026-03-24 11:15', montant: 4500000, type_transaction: 'Virement', beneficiaire: 'Nouveau bénéficiaire', decision: 'block' },
    { id: '3', numero_transaction: 'TXN-003', date: '2026-03-24 14:22', montant: 182000, type_transaction: 'Carte', beneficiaire: 'Marchand ABC', decision: 'allow' },
  ]);

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError('');
    const nom = loginNom.trim();
    if (!nom || !loginPassword) {
      setLoginError('Veuillez renseigner le nom et le mot de passe.');
      return;
    }
    await sendClientLogin({ name: nom, password: loginPassword });
    const profileId = matchDemoLogin(nom, loginPassword);
    if (!profileId) {
      setLoginError('Nom ou mot de passe incorrect.');
      return;
    }
    setSelectedProfile(profileId);
    setUserDisplayName(nom);
    setAccountBalance(PROFILE_INITIAL_BALANCE[profileId] ?? 5_000_000);
    setBalanceError('');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    void sendClientLogout({
      profile_id: selectedProfile,
      user_display_name: userDisplayName,
    });
    setIsLoggedIn(false);
    setSelectedProfile('');
    setUserDisplayName('');
    setLoginNom('');
    setLoginPassword('');
    setLoginError('');
  };

  const simulateTransaction = async () => {
    const montant = parseFloat(formData.montant) || 0;
    if (montant > accountBalance) {
      setBalanceError(
        `Solde insuffisant : le montant (${montant.toLocaleString('fr-FR')} FC) dépasse votre solde disponible (${accountBalance.toLocaleString('fr-FR')} FC).`
      );
      return;
    }
    setBalanceError('');

    await sendClientTransactionSimulation({
      profileId: selectedProfile,
      userDisplayName: userDisplayName || selectedProfile,
      accountBalance,
      form: formData,
    });

    setIsLoading(true);
    setTransactionResult(null);

    // Simulate ML scoring based on transaction characteristics
    setTimeout(() => {
      
      // Calculate scores based on risk factors
      let m1Score = Math.random() * 0.3; // Base transaction score
      let m2Score = Math.random() * 0.2; // Base session score
      let m3Score = Math.random() * 0.25; // Base behavior score

      // Risk factors
      if (montant > 1000000) m1Score += 0.4;
      if (montant > 5000000) m1Score += 0.3;
      if (formData.beneficiaire_nouveau) m1Score += 0.25;
      if (formData.ip_pays_inhabituel) m2Score += 0.35;
      if (formData.changement_appareil) m2Score += 0.3;
      if (formData.heure >= 0 && formData.heure < 6) m3Score += 0.2;

      // For demo profile C-502, always high risk
      if (selectedProfile === 'C-502') {
        m1Score = 0.87;
        m2Score = 0.78;
        m3Score = 0.72;
      }

      m1Score = Math.min(m1Score, 1);
      m2Score = Math.min(m2Score, 1);
      m3Score = Math.min(m3Score, 1);

      const combinedScore = (m1Score * 0.4 + m2Score * 0.3 + m3Score * 0.3);

      let decision: 'allow' | 'block' | 'challenge' = 'allow';
      const reasonCodes: string[] = [];

      if (combinedScore >= 0.7) {
        decision = 'block';
        reasonCodes.push('SCORE_CRITIQUE', 'FRAUDE_SUSPECTEE');
      } else if (combinedScore >= 0.4) {
        decision = 'challenge';
        reasonCodes.push('SCORE_ELEVE', 'VERIFICATION_REQUIRED');
      } else {
        reasonCodes.push('SCORE_NORMAL');
      }

      const result: TransactionResult = {
        score_m1: Math.round(m1Score * 100) / 100,
        score_m2: Math.round(m2Score * 100) / 100,
        score_m3: Math.round(m3Score * 100) / 100,
        score_combined: Math.round(combinedScore * 100) / 100,
        decision,
        decision_reason_codes: reasonCodes,
      };

      setTransactionResult(result);
      setShowModal(true);

      if (decision === 'allow') {
        setAccountBalance((prev) => Math.max(0, prev - montant));
      }

      // Add to history
      const newTransaction: TransactionHistory = {
        id: Date.now().toString(),
        numero_transaction: `TXN-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleString(),
        montant,
        type_transaction: formData.type_transaction,
        beneficiaire: formData.beneficiaire || 'Inconnu',
        decision,
      };

      setHistory([newTransaction, ...history]);
      setIsLoading(false);
    }, 1500);
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'allow': return 'bg-green-500';
      case 'block': return 'bg-red-500';
      case 'challenge': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getDecisionLabel = (decision: string) => {
    switch (decision) {
      case 'allow': return 'Autorisé';
      case 'block': return 'Bloqué';
      case 'challenge': return 'Vérification';
      default: return decision;
    }
  };

  // Profile selection view
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-rb-black via-rb-black-soft to-rb-black flex items-center justify-center p-4 sm:p-8 safe-area-pad">
        <div className="max-w-md w-full">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rb-yellow flex items-center justify-center mx-auto mb-4 shadow-xl shadow-rb-yellow/20">
              <svg className="w-12 h-12 text-rb-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">MOKENGELI</h1>
            <p className="text-sm sm:text-base text-neutral-300 px-2">Simulateur Client - Démo Anti-Fraude</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Connexion</h2>
            <p className="text-sm text-gray-500 mb-6">
              Saisissez votre nom d’identification et votre mot de passe.
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="client-login-nom" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  id="client-login-nom"
                  name="nom"
                  type="text"
                  autoComplete="username"
                  value={loginNom}
                  onChange={(e) => {
                    setLoginNom(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-rb-yellow focus:ring-2 focus:ring-rb-yellow/25"
                  placeholder="Ex. standard, risque, demo"
                />
              </div>
              <div>
                <label htmlFor="client-login-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  id="client-login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-rb-yellow focus:ring-2 focus:ring-rb-yellow/25"
                  placeholder="••••••••"
                />
              </div>

              {loginError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-rb-yellow py-3 text-base font-semibold text-rb-black shadow-md transition hover:bg-rb-yellow-dark active:bg-rb-yellow-dark"
              >
                Se connecter
              </button>
            </form>

            <p className="mt-6 text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
              <span className="font-medium text-gray-600">Démo :</span> mot de passe{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-800">demo123</code> — noms acceptés par
              exemple <code className="rounded bg-gray-100 px-1">standard</code>,{' '}
              <code className="rounded bg-gray-100 px-1">risque</code>,{' '}
              <code className="rounded bg-gray-100 px-1">demo</code> (ou C-501, C-502, etc.).
            </p>
          </div>

          <p className="text-center text-neutral-400 text-sm mt-6">
            Version démo - Hackathon RawBank 2026
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-rb-page safe-area-pad">
      {/* Header */}
      <header className="bg-rb-black text-white p-3 sm:p-4 shadow-lg border-b border-rb-yellow/25">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-rb-yellow flex items-center justify-center">
              <svg className="w-6 h-6 text-rb-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg truncate">MOKENGELI</h1>
              <p className="text-xs text-neutral-400">Simulation Bancaire</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 sm:justify-end">
            <span className="text-xs sm:text-sm bg-rb-black-muted px-3 py-1.5 rounded-full max-w-full truncate border border-rb-yellow/30" title={selectedProfile}>
              {userDisplayName}
            </span>
            <button 
              type="button"
              onClick={handleLogout}
              className="text-xs sm:text-sm bg-rb-yellow text-rb-black px-3 py-1.5 rounded-full hover:bg-rb-yellow-dark whitespace-nowrap font-medium"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-3 sm:p-4 pb-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1 touch-pan-x [scrollbar-width:thin]">
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className={`shrink-0 px-4 py-2 rounded-lg font-medium text-sm sm:text-base ${
              currentView === 'dashboard' ? 'bg-rb-yellow text-rb-black' : 'bg-white text-gray-600'
            }`}
          >
            Tableau de bord
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('new_transaction')}
            className={`shrink-0 px-4 py-2 rounded-lg font-medium text-sm sm:text-base ${
              currentView === 'new_transaction' ? 'bg-rb-yellow text-rb-black' : 'bg-white text-gray-600'
            }`}
          >
            Nouvelle opération
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('history')}
            className={`shrink-0 px-4 py-2 rounded-lg font-medium text-sm sm:text-base ${
              currentView === 'history' ? 'bg-rb-yellow text-rb-black' : 'bg-white text-gray-600'
            }`}
          >
            Historique
          </button>
        </div>

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-rb-black to-rb-black-muted p-5 sm:p-6 text-white shadow-lg shadow-rb-black/30 ring-1 ring-rb-yellow/20">
              <p className="mb-4 text-sm text-neutral-300">
                Bonjour,{' '}
                <span className="font-semibold text-rb-yellow-bright">{userDisplayName}</span>
              </p>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-400">Solde du compte</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl text-rb-yellow-bright">
                    {accountBalance.toLocaleString('fr-FR')} <span className="text-lg font-semibold text-neutral-300">FC</span>
                  </p>
                </div>
                <p className="text-xs text-neutral-400 sm:max-w-xs sm:text-right">
                  Solde disponible pour vos opérations (démo). Les virements autorisés mettent à jour ce solde.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Opérations aujourd'hui</p>
                <p className="text-2xl font-bold text-gray-800">{history.length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Autorisées</p>
                <p className="text-2xl font-bold text-green-600">{history.filter(h => h.decision === 'allow').length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Bloquées</p>
                <p className="text-2xl font-bold text-red-600">{history.filter(h => h.decision === 'block').length}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Alertes récentes</h3>
              <div className="space-y-3">
                {history.filter(h => h.decision !== 'allow').slice(0, 3).map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-2 h-2 shrink-0 rounded-full ${getDecisionColor(item.decision)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.numero_transaction}</p>
                        <p className="text-xs text-gray-500">{item.date} — {item.montant.toLocaleString()} FC</p>
                      </div>
                    </div>
                    <span className={`self-start sm:self-center text-xs px-2 py-1 rounded-full text-white shrink-0 ${getDecisionColor(item.decision)}`}>
                      {getDecisionLabel(item.decision)}
                    </span>
                  </div>
                ))}
                {history.filter(h => h.decision !== 'allow').length === 0 && (
                  <p className="text-gray-500 text-sm">Aucune alerte récente</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* New Transaction View */}
        {currentView === 'new_transaction' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">Nouvelle opération</h3>
                <p className="text-sm text-gray-600">
                  Solde disponible :{' '}
                  <span className="font-semibold tabular-nums text-gray-900">
                    {accountBalance.toLocaleString('fr-FR')} FC
                  </span>
                </p>
              </div>

              {balanceError && (
                <div
                  className="mb-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  role="alert"
                >
                  <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{balanceError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FC)</label>
                  <input
                    type="number"
                    min={0}
                    max={accountBalance}
                    value={formData.montant}
                    onChange={(e) => {
                      setBalanceError('');
                      setFormData({ ...formData, montant: e.target.value });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rb-yellow/50 focus:border-transparent"
                    placeholder="Entrez le montant"
                  />
                  <p className="mt-1 text-xs text-gray-500">Le montant ne peut pas dépasser votre solde disponible.</p>
                  {(parseFloat(formData.montant) || 0) > accountBalance && formData.montant !== '' && (
                    <p className="mt-2 text-sm font-medium text-red-600" role="status">
                      Le montant saisi dépasse votre solde disponible ({accountBalance.toLocaleString('fr-FR')} FC).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type d'opération</label>
                  <select
                    value={formData.type_transaction}
                    onChange={(e) => setFormData({ ...formData, type_transaction: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rb-yellow/50 focus:border-transparent"
                  >
                    <option value="virement">Virement</option>
                    <option value="p2p">P2P</option>
                    <option value="mobile_money">Mobile money</option>
                    <option value="carte">Paiement carte</option>
                    <option value="retrait">Retrait</option>
                    <option value="facture">Paiement facture</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bénéficiaire</label>
                  <input
                    type="text"
                    value={formData.beneficiaire}
                    onChange={(e) => setFormData({ ...formData, beneficiaire: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rb-yellow/50 focus:border-transparent"
                    placeholder="Nom du bénéficiaire"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Canal</label>
                  <select
                    value={formData.canal}
                    onChange={(e) => setFormData({ ...formData, canal: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rb-yellow/50 focus:border-transparent"
                  >
                    <option value="app">Application mobile</option>
                    <option value="web">Web banking</option>
                    <option value="ussd">USSD</option>
                    <option value="agence">Agence</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.beneficiaire_nouveau}
                    onChange={(e) => setFormData({ ...formData, beneficiaire_nouveau: e.target.checked })}
                    className="w-4 h-4 text-rb-yellow-dark rounded"
                  />
                  <span className="text-sm text-gray-700">Nouveau bénéficiaire</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.changement_appareil}
                    onChange={(e) => setFormData({ ...formData, changement_appareil: e.target.checked })}
                    className="w-4 h-4 text-rb-yellow-dark rounded"
                  />
                  <span className="text-sm text-gray-700">Appareil différent</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ip_pays_inhabituel}
                    onChange={(e) => setFormData({ ...formData, ip_pays_inhabituel: e.target.checked })}
                    className="w-4 h-4 text-rb-yellow-dark rounded"
                  />
                  <span className="text-sm text-gray-700">Position géographique inhabituelle</span>
                </label>
              </div>

              <button
                type="button"
                onClick={simulateTransaction}
                disabled={
                  isLoading ||
                  !formData.montant ||
                  (parseFloat(formData.montant) || 0) > accountBalance ||
                  (parseFloat(formData.montant) || 0) <= 0
                }
                className="mt-6 w-full bg-rb-yellow text-rb-black py-3 rounded-lg font-medium hover:bg-rb-yellow-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors touch-manipulation"
              >
                {isLoading ? 'Analyse en cours...' : 'Simuler la transaction'}
              </button>
            </div>

            {/* Result Display - Modal */}
            {showModal && transactionResult && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:py-8"
                role="dialog"
                aria-modal="true"
                aria-labelledby="transaction-result-title"
              >
                <div className="w-full max-w-sm max-h-[min(calc(100dvh-2rem),100vh)] overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:max-h-[min(90dvh,90vh)]">
                  <div className="px-5 py-8 sm:px-10 sm:py-10">
                    <div className="flex flex-col items-center">
                      <div
                        className={`mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-full sm:mb-5 sm:h-16 sm:w-16 ${
                          transactionResult.decision === 'allow'
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                        aria-hidden
                      >
                        {transactionResult.decision === 'allow' ? (
                          <svg className="h-8 w-8 sm:h-9 sm:w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-8 w-8 sm:h-9 sm:w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <p
                        id="transaction-result-title"
                        className={`text-center text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl ${
                          transactionResult.decision === 'allow' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {transactionResult.decision === 'allow' ? 'Succès' : 'Refusé'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setFormData({
                          montant: '',
                          type_transaction: 'virement',
                          beneficiaire: '',
                          canal: 'app',
                          heure: new Date().getHours(),
                          beneficiaire_nouveau: false,
                          changement_appareil: false,
                          ip_pays_inhabituel: false,
                        });
                      }}
                      className="mt-7 w-full min-h-[48px] touch-manipulation rounded-xl bg-rb-yellow py-3.5 text-base font-semibold text-rb-black transition-colors hover:bg-rb-yellow-dark active:bg-rb-yellow-dark sm:mt-8 sm:rounded-lg"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History View */}
        {currentView === 'history' && (
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Historique des transactions</h3>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">{item.numero_transaction}</p>
                    <p className="text-sm text-gray-500">{item.date}</p>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:text-right gap-3 sm:gap-1 shrink-0">
                    <div>
                      <p className="font-semibold text-gray-800 tabular-nums">{item.montant.toLocaleString()} FC</p>
                      <p className="text-sm text-gray-500">
                        {OPERATION_TYPE_LABELS[item.type_transaction] ?? item.type_transaction}
                      </p>
                    </div>
                    <span className={`text-xs sm:text-sm px-3 py-1 rounded-full text-white whitespace-nowrap ${getDecisionColor(item.decision)}`}>
                      {getDecisionLabel(item.decision)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
