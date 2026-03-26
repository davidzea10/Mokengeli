import { useClientSession } from '../context/ClientSessionContext';
import { useTheme } from '../context/ThemeContext';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return String(iso);
  }
}

export function ProfilePage() {
  const { meContext, refreshMe, userDisplayName, selectedProfile } = useClientSession();
  const { isDark } = useTheme();
  const c = meContext?.client;

  const heading = isDark ? 'text-white' : 'text-gray-900';
  const sub = isDark ? 'text-neutral-400' : 'text-gray-500';
  const btn =
    isDark
      ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
      : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50';
  const cardShell = isDark ? 'border-white/10 bg-white/[0.06] shadow-none' : 'border-gray-200 bg-white shadow-sm';

  return (
    <div className="space-y-6 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className={`text-xl font-bold ${heading}`}>Mon profil</h1>
          <p className={`text-sm mt-1 ${sub}`}>Coordonnées enregistrées en banque.</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshMe()}
          className={`text-sm font-medium px-4 py-2 rounded-lg border ${btn}`}
        >
          Actualiser
        </button>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${cardShell}`}>
        <div className="bg-gradient-to-r from-rb-black to-rb-black-muted px-5 py-6 text-white">
          <p className="text-sm text-neutral-400">Titulaire</p>
          <p className="text-xl font-semibold text-rb-yellow-bright">{userDisplayName}</p>
          <p className="text-xs text-neutral-400 mt-2 font-mono">Réf. client {selectedProfile}</p>
        </div>
        <dl className={`divide-y divide-gray-100 ${isDark ? 'bg-white' : ''}`}>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <dt className="text-sm text-gray-500">E-mail</dt>
            <dd className="sm:col-span-2 text-sm font-medium text-gray-900">{c?.email ?? '—'}</dd>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <dt className="text-sm text-gray-500">Téléphone</dt>
            <dd className="sm:col-span-2 text-sm font-medium text-gray-900">{c?.telephone ?? '—'}</dd>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <dt className="text-sm text-gray-500">Adresse</dt>
            <dd className="sm:col-span-2 text-sm font-medium text-gray-900">
              {[c?.adresse_physique, c?.ville, c?.pays].filter(Boolean).join(', ') || '—'}
            </dd>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <dt className="text-sm text-gray-500">Client depuis</dt>
            <dd className="sm:col-span-2 text-sm text-gray-700">{formatDate(c?.date_creation)}</dd>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1">
            <dt className="text-sm text-gray-500">Dernière mise à jour</dt>
            <dd className="sm:col-span-2 text-sm text-gray-700">{formatDate(c?.date_mise_a_jour)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
