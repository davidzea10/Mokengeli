import { useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLogo } from '../components/AppLogo';
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

  return (
    <div
      className={`relative flex min-h-screen min-h-[100dvh] overflow-hidden safe-area-pad ${
        isDark ? 'bg-mk-ink text-white' : 'bg-mk-page text-mk-ink'
      }`}
    >
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 80% 60% at 15% 20%, rgba(37,99,235,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(59,130,246,0.2), transparent 50%), linear-gradient(160deg, #070b14 0%, #0b1220 45%, #111827 100%)'
            : 'radial-gradient(ellipse 90% 70% at 10% 0%, rgba(37,99,235,0.18), transparent 50%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(59,130,246,0.12), transparent 45%), linear-gradient(165deg, #eff6ff 0%, #f1f5f9 40%, #ffffff 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <button
        type="button"
        onClick={toggleTheme}
        className={`absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-2xl border backdrop-blur-md transition sm:right-8 sm:top-8 ${
          isDark
            ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
            : 'border-slate-200/80 bg-white/80 text-slate-800 hover:bg-white'
        }`}
        title={isDark ? 'Thème clair' : 'Thème sombre'}
        aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      >
        {isDark ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-center gap-10 px-5 py-12 lg:flex-row lg:items-center lg:gap-16 lg:px-10">
        {/* Brand hero */}
        <div className="animate-slide-up flex-1 text-center lg:text-left">
          <AppLogo
            variant="login"
            className="mx-auto mb-6 h-28 w-auto max-w-[220px] object-contain drop-shadow-lg sm:h-36 lg:mx-0 lg:h-40"
          />
          <p className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            <span className={isDark ? 'text-white' : 'text-mk-ink'}>Mokengeli</span>
          </p>
          <p
            className={`mx-auto mt-4 max-w-md text-base leading-relaxed sm:text-lg lg:mx-0 ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            Portail bancaire sécurisé — paiements protégés par intelligence anti-fraude en temps réel.
          </p>
        </div>

        {/* Form */}
        <div className="animate-scale-in w-full max-w-md shrink-0 lg:ml-auto">
          <div
            className={`rounded-3xl border p-6 shadow-2xl backdrop-blur-xl sm:p-8 ${
              isDark
                ? 'border-white/10 bg-white/[0.06] shadow-black/40'
                : 'border-white/70 bg-white/90 shadow-slate-300/40'
            }`}
          >
            <h1
              className={`font-display text-2xl font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-mk-ink'
              }`}
            >
              Connexion
            </h1>
            <p className={`mt-1.5 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Référence client, e-mail ou téléphone, et votre mot de passe.
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <div>
                <label
                  htmlFor="client-login-nom"
                  className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                >
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
                  className={`w-full rounded-2xl border px-4 py-3.5 outline-none transition focus:ring-2 focus:ring-mk-blue/30 ${
                    isDark
                      ? 'border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus:border-mk-blue'
                      : 'border-slate-200 bg-white text-mk-ink placeholder:text-slate-400 focus:border-mk-blue'
                  }`}
                  placeholder="Référence, e-mail ou téléphone"
                />
              </div>
              <div>
                <label
                  htmlFor="client-login-password"
                  className={`mb-1.5 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                >
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
                  className={`w-full rounded-2xl border px-4 py-3.5 outline-none transition focus:ring-2 focus:ring-mk-blue/30 ${
                    isDark
                      ? 'border-white/15 bg-white/5 text-white placeholder:text-slate-500 focus:border-mk-blue'
                      : 'border-slate-200 bg-white text-mk-ink placeholder:text-slate-400 focus:border-mk-blue'
                  }`}
                  placeholder="••••••••"
                />
              </div>

              {loginError && (
                <p className="rounded-xl bg-red-500/10 px-3 py-2.5 text-sm text-red-600" role="alert">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full rounded-2xl bg-mk-blue py-3.5 text-base font-semibold text-white shadow-lg shadow-mk-blue/30 transition hover:bg-mk-blue-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loginSubmitting ? 'Connexion…' : 'Accéder à mon espace'}
              </button>
            </form>
          </div>
          <p className={`mt-6 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Mokengeli — plateforme anti-fraude
          </p>
        </div>
      </div>
    </div>
  );
}
