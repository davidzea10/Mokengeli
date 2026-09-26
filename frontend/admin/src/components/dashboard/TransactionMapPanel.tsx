import { useMemo, useRef } from 'react';
import Map, {
  Layer,
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
  type MapRef,
} from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import type { Transaction } from '../../types';
import { MAP_STYLE_LIGHT, RDC_INITIAL_VIEW } from '../../constants/rdcMap';
import { MAP_DEMO_SEPT_20_2026 } from '../../data/mapDemoSept20';

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

function isFraud(tx: Transaction) {
  return Boolean(tx.target_labels?.cible_fraude);
}

function getRoute(tx: Transaction) {
  const m = tx.transaction_event.metadata;
  if (m.route?.sender && m.route?.receiver) return m.route;
  if (
    m.latitude_debit != null &&
    m.longitude_debit != null &&
    m.latitude_credit != null &&
    m.longitude_credit != null
  ) {
    return {
      sender: {
        lat: Number(m.latitude_debit),
        lng: Number(m.longitude_debit),
        label: 'Émetteur',
        city: '',
        countryCode: 'CD',
      },
      receiver: {
        lat: Number(m.latitude_credit),
        lng: Number(m.longitude_credit),
        label: 'Bénéficiaire',
        city: '',
        countryCode: 'CD',
      },
    };
  }
  return null;
}

/**
 * Carte des flux + 10 transactions démo du 20/09/2026 (2 fraudes en rouge).
 */
export function TransactionMapPanel({ transactions, onNavigateToTransaction }: TransactionMapPanelProps) {
  const mapRef = useRef<MapRef>(null);

  const displayList = useMemo(() => {
    const demoNums = new Set(
      MAP_DEMO_SEPT_20_2026.map((t) => t.transaction_event.metadata.numero_transaction),
    );
    const rest = transactions.filter(
      (t) => !demoNums.has(t.transaction_event.metadata.numero_transaction),
    );
    return [...MAP_DEMO_SEPT_20_2026, ...rest];
  }, [transactions]);

  const lineGeoJson = useMemo(() => {
    const features = displayList
      .map((tx) => {
        const route = getRoute(tx);
        if (!route) return null;
        const fraud = isFraud(tx);
        return {
          type: 'Feature' as const,
          properties: {
            fraud,
            numero: tx.transaction_event.metadata.numero_transaction,
            color: fraud ? '#dc2626' : '#2563eb',
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [route.sender.lng, route.sender.lat],
              [route.receiver.lng, route.receiver.lat],
            ],
          },
        };
      })
      .filter(Boolean);

    return { type: 'FeatureCollection' as const, features };
  }, [displayList]);

  const markers = useMemo(() => {
    const out: {
      key: string;
      lng: number;
      lat: number;
      fraud: boolean;
      role: string;
      numero: string;
    }[] = [];
    for (const tx of displayList) {
      const route = getRoute(tx);
      if (!route) continue;
      const fraud = isFraud(tx);
      const numero = tx.transaction_event.metadata.numero_transaction;
      out.push({
        key: `${numero}-s`,
        lng: route.sender.lng,
        lat: route.sender.lat,
        fraud,
        role: 'Émetteur',
        numero,
      });
      out.push({
        key: `${numero}-r`,
        lng: route.receiver.lng,
        lat: route.receiver.lat,
        fraud,
        role: 'Bénéficiaire',
        numero,
      });
    }
    return out;
  }, [displayList]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-neutral-200/90 bg-white px-4 py-3 text-sm text-neutral-600 shadow-sm">
        <p className="font-medium text-neutral-900">Carte des flux — 20 septembre 2026</p>
        <p className="mt-1 text-xs text-neutral-500">
          10 transactions simulées (2 frauduleuses en{' '}
          <span className="font-semibold text-red-600">rouge</span>, flux normaux en{' '}
          <span className="font-semibold text-mk-blue">bleu</span>).
        </p>
      </div>

      <div className="flex min-h-0 flex-col gap-4 lg:flex-row lg:items-stretch">
        <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-neutral-200/90 bg-white shadow-sm lg:max-w-sm lg:min-w-[min(100%,20rem)]">
          <div className="border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">Transactions</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {displayList.length} affichée{displayList.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="max-h-[min(50vh,420px)] flex-1 overflow-y-auto p-2 lg:max-h-[min(70vh,560px)]">
            {displayList.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-neutral-500">Aucune transaction à afficher.</p>
            ) : (
              <ul className="space-y-1">
                {displayList.map((tx, i) => {
                  const m = tx.transaction_event.metadata;
                  const fraud = isFraud(tx);
                  const risk = tx._api?.riskPercent;
                  const numero = m.numero_transaction?.trim() || '—';
                  return (
                    <li key={tx._api?.id ?? `${numero}-${i}`}>
                      <button
                        type="button"
                        onClick={() => onNavigateToTransaction(numero)}
                        className={`flex w-full flex-col gap-1 rounded-xl border px-3 py-2.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-blue ${
                          fraud
                            ? 'border-red-200 bg-red-50/70 hover:border-red-300 hover:bg-red-50'
                            : 'border-transparent hover:border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="break-all font-mono text-xs font-medium text-neutral-900">{numero}</span>
                          {fraud ? (
                            <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                              Fraude
                            </span>
                          ) : risk != null ? (
                            <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900">
                              {risk}%
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                              Normal
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
            <Source id="flux-lines" type="geojson" data={lineGeoJson}>
              <Layer
                id="flux-lines-layer"
                type="line"
                paint={{
                  'line-color': ['get', 'color'],
                  'line-width': 3,
                  'line-opacity': 0.85,
                }}
              />
            </Source>
            {markers.map((m) => (
              <Marker key={m.key} longitude={m.lng} latitude={m.lat} anchor="center">
                <button
                  type="button"
                  title={`${m.role} · ${m.numero}`}
                  onClick={() => onNavigateToTransaction(m.numero)}
                  className={`h-3.5 w-3.5 rounded-full border-2 border-white shadow ${
                    m.fraud ? 'bg-red-600' : 'bg-mk-blue'
                  }`}
                />
              </Marker>
            ))}
            <NavigationControl position="top-right" showCompass={false} />
            <ScaleControl position="bottom-left" unit="metric" />
          </Map>
        </div>
      </div>
    </div>
  );
}
