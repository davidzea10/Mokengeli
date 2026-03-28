import {
  createContext,
  useCallback,
  useContext,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  sendClientLogout,
  loginWithApi,
  fetchMeContext,
  createBeneficiaireApi,
  evaluateTransactionWithApi,
  isApiConfigured,
} from '../api';
import type { MeContextData } from '../api';
import type { BankFlow } from '../api/buildTransactionPayload';
import { buildBeneficiarySummary } from '../api/buildTransactionPayload';
import { isValidPhoneRdcInput } from '../utils/phoneDigits';
import { getRequiredGeolocation } from '../utils/geolocation';

export interface TransactionResult {
  /** Probabilité de fraude M1 (0–1), issue de log_reg.joblib. */
  score_m1: number;
  score_m2: number | null;
  score_m3: number | null;
  score_combined: number;
  decision: 'allow' | 'block' | 'challenge';
  decision_reason_codes: string[];
  m1_fallback?: boolean;
  m1_label?: string | null;
  m1_model?: string | null;
}

export interface TransactionHistory {
  id: string;
  numero_transaction: string;
  date: string;
  montant: number;
  type_transaction: string;
  beneficiaire: string;
  decision: 'allow' | 'block' | 'challenge';
}

interface ClientFormState {
  montant: string;
  type_transaction: string;
  canal: string;
  heure: number;
  beneficiaire_nouveau: boolean;
  changement_appareil: boolean;
  ip_pays_inhabituel: boolean;
  beneficiary_mode: 'banque' | 'mobile_money';
  /** Sous-flux bancaire (RawBank → RawBank, autre banque RDC, ou vers mobile money). */
  bank_flow: BankFlow;
  ben_compte_identifiant: string;
  ben_banque_code: string;
  ben_titulaire: string;
  ben_telephone: string;
  ben_operateur: string;
}

const initialForm = (): ClientFormState => ({
  montant: '',
  type_transaction: 'virement',
  canal: 'app',
  heure: new Date().getHours(),
  beneficiaire_nouveau: false,
  changement_appareil: false,
  ip_pays_inhabituel: false,
  beneficiary_mode: 'banque',
  bank_flow: 'rawbank_rawbank',
  ben_compte_identifiant: '',
  ben_banque_code: 'RAWBANK',
  ben_titulaire: '',
  ben_telephone: '',
  ben_operateur: '',
});

interface ClientSessionValue {
  isLoggedIn: boolean;
  selectedProfile: string;
  userDisplayName: string;
  loginNom: string;
  loginPassword: string;
  loginError: string;
  setLoginError: (v: string) => void;
  loginSubmitting: boolean;
  accountBalance: number;
  meContext: MeContextData | null;
  balanceError: string;
  beneficiaryError: string;
  transactionApiError: string;
  formData: ClientFormState;
  setLoginNom: (v: string) => void;
  setLoginPassword: (v: string) => void;
  handleLoginSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  handleLogout: () => void;
  setFormData: React.Dispatch<React.SetStateAction<ClientFormState>>;
  setBalanceError: (v: string) => void;
  setBeneficiaryError: (v: string) => void;
  setTransactionApiError: (v: string) => void;
  history: TransactionHistory[];
  transactionResult: TransactionResult | null;
  showModal: boolean;
  isLoading: boolean;
  setShowModal: (v: boolean) => void;
  resetFormAfterModal: () => void;
  simulateTransaction: () => Promise<void>;
  getDecisionColor: (decision: string) => string;
  getDecisionLabel: (decision: string) => string;
  refreshMe: () => Promise<void>;
}

const ClientSessionContext = createContext<ClientSessionValue | null>(null);

export function ClientSessionProvider({ children }: { children: ReactNode }) {
  const [selectedProfile, setSelectedProfile] = useState('');
  const [userDisplayName, setUserDisplayName] = useState('');
  const [loginNom, setLoginNom] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [accountBalance, setAccountBalance] = useState(0);
  const [meContext, setMeContext] = useState<MeContextData | null>(null);
  const [balanceError, setBalanceError] = useState('');
  const [beneficiaryError, setBeneficiaryError] = useState('');
  const [transactionApiError, setTransactionApiError] = useState('');
  const [formData, setFormData] = useState<ClientFormState>(initialForm);
  const [history, setHistory] = useState<TransactionHistory[]>([]);

  const refreshMe = useCallback(async () => {
    if (!selectedProfile) return;
    const me = await fetchMeContext(selectedProfile);
    if (me.ok) {
      setAccountBalance(Number(me.data.solde_total) || 0);
      setMeContext(me.data);
    }
  }, [selectedProfile]);

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError('');
    const identifiant = loginNom.trim();
    if (!identifiant || !loginPassword) {
      setLoginError('Veuillez renseigner l’identifiant et le mot de passe.');
      return;
    }

    if (!isApiConfigured()) {
      setLoginError(
        'Pour vous connecter avec vos identifiants bancaires, ajoutez VITE_API_BASE_URL dans le fichier .env du client (URL du serveur API, ex. http://localhost:3000) puis redémarrez.'
      );
      return;
    }

    setLoginSubmitting(true);
    setMeContext(null);
    try {
      const loginRes = await loginWithApi(identifiant, loginPassword);
      if (!loginRes.ok) {
        setLoginError(loginRes.message || 'Connexion refusée');
        return;
      }
      const meRes = await fetchMeContext(loginRes.reference_client);
      if (!meRes.ok) {
        setLoginError(meRes.message || 'Impossible de charger le profil client.');
        return;
      }
      setSelectedProfile(loginRes.reference_client);
      setUserDisplayName(
        meRes.data.client.nom_complet?.trim() || loginRes.client.nom_complet?.trim() || identifiant
      );
      setAccountBalance(Number(meRes.data.solde_total) || 0);
      setMeContext(meRes.data);
      setBalanceError('');
      setHistory([]);
      setIsLoggedIn(true);
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = () => {
    void sendClientLogout({
      profile_id: selectedProfile,
      user_display_name: userDisplayName,
    });
    setIsLoggedIn(false);
    setSelectedProfile('');
    setUserDisplayName('');
    setMeContext(null);
    setLoginNom('');
    setLoginPassword('');
    setLoginError('');
    setHistory([]);
  };

  const resetFormAfterModal = useCallback(() => {
    setBeneficiaryError('');
    setTransactionApiError('');
    setFormData(initialForm());
  }, []);

  const simulateTransaction = async () => {
    const montant = parseFloat(formData.montant) || 0;
    setBeneficiaryError('');
    setTransactionApiError('');
    if (formData.beneficiary_mode === 'mobile_money') {
      if (!isValidPhoneRdcInput(formData.ben_telephone)) {
        setBeneficiaryError(
          'Numéro mobile : 10 chiffres (ex. 0894123456) ou format international +243…'
        );
        return;
      }
    } else if (formData.bank_flow === 'rawbank_vers_mobile') {
      if (!isValidPhoneRdcInput(formData.ben_telephone)) {
        setBeneficiaryError(
          'Numéro mobile : 10 chiffres ou +243… (ex. 0894123456).'
        );
        return;
      }
    } else {
      if (!formData.ben_compte_identifiant.trim()) {
        setBeneficiaryError('Indiquez le numéro de compte du bénéficiaire.');
        return;
      }
      if (formData.bank_flow === 'rawbank_autre' && !formData.ben_banque_code.trim()) {
        setBeneficiaryError('Choisissez la banque du bénéficiaire.');
        return;
      }
    }
    if (montant > accountBalance) {
      setBalanceError(
        `Solde insuffisant : le montant (${montant.toLocaleString('fr-FR')} FC) dépasse votre solde disponible (${accountBalance.toLocaleString('fr-FR')} FC).`
      );
      return;
    }
    setBalanceError('');

    if (!isApiConfigured() || !meContext || !selectedProfile) {
      setTransactionApiError(
        'Session ou API indisponible. Connectez-vous avec le serveur et un compte présent en base.'
      );
      return;
    }

    setIsLoading(true);
    setTransactionResult(null);
    try {
      let geo: { latitude_debit: number; longitude_debit: number };
      try {
        const pos = await getRequiredGeolocation();
        geo = { latitude_debit: pos.latitude, longitude_debit: pos.longitude };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Géolocalisation requise.';
        setTransactionApiError(msg);
        return;
      }

      const benRes = await createBeneficiaireApi(formData);
      let beneficiaireId: string | undefined;
      if (benRes.ok) {
        beneficiaireId = benRes.id;
      } else if ('skipped' in benRes && benRes.skipped) {
        beneficiaireId = undefined;
      } else if (!benRes.ok && 'message' in benRes) {
        setBeneficiaryError(benRes.message || 'Impossible d’enregistrer le bénéficiaire.');
        return;
      }

      const txNum = `TXN-${Date.now()}`;
      const principal =
        meContext.comptes.find((c) => c.est_compte_principal) ?? meContext.comptes[0];

      const evalRes = await evaluateTransactionWithApi({
        referenceClient: selectedProfile,
        form: formData,
        transactionNumber: txNum,
        compteId: principal?.compte_id ?? null,
        beneficiaireId: beneficiaireId ?? null,
        geolocation: {
          latitude_debit: geo.latitude_debit,
          longitude_debit: geo.longitude_debit,
          latitude_credit: null,
          longitude_credit: null,
        },
      });

      if (!evalRes.ok) {
        const msg = evalRes.message || 'Évaluation impossible.';
        const low = msg.toLowerCase();
        if (
          evalRes.code === 'INSUFFICIENT_FUNDS' ||
          low.includes('solde') ||
          low.includes('insufficient')
        ) {
          setBalanceError(msg);
        } else {
          setTransactionApiError(msg);
        }
        return;
      }

      const s = evalRes.data.scoring;
      const decisionRaw = String(s.decision ?? 'allow').toLowerCase();
      const decision: 'allow' | 'block' | 'challenge' =
        decisionRaw === 'block'
          ? 'block'
          : decisionRaw === 'challenge'
            ? 'challenge'
            : 'allow';

      const nOrNull = (v: unknown): number | null => {
        if (v == null || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const result: TransactionResult = {
        score_m1: Math.round(Number(s.score_m1_transaction ?? 0) * 10000) / 10000,
        score_m2: nOrNull(s.score_m2_session),
        score_m3: nOrNull(s.score_m3_behavior),
        score_combined: Math.round(Number(s.score_combined ?? 0) * 10000) / 10000,
        decision,
        decision_reason_codes: Array.isArray(s.reason_codes) ? s.reason_codes : [],
        m1_fallback: typeof s.m1_fallback === 'boolean' ? s.m1_fallback : undefined,
        m1_label: typeof s.m1_label === 'string' ? s.m1_label : null,
        m1_model: typeof s.m1_model === 'string' ? s.m1_model : null,
      };

      setTransactionResult(result);
      setShowModal(true);

      if (decision === 'allow') {
        const me = await fetchMeContext(selectedProfile);
        if (me.ok) {
          setAccountBalance(Number(me.data.solde_total) || 0);
          setMeContext(me.data);
        } else {
          setAccountBalance((prev) => Math.max(0, prev - montant));
        }
        window.dispatchEvent(new Event('mokengeli-refresh-notifications'));
      }

      const persistedNum = evalRes.data.persistence?.numero_transaction?.trim();
      const newTransaction: TransactionHistory = {
        id: evalRes.data.persistence?.transaction_id ?? Date.now().toString(),
        numero_transaction: persistedNum || txNum,
        date: new Date().toLocaleString('fr-FR'),
        montant,
        type_transaction: formData.type_transaction,
        beneficiaire: buildBeneficiarySummary(formData),
        decision,
      };
      setHistory((prev) => [newTransaction, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'allow':
        return 'bg-green-500';
      case 'block':
        return 'bg-red-500';
      case 'challenge':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDecisionLabel = (decision: string) => {
    switch (decision) {
      case 'allow':
        return 'Autorisé';
      case 'block':
        return 'Bloqué';
      case 'challenge':
        return 'Vérification';
      default:
        return decision;
    }
  };

  const value: ClientSessionValue = {
    isLoggedIn,
    selectedProfile,
    userDisplayName,
    loginNom,
    loginPassword,
    loginError,
    setLoginError,
    loginSubmitting,
    accountBalance,
    meContext,
    balanceError,
    beneficiaryError,
    transactionApiError,
    formData,
    setLoginNom,
    setLoginPassword,
    handleLoginSubmit,
    handleLogout,
    setFormData,
    setBalanceError,
    setBeneficiaryError,
    setTransactionApiError,
    history,
    transactionResult,
    showModal,
    isLoading,
    setShowModal,
    resetFormAfterModal,
    simulateTransaction,
    getDecisionColor,
    getDecisionLabel,
    refreshMe,
  };

  return <ClientSessionContext.Provider value={value}>{children}</ClientSessionContext.Provider>;
}

export function useClientSession() {
  const ctx = useContext(ClientSessionContext);
  if (!ctx) throw new Error('useClientSession doit être utilisé dans ClientSessionProvider');
  return ctx;
}
