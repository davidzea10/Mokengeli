import { useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientSession } from '../context/ClientSessionContext';
import { useTheme } from '../context/ThemeContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const {
    loginSubmitting,
    loginError,
    loginNom,
    setLoginNom,
    loginPassword,
    setLoginPassword,
    setLoginError,
    handleLoginSubmit,
    isLoggedIn,
  } = useClientSession();

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/app/accueil', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    void handleLoginSubmit(e);
  };

  const shell =
    isDark
      ? 'bg-gradient-to-br from-rb-black via-rb-black-soft to-rb-black'
      : 'bg-gradient-to-br from-rb-page via-white to-rb-yellow-muted/40';

  return (
    <div
      className={`relative flex min-h-screen min-h-[100dvh] items-center justify-center p-4 sm:p-8 safe-area-pad ${shell}`}
    >
      <button
        type="button"
        onClick={toggleTheme}
        className={`absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition sm:right-6 sm:top-6 ${
          isDark
            ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
            : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
        }`}
        title={isDark ? 'Thème clair' : 'Thème sombre'}
        aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      >
        {isDark ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>
      <div className="max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rb-yellow flex items-center justify-center mx-auto mb-4 shadow-xl shadow-rb-yellow/20">
            <svg className="w-12 h-12 text-rb-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>MOKENGELI</h1>
          <p className={`text-sm sm:text-base px-2 ${isDark ? 'text-neutral-300' : 'text-gray-600'}`}>
            Espace client sécurisé
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Connexion</h2>
          <p className="text-sm text-gray-500 mb-6">
            Référence client, e-mail ou numéro de téléphone, et votre mot de passe.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="client-login-nom" className="block text-sm font-medium text-gray-700 mb-1">
                Identifiant
              </label>
              <input
                id="client-login-nom"
                name="identifiant"
                type="text"
                autoComplete="username"
                value={loginNom}
                onChange={(e) => {
                  setLoginNom(e.target.value);
                  setLoginError('');
                }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-rb-yellow focus:ring-2 focus:ring-rb-yellow/25"
                placeholder="Référence client, e-mail ou téléphone"
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
              disabled={loginSubmitting}
              className="w-full rounded-xl bg-rb-yellow py-3 text-base font-semibold text-rb-black shadow-md transition hover:bg-rb-yellow-dark active:bg-rb-yellow-dark disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loginSubmitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className={`text-center text-sm mt-6 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
          MOKENGELI — RawBank Hackathon 2026
        </p>
      </div>
    </div>
  );
}
