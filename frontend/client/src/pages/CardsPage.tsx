import { useMemo } from 'react';
import type { CarteData } from '../api';
import { useClientSession } from '../context/ClientSessionContext';

function formatExp(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function CardsPage() {
  const { meContext } = useClientSession();

  const flat = useMemo(() => {
    if (!meContext?.comptes?.length) return [];
    const out: { carte: CarteData; compteLabel: string; numeroCompte: string }[] = [];
    for (const c of meContext.comptes) {
      for (const card of c.cartes || []) {
        out.push({
          carte: card,
          compteLabel: c.libelle || 'Compte',
          numeroCompte: c.numero_compte,
        });
      }
    }
    return out;
  }, [meContext]);

  if (!flat.length) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-gray-900">Mes cartes</h1>
        <div className="rounded-xl bg-white p-6 shadow-sm text-center text-gray-600 text-sm">
          Aucune carte enregistrée sur vos comptes pour le moment.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mes cartes</h1>
        <p className="text-sm text-gray-500 mt-1">Cartes associées à vos comptes (numéros masqués).</p>
      </div>

      <div className="space-y-4">
        {flat.map(({ carte, compteLabel, numeroCompte }) => (
          <article
            key={carte.carte_id}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rb-black via-rb-black-muted to-gray-900 text-white p-5 sm:p-6 shadow-xl ring-1 ring-white/10"
          >
            <div className="absolute top-3 right-3 opacity-20">
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 10h18v4H3v-4zm0-4h18v2H3V6zm0 8h12v2H3v-2z" />
              </svg>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400">Carte bancaire</p>
            <p className="mt-4 font-mono text-lg sm:text-xl tracking-widest">{carte.numero_affiche}</p>
            <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
              <div>
                <p className="text-neutral-400 text-xs">Type</p>
                <p className="font-medium">{carte.type_carte || '—'}</p>
              </div>
              <div>
                <p className="text-neutral-400 text-xs">Expire fin</p>
                <p className="font-medium">{formatExp(carte.date_expiration)}</p>
              </div>
              <div>
                <p className="text-neutral-400 text-xs">Statut</p>
                <p className="font-medium capitalize">{carte.statut || '—'}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-neutral-400 border-t border-white/10 pt-3">
              Compte : {compteLabel} · {numeroCompte.slice(-8)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
