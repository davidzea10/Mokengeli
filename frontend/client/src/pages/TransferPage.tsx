import { useMemo } from 'react';
import { CONGO_BANKS } from '../constants/congoBanks';
import type { BankFlow } from '../api/buildTransactionPayload';
import { useClientSession } from '../context/ClientSessionContext';
import { useTheme } from '../context/ThemeContext';
import { isValidPhoneRdcInput } from '../utils/phoneDigits';

const AUTRES_BANQUES = CONGO_BANKS.filter((b) => b.code !== 'RAWBANK');

const flowLabels: Record<BankFlow, string> = {
  rawbank_rawbank: 'RawBank → RawBank',
  rawbank_autre: 'RawBank → autre banque',
  rawbank_vers_mobile: 'RawBank → mobile money',
};

export function TransferPage() {
  const {
    accountBalance,
    balanceError,
    beneficiaryError,
    transactionApiError,
    formData,
    setFormData,
    setBalanceError,
    setBeneficiaryError,
    setTransactionApiError,
    isLoading,
    simulateTransaction,
    transactionResult,
    showModal,
    setShowModal,
    resetFormAfterModal,
  } = useClientSession();
  const { isDark } = useTheme();

  const setBankFlow = (flow: BankFlow) => {
    setBeneficiaryError('');
    setFormData((prev) => {
      let ben_banque_code = prev.ben_banque_code;
      if (flow === 'rawbank_rawbank') ben_banque_code = 'RAWBANK';
      else if (flow === 'rawbank_autre') ben_banque_code = '';
      else ben_banque_code = 'RAWBANK';
      return { ...prev, bank_flow: flow, ben_banque_code };
    });
  };

  const setMode = (mode: 'banque' | 'mobile_money') => {
    setBeneficiaryError('');
    setFormData((prev) => ({
      ...prev,
      beneficiary_mode: mode,
      bank_flow: mode === 'banque' ? 'rawbank_rawbank' : prev.bank_flow,
      ben_banque_code: mode === 'banque' ? 'RAWBANK' : prev.ben_banque_code,
    }));
  };

  const isBank = formData.beneficiary_mode === 'banque';
  const isFlowMobile = formData.bank_flow === 'rawbank_vers_mobile';
  const isStandaloneMobile = formData.beneficiary_mode === 'mobile_money';

  const disableSubmit = useMemo(() => {
    const montant = parseFloat(formData.montant) || 0;
    if (isLoading || !formData.montant || montant <= 0 || montant > accountBalance) return true;
    if (isStandaloneMobile || (isBank && isFlowMobile)) {
      return !isValidPhoneRdcInput(formData.ben_telephone);
    }
    if (isBank && !isFlowMobile) {
      if (!formData.ben_compte_identifiant.trim()) return true;
      if (formData.bank_flow === 'rawbank_autre' && !formData.ben_banque_code.trim()) return true;
    }
    return false;
  }, [isLoading, formData, accountBalance, isBank, isFlowMobile, isStandaloneMobile]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="px-0.5">
        <h1
          className={`text-lg font-bold tracking-tight sm:text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          Nouvelle opération
        </h1>
        <p className={`mt-1 text-xs sm:text-sm ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
          Solde disponible :{' '}
          <span className="font-semibold tabular-nums text-rb-yellow">{accountBalance.toLocaleString('fr-FR')} FC</span>
        </p>
        <p
          className={`mt-2 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
            isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-100/90' : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}
        >
          <span className="font-semibold">Géolocalisation obligatoire</span> — au clic sur « Valider l’opération », votre
          navigateur demandera l’autorisation de position (HTTPS). Sans position, la transaction ne peut pas être
          enregistrée.
        </p>
      </header>

      <div
        className={`overflow-hidden rounded-2xl border bg-white shadow-xl ${
          isDark ? 'border-white/10 shadow-black/20' : 'border-gray-200/90 shadow-gray-300/40'
        }`}
      >
        <div className="border-b border-gray-100 bg-neutral-50/80 px-4 py-3 sm:px-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Montant</p>
          <div className="mt-2 flex items-baseline gap-2">
            <input
              type="number"
              min={0}
              max={accountBalance}
              value={formData.montant}
              onChange={(e) => {
                setBalanceError('');
                setTransactionApiError('');
                setFormData({ ...formData, montant: e.target.value });
              }}
              className="w-full max-w-[220px] border-0 bg-transparent text-2xl font-semibold tabular-nums text-gray-900 placeholder:text-gray-300 focus:ring-0 sm:text-3xl"
              placeholder="0"
            />
            <span className="text-sm font-medium text-gray-500">FC</span>
          </div>
          {(parseFloat(formData.montant) || 0) > accountBalance && formData.montant !== '' && (
            <p className="mt-2 text-xs font-medium text-red-600">Dépasse votre solde disponible.</p>
          )}
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          {balanceError && (
            <div
              className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              <span>{balanceError}</span>
            </div>
          )}
          {beneficiaryError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
              {beneficiaryError}
            </div>
          )}
          {transactionApiError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
              {transactionApiError}
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-800">Destinataire</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMode('banque')}
                className={`rounded-xl border-2 px-3 py-3 text-left text-sm font-medium transition ${
                  isBank
                    ? 'border-rb-yellow bg-rb-yellow/10 text-gray-900'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                Compte bancaire
                <span className="mt-1 block text-[11px] font-normal text-gray-500">Virement RawBank</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('mobile_money')}
                className={`rounded-xl border-2 px-3 py-3 text-left text-sm font-medium transition ${
                  isStandaloneMobile
                    ? 'border-rb-yellow bg-rb-yellow/10 text-gray-900'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                Mobile money
                <span className="mt-1 block text-[11px] font-normal text-gray-500">Wallet, autre opérateur</span>
              </button>
            </div>
          </div>

          {isBank && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-800">Type de virement</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {(['rawbank_rawbank', 'rawbank_autre', 'rawbank_vers_mobile'] as const).map((flow) => (
                  <button
                    key={flow}
                    type="button"
                    onClick={() => setBankFlow(flow)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-center text-xs font-medium transition sm:min-w-[140px] sm:flex-none sm:text-sm ${
                      formData.bank_flow === flow
                        ? 'border-rb-yellow bg-rb-yellow/15 text-gray-900 ring-1 ring-rb-yellow/40'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {flowLabels[flow]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isStandaloneMobile && (
            <div className="space-y-4 rounded-xl border border-gray-100 bg-neutral-50/50 p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Numéro de téléphone</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={formData.ben_telephone}
                  onChange={(e) => setFormData({ ...formData, ben_telephone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-rb-yellow focus:outline-none focus:ring-2 focus:ring-rb-yellow/25"
                  placeholder="0894123456 ou +243…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Titulaire (facultatif)</label>
                <input
                  type="text"
                  value={formData.ben_titulaire}
                  onChange={(e) => setFormData({ ...formData, ben_titulaire: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-rb-yellow focus:outline-none focus:ring-2 focus:ring-rb-yellow/25"
                  placeholder="Nom affiché"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Opérateur (facultatif)</label>
                <select
                  value={formData.ben_operateur}
                  onChange={(e) => setFormData({ ...formData, ben_operateur: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-rb-yellow focus:outline-none focus:ring-2 focus:ring-rb-yellow/25"
                >
                  <option value="">—</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
          )}

          {isBank && (
            <>
              {formData.bank_flow !== 'rawbank_vers_mobile' && (
                <div className="space-y-4 rounded-xl border border-gray-100 bg-neutral-50/50 p-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Numéro de compte</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={formData.ben_compte_identifiant}
                      onChange={(e) => setFormData({ ...formData, ben_compte_identifiant: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 focus:border-rb-yellow focus:outline-none focus:ring-2 focus:ring-rb-yellow/25"
                      placeholder="IBAN ou numéro local"
                    />
                  </div>
                  {formData.bank_flow === 'rawbank_autre' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Banque du bénéficiaire</label>
                      <select
                        value={formData.ben_banque_code}
                        onChange={(e) => setFormData({ ...formData, ben_banque_code: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-rb-yellow focus:outline-none focus:ring-2 focus:ring-rb-yellow/25"
                      >
                        <option value="">— Choisir une banque —</option>
                        {AUTRES_BANQUES.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {formData.bank_flow === 'rawbank_rawbank' && (
                    <p className="text-xs text-gray-500">Virement interne RawBank — même banque.</p>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Titulaire (facultatif)</label>
                    <input
                      type="text"
                      value={formData.ben_titulaire}
                      onChange={(e) => setFormData({ ...formData, ben_titulaire: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-rb-yellow focus:outline-none focus:ring-2 focus:ring-rb-yellow/25"
                      placeholder="Nom du bénéficiaire"
                    />
                  </div>
                </div>
              )}

              {formData.bank_flow === 'rawbank_vers_mobile' && (
                <div className="space-y-4 rounded-xl border border-gray-100 bg-neutral-50/50 p-4">
                  <p className="text-xs text-gray-600">
                    Envoi depuis votre compte RawBank vers un numéro mobile money.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Numéro de téléphone</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={formData.ben_telephone}
                      onChange={(e) => setFormData({ ...formData, ben_telephone: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-rb-yellow focus:outline-none focus:ring-2 focus:ring-rb-yellow/25"
                      placeholder="0894123456 ou +243…"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Titulaire (facultatif)</label>
                    <input
                      type="text"
                      value={formData.ben_titulaire}
                      onChange={(e) => setFormData({ ...formData, ben_titulaire: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-rb-yellow focus:outline-none focus:ring-2 focus:ring-rb-yellow/25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Opérateur (facultatif)</label>
                    <select
                      value={formData.ben_operateur}
                      onChange={(e) => setFormData({ ...formData, ben_operateur: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-rb-yellow focus:outline-none focus:ring-2 focus:ring-rb-yellow/25"
                    >
                      <option value="">—</option>
                      <option value="Orange Money">Orange Money</option>
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type d&apos;opération</label>
              <select
                value={formData.type_transaction}
                onChange={(e) => setFormData({ ...formData, type_transaction: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-rb-yellow focus:outline-none focus:ring-2 focus:ring-rb-yellow/25"
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
              <label className="block text-sm font-medium text-gray-700">Canal</label>
              <select
                value={formData.canal}
                onChange={(e) => setFormData({ ...formData, canal: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 focus:border-rb-yellow focus:outline-none focus:ring-2 focus:ring-rb-yellow/25"
              >
                <option value="app">Application</option>
                <option value="web">Web</option>
                <option value="ussd">USSD</option>
                <option value="agence">Agence</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-100 pt-4 text-sm text-gray-700">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={formData.beneficiaire_nouveau}
                onChange={(e) => setFormData({ ...formData, beneficiaire_nouveau: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-rb-yellow focus:ring-rb-yellow/30"
              />
              Nouveau bénéficiaire
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={formData.changement_appareil}
                onChange={(e) => setFormData({ ...formData, changement_appareil: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-rb-yellow focus:ring-rb-yellow/30"
              />
              Appareil différent
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={formData.ip_pays_inhabituel}
                onChange={(e) => setFormData({ ...formData, ip_pays_inhabituel: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-rb-yellow focus:ring-rb-yellow/30"
              />
              Connexion inhabituelle
            </label>
          </div>

          <button
            type="button"
            onClick={() => void simulateTransaction()}
            disabled={disableSubmit}
            className="w-full rounded-xl bg-rb-yellow py-3.5 text-base font-semibold text-rb-black shadow-md transition hover:bg-rb-yellow-dark disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            {isLoading ? 'Traitement…' : 'Valider l’opération'}
          </button>
        </div>
      </div>

      {showModal && transactionResult && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transaction-result-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                  transactionResult.decision === 'allow'
                    ? 'bg-emerald-100 text-emerald-600'
                    : transactionResult.decision === 'challenge'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-600'
                }`}
              >
                {transactionResult.decision === 'allow' ? (
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : transactionResult.decision === 'challenge' ? (
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <p
                id="transaction-result-title"
                className={`text-lg font-semibold ${
                  transactionResult.decision === 'allow'
                    ? 'text-emerald-600'
                    : transactionResult.decision === 'challenge'
                      ? 'text-amber-700'
                      : 'text-red-600'
                }`}
              >
                {transactionResult.decision === 'allow'
                  ? 'Succès'
                  : transactionResult.decision === 'challenge'
                    ? 'Vérification requise'
                    : 'Refusé'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetFormAfterModal();
              }}
              className="mt-6 w-full rounded-xl bg-rb-yellow py-3 text-base font-semibold text-rb-black hover:bg-rb-yellow-dark"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
