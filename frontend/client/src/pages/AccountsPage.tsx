import { useClientSession } from '../context/ClientSessionContext';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function AccountsPage() {
  const { meContext } = useClientSession();

  if (!meContext?.comptes?.length) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm text-center text-gray-600 text-sm">
        Aucun compte à afficher. Vérifiez vos données en banque.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mes comptes</h1>
        <p className="text-sm text-gray-500 mt-1">Comptes rattachés à votre profil (données en ligne).</p>
      </div>

      {meContext.comptes.map((c) => (
        <article
          key={c.compte_id}
          className={`rounded-2xl border p-5 shadow-sm ${
            c.est_compte_principal ? 'border-rb-yellow bg-gradient-to-br from-white to-amber-50/40' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              {c.est_compte_principal && (
                <span className="inline-block text-[10px] uppercase tracking-wide font-semibold text-rb-black bg-rb-yellow px-2 py-0.5 rounded-full mb-2">
                  Compte principal
                </span>
              )}
              <h2 className="text-lg font-semibold text-gray-900">{c.libelle || 'Compte'}</h2>
              <p className="text-xs text-gray-500 font-mono mt-1 break-all">{c.numero_compte}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Solde disponible</p>
              <p className="text-xl font-bold tabular-nums text-gray-900">
                {(c.solde_disponible ?? 0).toLocaleString('fr-FR')} <span className="text-sm font-medium text-gray-500">{c.devise}</span>
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-4">
            <div>
              <dt className="text-gray-500">Devise</dt>
              <dd className="font-medium text-gray-900">{c.devise}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ouverture</dt>
              <dd className="font-medium text-gray-900">{formatDate(c.date_ouverture)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Cartes liées</dt>
              <dd className="font-medium text-gray-900">
                {c.cartes?.length ? `${c.cartes.length} carte(s) — voir l’onglet Cartes` : 'Aucune carte liée'}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
