import { Link } from 'react-router-dom';
import { useClientSession } from '../context/ClientSessionContext';
import { useTheme } from '../context/ThemeContext';

export function HomePage() {
  const { userDisplayName, accountBalance, meContext } = useClientSession();
  const { isDark } = useTheme();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-mk-ink to-mk-ink-muted p-5 sm:p-6 text-white shadow-lg shadow-mk-ink/30 ring-1 ring-mk-blue/20">
        <p className="mb-4 text-sm text-neutral-300">
          Bonjour,{' '}
          <span className="font-semibold text-mk-blue-bright">{userDisplayName}</span>
        </p>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-400">Solde total</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl text-mk-blue-bright">
              {accountBalance.toLocaleString('fr-FR')}{' '}
              <span className="text-lg font-semibold text-neutral-300">FC</span>
            </p>
          </div>
          <p className="text-xs text-neutral-400 sm:max-w-xs sm:text-right">
            {meContext
              ? 'Solde issu de vos comptes en banque. Mis à jour après chaque opération réussie.'
              : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/app/operations"
          className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 hover:border-mk-blue/50 hover:shadow-md transition flex flex-col items-center gap-2 text-center"
        >
          <span className="w-10 h-10 rounded-full bg-mk-blue/15 flex items-center justify-center text-mk-ink font-bold text-xl">+</span>
          <span className="text-sm font-medium text-gray-800">Envoyer</span>
        </Link>
        <Link
          to="/app/lisungi"
          className="rounded-xl bg-gradient-to-br from-mk-blue to-mk-blue-dark p-4 shadow-md shadow-mk-blue/25 border border-mk-blue/30 hover:shadow-lg transition flex flex-col items-center gap-2 text-center text-white"
        >
          <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">L</span>
          <span className="text-sm font-semibold">Lisungi</span>
        </Link>
        <Link
          to="/app/comptes"
          className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 hover:border-mk-blue/50 hover:shadow-md transition flex flex-col items-center gap-2 text-center"
        >
          <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="text-sm font-medium text-gray-800">Mes comptes</span>
        </Link>
        <Link
          to="/app/cartes"
          className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 hover:border-mk-blue/50 hover:shadow-md transition flex flex-col items-center gap-2 text-center"
        >
          <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-sm font-medium text-gray-800">Mes cartes</span>
        </Link>
      </div>

      <Link
        to="/app/lisungi"
        className={`flex items-center gap-3 rounded-2xl border p-4 transition hover:shadow-md ${
          isDark
            ? 'border-mk-blue/40 bg-mk-blue/10 hover:bg-mk-blue/15'
            : 'border-mk-blue/30 bg-gradient-to-r from-sky-50 to-white hover:border-mk-blue/50'
        }`}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mk-blue text-white font-bold shadow-sm">
          L
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Lisungi</p>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
            Analyse vos transactions et marchands · remarques, conseils et recommandations
          </p>
        </div>
        <svg className={`h-5 w-5 shrink-0 ${isDark ? 'text-mk-blue-bright' : 'text-mk-blue'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      <div
        className={`rounded-xl border border-dashed p-4 sm:p-5 ${
          isDark ? 'border-mk-blue/40 bg-white/[0.04]' : 'border-gray-300 bg-white shadow-sm'
        }`}
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Sécurité & OTP</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Les codes à usage unique (OTP) pour valider vos opérations sensibles vous sont envoyés par SMS sur votre
          numéro enregistré lorsque ce service est activé.
        </p>
        <p className="mt-3 text-xs text-gray-500">Aucun code en attente pour le moment.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/app/profil"
          className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 hover:border-mk-blue/50 hover:shadow-md transition flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left"
        >
          <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-sm font-medium text-gray-800">Profil</span>
        </Link>
      </div>
    </div>
  );
}
