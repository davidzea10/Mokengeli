import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  fetchNotificationsList,
  postNotificationsReadAll,
  isApiConfigured,
  type NotificationRow,
} from '../api';
import { useClientSession } from '../context/ClientSessionContext';
import { useTheme } from '../context/ThemeContext';
import type { BankOutletContext } from '../layouts/BankLayout';

function formatDate(iso: string | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function NotificationsPage() {
  const { selectedProfile } = useClientSession();
  const { isDark } = useTheme();
  const { refreshUnread } = useOutletContext<BankOutletContext>();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const ordered = useMemo(() => [...items].reverse(), [items]);

  const load = useCallback(async () => {
    if (!selectedProfile || !isApiConfigured()) {
      setLoading(false);
      setItems([]);
      return;
    }
    setError('');
    setLoading(true);
    const res = await fetchNotificationsList(selectedProfile);
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setItems(res.notifications);
  }, [selectedProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ordered.length]);

  const handleMarkAllRead = async () => {
    if (!selectedProfile || !isApiConfigured()) return;
    const res = await postNotificationsReadAll(selectedProfile);
    if (res.ok) {
      setItems((prev) => prev.map((n) => ({ ...n, lu: true })));
      await refreshUnread();
    }
  };

  const shell = isDark ? 'text-neutral-200' : 'text-gray-900';
  const sub = isDark ? 'text-neutral-500' : 'text-gray-500';
  const bubbleOut =
    isDark
      ? 'bg-rb-yellow/20 border border-rb-yellow/40 text-white'
      : 'bg-rb-yellow/15 border border-rb-yellow/50 text-gray-900';
  const bubbleIn =
    isDark
      ? 'bg-white/8 border border-white/10 text-neutral-100'
      : 'bg-white border border-gray-200 text-gray-900 shadow-sm';

  if (!isApiConfigured()) {
    return (
      <div className={`space-y-2 ${shell}`}>
        <h1 className="text-lg font-semibold tracking-tight">Notifications</h1>
        <p className={`text-sm ${sub}`}>
          Configurez VITE_API_BASE_URL pour charger les messages liés aux virements.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${shell}`}>
      <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Notifications</h1>
          <p className={`text-xs ${sub}`}>Messages automatiques après chaque virement accepté.</p>
        </div>
        {items.some((n) => !n.lu) ? (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ${
              isDark
                ? 'bg-white/10 text-white hover:bg-white/15'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            Tout marquer lu
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className={`text-sm ${sub}`}>Chargement…</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : ordered.length === 0 ? (
        <div
          className={`flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-12 text-center ${
            isDark ? 'border-white/15 bg-white/[0.03]' : 'border-gray-200 bg-gray-50/80'
          }`}
        >
          <p className={`text-sm font-medium ${shell}`}>Aucun message pour l’instant</p>
          <p className={`mt-1 max-w-xs text-xs ${sub}`}>
            Après un virement validé par le moteur, vous et le destinataire verrez le détail ici.
          </p>
        </div>
      ) : (
        <div
          className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl px-1 py-2 ${
            isDark ? 'bg-[#121214]' : 'bg-gray-100/90'
          }`}
        >
          {ordered.map((n) => {
            const p = n.payload || {};
            const isSent = n.kind === 'transfer_sent';
            return (
              <div
                key={n.id}
                className={`flex w-full ${isSent ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[min(100%,20rem)] rounded-2xl px-3.5 py-3 text-left text-[13px] leading-snug sm:max-w-md ${
                    isSent ? bubbleOut : bubbleIn
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {!n.lu ? (
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full bg-sky-500"
                        title="Non lu"
                      />
                    ) : null}
                    <span className="font-semibold">{p.titre || 'Notification'}</span>
                  </div>
                  <p className={`mb-2 text-lg font-bold tabular-nums ${isDark ? 'text-rb-yellow' : 'text-rb-black'}`}>
                    {p.montant_libelle ?? `${p.montant ?? ''} ${p.devise ?? ''}`}
                  </p>
                  <dl className="space-y-1 text-[12px] opacity-95">
                    <div className="flex justify-between gap-3">
                      <dt className={sub}>Réf. transaction</dt>
                      <dd className="max-w-[12rem] truncate text-right font-mono text-[11px]">
                        {p.numero_transaction ?? '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className={sub}>{isSent ? 'Vers' : 'De'}</dt>
                      <dd className="text-right">
                        <span className="font-medium">{p.contrepartie_nom ?? '—'}</span>
                        {p.contrepartie_compte ? (
                          <span className={`mt-0.5 block text-[11px] font-mono ${sub}`}>
                            {p.contrepartie_compte}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className={sub}>Votre compte</dt>
                      <dd className="text-right">
                        <span className="font-mono text-[11px]">{p.mon_compte_numero ?? '—'}</span>
                        {p.mon_compte_libelle ? (
                          <span className={`mt-0.5 block text-[11px] ${sub}`}>{p.mon_compte_libelle}</span>
                        ) : null}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-black/5 pt-2 dark:border-white/10">
                      <dt className={sub}>Solde total après opération</dt>
                      <dd className="text-right font-semibold tabular-nums">
                        {p.solde_total_libelle ?? '—'}
                      </dd>
                    </div>
                    <div className={`pt-1 text-[10px] ${sub}`}>{formatDate(p.date_iso)}</div>
                  </dl>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
