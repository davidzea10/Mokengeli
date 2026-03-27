import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { fetchNotificationsUnreadCount, isApiConfigured } from '../api';
import { AppLogo } from '../components/AppLogo';
import { useClientSession } from '../context/ClientSessionContext';
import { useTheme } from '../context/ThemeContext';

export type BankOutletContext = {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
};

function NavIcon({ children }: { children: React.ReactNode }) {
  return <span className="flex h-5 w-5 items-center justify-center sm:h-[22px] sm:w-[22px]">{children}</span>;
}

export function BankLayout() {
  const { userDisplayName, handleLogout, selectedProfile } = useClientSession();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!selectedProfile || !isApiConfigured()) {
      setUnreadCount(0);
      return;
    }
    const r = await fetchNotificationsUnreadCount(selectedProfile);
    if (r.ok) {
      setUnreadCount(r.count);
    }
  }, [selectedProfile]);

  useEffect(() => {
    void refreshUnread();
  }, [selectedProfile, location.pathname, refreshUnread]);

  useEffect(() => {
    if (!selectedProfile || !isApiConfigured()) return;
    const t = window.setInterval(() => void refreshUnread(), 22000);
    return () => window.clearInterval(t);
  }, [selectedProfile, refreshUnread]);

  useEffect(() => {
    const onRefresh = () => void refreshUnread();
    window.addEventListener('mokengeli-refresh-notifications', onRefresh);
    return () => window.removeEventListener('mokengeli-refresh-notifications', onRefresh);
  }, [refreshUnread]);

  const outletCtx: BankOutletContext = { unreadCount, refreshUnread };

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 transition-colors touch-manipulation ${
      isActive
        ? 'text-rb-yellow'
        : isDark
          ? 'text-neutral-500 hover:text-neutral-300'
          : 'text-gray-500 hover:text-gray-800'
    }`;

  const shellBg = isDark ? 'bg-[#0c0c0e]' : 'bg-rb-page';
  const headerBar = isDark
    ? 'border-white/5 bg-[#0c0c0e]/95 backdrop-blur-md'
    : 'border-gray-200/90 bg-white/95 shadow-sm backdrop-blur-md';
  const navBar = isDark
    ? 'border-white/5 bg-[#0c0c0e]/98 backdrop-blur-lg'
    : 'border-gray-200 bg-white/98 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] backdrop-blur-lg';
  const titleSub = isDark ? 'text-neutral-500' : 'text-gray-500';
  const chip = isDark
    ? 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10'
    : 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100';
  const iconBtn = isDark
    ? 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10'
    : 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100';
  const logoutBtn = isDark
    ? 'bg-white/10 text-white/90 hover:bg-white/15'
    : 'bg-gray-900 text-white hover:bg-gray-800';

  return (
    <div
      className={`flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden ${shellBg} safe-area-pad`}
    >
      <header className={`sticky top-0 z-40 shrink-0 border-b ${headerBar}`}>
        <div className="mx-auto flex h-11 max-w-lg items-center justify-between gap-1.5 px-3 sm:h-12 sm:max-w-4xl sm:gap-2 sm:px-4">
          <Link
            to="/app/accueil"
            className="flex min-w-0 flex-1 items-center gap-2"
            title="Accueil"
          >
            <AppLogo
              variant="header"
              className="h-8 w-auto max-w-[min(220px,52vw)] shrink object-contain object-left sm:h-9"
            />
            <span className={`hidden max-w-[7rem] truncate text-[10px] leading-tight sm:inline ${titleSub}`}>
              Espace client
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${iconBtn}`}
              title={isDark ? 'Passer au thème clair' : 'Passer au thème sombre'}
              aria-label={isDark ? 'Thème clair' : 'Thème sombre'}
            >
              {isDark ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
            <NavLink
              to="/app/historique"
              className={({ isActive }) =>
                `inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border px-2 text-[11px] font-medium sm:px-2.5 sm:text-xs ${
                  isActive
                    ? isDark
                      ? 'border-rb-yellow/70 bg-rb-yellow/15 text-rb-yellow'
                      : 'border-rb-yellow/70 bg-rb-yellow/10 text-gray-900'
                    : chip
                }`
              }
              title="Historique des opérations"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Historique</span>
            </NavLink>
            <Link
              to="/app/profil"
              className={`hidden max-w-[100px] truncate rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-block sm:max-w-[160px] sm:text-xs ${chip}`}
              title={selectedProfile}
            >
              {userDisplayName}
            </Link>
            <Link
              to="/app/profil"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border sm:hidden ${chip}`}
              aria-label="Mon compte"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium sm:px-3 sm:text-xs ${logoutBtn}`}
            >
              Sortir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden sm:max-w-4xl">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-3 pb-[calc(4.25rem+env(safe-area-inset-bottom))] [scrollbar-gutter:stable] sm:px-4 sm:py-5">
          <Outlet context={outletCtx} />
        </div>
      </main>

      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 border-t ${navBar} pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1`}
        aria-label="Navigation principale"
      >
        <div className="mx-auto flex max-w-lg items-end justify-between gap-0.5 px-1 sm:max-w-4xl sm:px-2">
          <NavLink to="/app/accueil" className={itemClass} end>
            {({ isActive }) => (
              <>
                <span
                  className={`absolute top-0 h-0.5 w-8 rounded-full transition-opacity ${isActive ? 'bg-rb-yellow opacity-100' : 'opacity-0'}`}
                />
                <NavIcon>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </NavIcon>
                <span className="max-w-[4.5rem] truncate text-[9px] font-medium leading-none sm:text-[10px]">Accueil</span>
              </>
            )}
          </NavLink>
          <NavLink to="/app/notifications" className={itemClass}>
            {({ isActive }) => (
              <>
                <span
                  className={`absolute top-0 h-0.5 w-8 rounded-full transition-opacity ${isActive ? 'bg-rb-yellow opacity-100' : 'opacity-0'}`}
                />
                <span className="relative">
                  <NavIcon>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </NavIcon>
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex min-h-[1rem] min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-[4.5rem] truncate text-[9px] font-medium leading-none sm:text-[10px]">Notif.</span>
              </>
            )}
          </NavLink>
          <NavLink to="/app/comptes" className={itemClass}>
            {({ isActive }) => (
              <>
                <span
                  className={`absolute top-0 h-0.5 w-8 rounded-full transition-opacity ${isActive ? 'bg-rb-yellow opacity-100' : 'opacity-0'}`}
                />
                <NavIcon>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </NavIcon>
                <span className="max-w-[4.5rem] truncate text-[9px] font-medium leading-none sm:text-[10px]">Comptes</span>
              </>
            )}
          </NavLink>
          <NavLink to="/app/operations" className={itemClass}>
            {({ isActive }) => (
              <>
                <span
                  className={`absolute top-0 h-0.5 w-10 rounded-full transition-opacity ${isActive ? 'bg-rb-yellow opacity-100' : 'opacity-0'}`}
                />
                <span
                  className={`mb-0.5 flex h-9 w-9 items-center justify-center rounded-2xl shadow-md transition-transform active:scale-95 sm:h-10 sm:w-10 ${
                    isActive
                      ? 'bg-rb-yellow text-rb-black'
                      : isDark
                        ? 'bg-white/10 text-white/80'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                <span className="max-w-[4.5rem] truncate text-[9px] font-semibold leading-none sm:text-[10px]">Opération</span>
              </>
            )}
          </NavLink>
          <NavLink to="/app/cartes" className={itemClass}>
            {({ isActive }) => (
              <>
                <span
                  className={`absolute top-0 h-0.5 w-8 rounded-full transition-opacity ${isActive ? 'bg-rb-yellow opacity-100' : 'opacity-0'}`}
                />
                <NavIcon>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </NavIcon>
                <span className="max-w-[4.5rem] truncate text-[9px] font-medium leading-none sm:text-[10px]">Cartes</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
