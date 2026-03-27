import { useRef } from 'react';
import Map, { NavigationControl, ScaleControl, type MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import type { Transaction } from '../../types';
import { MAP_STYLE_LIGHT, RDC_INITIAL_VIEW } from '../../constants/rdcMap';

interface TransactionMapPanelProps {
  transactions: Transaction[];
  onNavigateToTransaction: (numero: string) => void;
}

const moneyFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Liste des transactions + carte RDC (tracés carte plus tard via `transaction_event`, ex. `metadata.route`).
 */
export function TransactionMapPanel({ transactions, onNavigateToTransaction }: TransactionMapPanelProps) {
  const mapRef = useRef<MapRef>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-neutral-200/90 bg-white px-4 py-3 text-sm text-neutral-600 shadow-sm">
        <p className="font-medium text-neutral-900">Carte des flux</p>
        <p className="mt-1 text-xs text-neutral-500">
          Sélectionnez une transaction dans la liste — l’affichage sur la carte viendra des événements{' '}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-[11px]">transaction_event</code> (ex.{' '}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-[11px]">metadata.route</code>).
        </p>
      </div>

      <div className="flex min-h-0 flex-col gap-4 lg:flex-row lg:items-stretch">
        <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-neutral-200/90 bg-white shadow-sm lg:max-w-sm lg:min-w-[min(100%,20rem)]">
          <div className="border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">Transactions</h2>
            <p className="mt-0.5 text-xs text-neutral-500">{transactions.length} chargée{transactions.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="max-h-[min(50vh,420px)] flex-1 overflow-y-auto p-2 lg:max-h-[min(70vh,560px)]">
            {transactions.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-neutral-500">Aucune transaction à afficher.</p>
            ) : (
              <ul className="space-y-1">
                {transactions.map((tx, i) => {
                  const m = tx.transaction_event.metadata;
                  const risk = tx._api?.riskPercent;
                  const numero = m.numero_transaction?.trim() || '—';
                  return (
                    <li key={tx._api?.id ?? `${numero}-${i}`}>
                      <button
                        type="button"
                        onClick={() => onNavigateToTransaction(numero)}
                        className="flex w-full flex-col gap-1 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm transition hover:border-neutral-200 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rb-yellow"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-xs font-medium text-neutral-900 break-all">{numero}</span>
                          {risk != null && (
                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                              {risk}%
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 text-xs text-neutral-600">
                          <span className="font-medium text-neutral-800">
                            {moneyFmt.format(m.montant)} {m.devise || ''}
                          </span>
                          <span className="text-neutral-400">·</span>
                          <span>{m.canal || '—'}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500">{formatDate(m.date_transaction)}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <div className="relative min-h-[min(50vh,420px)] min-w-0 flex-1 overflow-hidden rounded-2xl border border-neutral-200/90 bg-gradient-to-br from-slate-50 to-white shadow-inner lg:min-h-[min(70vh,560px)]">
          <Map
            ref={mapRef}
            mapLib={maplibregl}
            mapStyle={MAP_STYLE_LIGHT}
            initialViewState={RDC_INITIAL_VIEW}
            style={{ width: '100%', height: '100%', minHeight: 'min(50vh, 420px)' }}
            attributionControl={{ compact: true }}
            reuseMaps
            onLoad={(e) => {
              e.target.resize();
            }}
          >
            <NavigationControl position="top-right" showCompass={false} />
            <ScaleControl position="bottom-left" unit="metric" />
          </Map>
        </div>
      </div>
    </div>
  );
}
  