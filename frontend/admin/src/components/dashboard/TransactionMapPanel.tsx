import { useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  Layer,
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection, LineString } from 'geojson';
import type { Transaction } from '../../types';
import { haversineKm, transactionRoutePath } from '../../utils/geo';
import { MAP_STYLE_LIGHT, RDC_INITIAL_VIEW } from '../../constants/rdcMap';

/** Simulation d’affichage flux : intervalle entre chaque trace, pause avant de reboucler */
const STREAM_TICK_MS = 550;
const STREAM_START_DELAY_MS = 400;

function txRoute(tx: Transaction) {
  return tx.transaction_event.metadata.route;
}

function lngLatBounds(
  points: { lat: number; lng: number }[]
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const p of points) {
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
  }
  const padLng = Math.max((maxLng - minLng) * 0.14, 0.2);
  const padLat = Math.max((maxLat - minLat) * 0.14, 0.2);
  return [
    [minLng - padLng, minLat - padLat],
    [maxLng + padLng, maxLat + padLat],
  ];
}

/** 1 = fraude, 0 = valide — pour expressions MapLibre */
function txLineFeature(tx: Transaction): GeoJSON.Feature<LineString> {
  const r = txRoute(tx)!;
  const coords = transactionRoutePath(r.sender, r.receiver, 128).map(([lat, lng]) => [lng, lat] as [number, number]);
  const fraud = tx.target_labels.cible_fraude ? 1 : 0;
  const numero = tx.transaction_event.metadata.numero_transaction;
  return {
    type: 'Feature',
    properties: { fraud, type: tx.transaction_event.metadata.type_transaction, numero },
    geometry: { type: 'LineString', coordinates: coords },
  };
}

/** Couleur principale (cœur du trait) */
const LINE_COLOR_MAIN: maplibregl.DataDrivenPropertyValueSpecification<string> = [
  'case',
  ['==', ['get', 'fraud'], 1],
  '#e11d48',
  '#0f766e',
];

/** Halo / lueur (même teinte, plus clair pour le flou) */
const LINE_COLOR_GLOW: maplibregl.DataDrivenPropertyValueSpecification<string> = [
  'case',
  ['==', ['get', 'fraud'], 1],
  '#fda4af',
  '#5eead4',
];

const LINE_COLOR_CORE: maplibregl.DataDrivenPropertyValueSpecification<string> = [
  'case',
  ['==', ['get', 'fraud'], 1],
  '#fff1f2',
  '#ecfdf5',
];

interface TransactionMapPanelProps {
  transactions: Transaction[];
  onNavigateToTransaction: (numero: string) => void;
}

export function TransactionMapPanel({ transactions, onNavigateToTransaction }: TransactionMapPanelProps) {
  const mapRef = useRef<MapRef>(null);

  const allTypes = useMemo(
    () =>
      [...new Set(transactions.map((t) => t.transaction_event.metadata.type_transaction))].sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [transactions]
  );

  const [typeVisible, setTypeVisible] = useState<Record<string, boolean>>({});
  const [showTypeFilters, setShowTypeFilters] = useState(false);

  /** Toutes les transactions géolocalisées, dans l’ordre (avant filtre types et avant « stream »). */
  const baseWithRoute = useMemo(
    () => transactions.filter((t) => txRoute(t)),
    [transactions]
  );

  const [streamCount, setStreamCount] = useState(0);

  useEffect(() => {
    setStreamCount(0);
  }, [transactions]);

  useEffect(() => {
    const max = baseWithRoute.length;
    if (max === 0) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      timeouts.push(window.setTimeout(fn, ms));
    };

    let active = true;
    let current = 0;

    const step = () => {
      if (!active) return;
      current += 1;
      if (current <= max) {
        setStreamCount(current);
        if (current < max) {
          schedule(step, STREAM_TICK_MS);
        }
        /* On ne remet pas streamCount à 0 : toutes les traces déjà affichées restent visibles. */
      }
    };

    schedule(step, STREAM_START_DELAY_MS);
    return () => {
      active = false;
      timeouts.forEach(clearTimeout);
    };
  }, [baseWithRoute.length]);

  useEffect(() => {
    setTypeVisible((prev) => {
      const next = { ...prev };
      allTypes.forEach((t) => {
        if (next[t] === undefined) next[t] = true;
      });
      return next;
    });
  }, [allTypes]);

  const streamedWithRoute = useMemo(
    () => baseWithRoute.slice(0, streamCount),
    [baseWithRoute, streamCount]
  );

  const withRoute = useMemo(
    () =>
      streamedWithRoute.filter((t) => {
        const typ = t.transaction_event.metadata.type_transaction;
        return typeVisible[typ] !== false;
      }),
    [streamedWithRoute, typeVisible]
  );

  const [selectedNumero, setSelectedNumero] = useState<string | null>(null);
  const [globalView, setGlobalView] = useState(false);
  /** Si activé, chaque nouveau flux simulé sélectionne la dernière trace et cadrage carte. */
  const [followStream, setFollowStream] = useState(true);
  const prevStreamForFollowRef = useRef(0);

  useEffect(() => {
    if (withRoute.length === 0) {
      if (selectedNumero != null) setSelectedNumero(null);
      return;
    }
    if (followStream) return;
    if (!selectedNumero || !withRoute.some((t) => t.transaction_event.metadata.numero_transaction === selectedNumero)) {
      setSelectedNumero(withRoute[0].transaction_event.metadata.numero_transaction);
    }
  }, [withRoute, selectedNumero, followStream]);

  useEffect(() => {
    if (streamCount === 0) {
      prevStreamForFollowRef.current = 0;
      return;
    }
    if (!followStream) {
      prevStreamForFollowRef.current = streamCount;
      return;
    }
    if (streamCount > prevStreamForFollowRef.current && withRoute.length > 0) {
      const last = withRoute[withRoute.length - 1];
      setSelectedNumero(last.transaction_event.metadata.numero_transaction);
      setGlobalView(false);
    }
    prevStreamForFollowRef.current = streamCount;
  }, [streamCount, withRoute, followStream]);

  useEffect(() => {
    if (!selectedNumero) return;
    const el = document.querySelector<HTMLElement>(`[data-tx-item="${selectedNumero}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedNumero, streamCount]);

  const selectedTx = useMemo(
    () => withRoute.find((t) => t.transaction_event.metadata.numero_transaction === selectedNumero) ?? null,
    [withRoute, selectedNumero]
  );

  const fitBounds = useMemo(() => {
    if (globalView && withRoute.length > 0) {
      const pts: { lat: number; lng: number }[] = [];
      withRoute.forEach((tx) => {
        const r = txRoute(tx)!;
        pts.push(r.sender, r.receiver);
      });
      return lngLatBounds(pts);
    }
    if (selectedTx && txRoute(selectedTx)) {
      const r = txRoute(selectedTx)!;
      return lngLatBounds([r.sender, r.receiver]);
    }
    return null;
  }, [globalView, selectedTx, withRoute]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !fitBounds) return;

    const apply = () => {
      try {
        map.resize();
        map.fitBounds(fitBounds, {
          padding: globalView
            ? { top: 56, bottom: 56, left: 56, right: 56 }
            : { top: 72, bottom: 72, left: 72, right: 72 },
          duration: globalView ? 900 : 1100,
          maxZoom: globalView ? 6.5 : 11.2,
          essential: true,
        });
      } catch {
        /* ignore */
      }
    };

    const t = window.setTimeout(() => {
      map.resize();
      map.once('idle', apply);
    }, 120);

    return () => window.clearTimeout(t);
  }, [fitBounds, globalView, selectedNumero, streamCount]);

  const allLinesFc = useMemo((): FeatureCollection => {
    return {
      type: 'FeatureCollection',
      features: withRoute.map((tx) => txLineFeature(tx)),
    };
  }, [withRoute]);

  /** En vue Détail : autres flux déjà arrivés, en fond (la sélection reste au premier plan). */
  const otherLinesFc = useMemo((): FeatureCollection => {
    if (!selectedNumero) {
      return { type: 'FeatureCollection', features: [] };
    }
    return {
      type: 'FeatureCollection',
      features: withRoute
        .filter((t) => t.transaction_event.metadata.numero_transaction !== selectedNumero)
        .map((tx) => txLineFeature(tx)),
    };
  }, [withRoute, selectedNumero]);

  const selectedFeature = useMemo(() => {
    if (!selectedTx || !txRoute(selectedTx)) return null;
    return txLineFeature(selectedTx);
  }, [selectedTx]);

  const emptyLineFeature = useMemo(
    (): GeoJSON.Feature<LineString> => ({
      type: 'Feature',
      properties: { fraud: 0, numero: '' },
      geometry: { type: 'LineString', coordinates: [[0, 0], [0, 0]] },
    }),
    []
  );

  const selectedLineData = useMemo((): GeoJSON.Feature<LineString> => {
    return selectedFeature ?? emptyLineFeature;
  }, [selectedFeature, emptyLineFeature]);

  const distanceKm =
    selectedTx && txRoute(selectedTx)
      ? haversineKm(
          txRoute(selectedTx)!.sender.lat,
          txRoute(selectedTx)!.sender.lng,
          txRoute(selectedTx)!.receiver.lat,
          txRoute(selectedTx)!.receiver.lng
        )
      : null;

  const isFraudSelected = selectedTx?.target_labels.cible_fraude ?? false;

  const interactiveLayerIds = useMemo(
    () =>
      globalView
        ? (['all-lines-hit'] as const)
        : (['sel-hit', 'detail-other-hit'] as const),
    [globalView]
  );

  const handleTraceClick = (e: MapLayerMouseEvent) => {
    const map = e.target;
    let feat = e.features?.[0];
    if (!feat) {
      const layers = globalView
        ? (['all-lines-hit', 'all-lines-mid'] as const)
        : (['sel-hit', 'sel-mid', 'detail-other-hit', 'detail-other-mid'] as const);
      const hits = map.queryRenderedFeatures(e.point, { layers: [...layers] });
      feat = hits[0];
    }
    const raw = feat?.properties?.numero;
    const numero = raw != null && String(raw).trim() !== '' ? String(raw) : '';
    if (numero) onNavigateToTransaction(numero);
  };

  const handleMapMouseMove = (e: MapLayerMouseEvent) => {
    const map = e.target;
    const layers = globalView ? ['all-lines-hit'] : ['sel-hit', 'detail-other-hit'];
    const hits = map.queryRenderedFeatures(e.point, { layers });
    map.getCanvas().style.cursor = hits.length > 0 ? 'pointer' : '';
  };

  const handleMapMouseLeave = () => {
    const map = mapRef.current?.getMap();
    if (map) map.getCanvas().style.cursor = '';
  };

  if (baseWithRoute.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-500 shadow-sm">
        Aucune transaction géolocalisée pour afficher une carte.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <aside className="flex w-full flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm lg:max-w-sm">
        <div className="border-b border-neutral-100 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Territoire RDC
            </div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900"
              title="Simulation : les traces s’affichent une par une comme un flux temps réel"
            >
              <span
                className="relative flex h-2 w-2"
                aria-hidden
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              Simu. flux · {Math.min(streamCount, baseWithRoute.length)}/{baseWithRoute.length}
            </div>
            <button
              type="button"
              onClick={() => {
                if (followStream) {
                  setFollowStream(false);
                  return;
                }
                setFollowStream(true);
                if (withRoute.length > 0) {
                  const last = withRoute[withRoute.length - 1];
                  setSelectedNumero(last.transaction_event.metadata.numero_transaction);
                  setGlobalView(false);
                }
                prevStreamForFollowRef.current = streamCount;
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                followStream
                  ? 'border-sky-300 bg-sky-50 text-sky-900 shadow-sm'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
              title={
                followStream
                  ? 'La carte suit chaque nouveau flux (clic pour désactiver)'
                  : 'Recadrer sur chaque nouveau flux automatiquement'
              }
              aria-pressed={followStream}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${followStream ? 'bg-sky-500' : 'bg-neutral-300'}`}
                aria-hidden
              />
              Suivre le flux
            </button>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Flux de fonds</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Trajectoires nationales et transfrontalières (canal, IP et KYC géolocalisé).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTypeFilters((v) => !v)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                showTypeFilters
                  ? 'border-rb-black bg-rb-black text-white'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
              title="Afficher ou masquer les types de transaction sur la carte"
              aria-expanded={showTypeFilters}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Types
            </button>
          </div>

          {showTypeFilters && (
            <div className="mt-3 rounded-xl border border-neutral-100 bg-rb-page/90 p-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                Types affichés sur la carte
              </p>
              <ul className="space-y-2">
                {allTypes.map((typ) => (
                  <li key={typ}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-neutral-300 text-rb-black focus:ring-rb-yellow"
                        checked={typeVisible[typ] !== false}
                        onChange={() =>
                          setTypeVisible((prev) => {
                            const cur = prev[typ] !== false;
                            return { ...prev, [typ]: !cur };
                          })
                        }
                      />
                      <span>{typ}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGlobalView(false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                !globalView
                  ? 'bg-rb-black text-white shadow-sm'
                  : 'bg-rb-page text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Détail
            </button>
            <button
              type="button"
              onClick={() => {
                setFollowStream(false);
                setGlobalView(true);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                globalView
                  ? 'bg-rb-black text-white shadow-sm'
                  : 'bg-rb-page text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Vue globale
            </button>
          </div>
        </div>
        <ul className="max-h-[min(52vh,28rem)] flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
          {withRoute.length === 0 ? (
            <li className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-center text-sm text-neutral-500">
              {streamCount === 0
                ? 'Les flux arrivent en temps réel…'
                : streamedWithRoute.length > 0
                  ? 'Aucun flux pour les types sélectionnés. Cochez des types ci-dessus ou réinitialisez les filtres.'
                  : 'Les flux arrivent en temps réel…'}
            </li>
          ) : null}
          {withRoute.map((tx) => {
            const meta = tx.transaction_event.metadata;
            const r = meta.route!;
            const active = meta.numero_transaction === selectedNumero && !globalView;
            const km = haversineKm(r.sender.lat, r.sender.lng, r.receiver.lat, r.receiver.lng);
            const fraud = tx.target_labels.cible_fraude;
            return (
              <li key={meta.numero_transaction} data-tx-item={meta.numero_transaction}>
                <button
                  type="button"
                  onClick={() => {
                    setFollowStream(false);
                    setSelectedNumero(meta.numero_transaction);
                    setGlobalView(false);
                  }}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? 'border-rb-yellow bg-rb-yellow-muted shadow-sm shadow-rb-yellow/20'
                      : fraud
                        ? 'border-red-100 bg-red-50/50 hover:border-red-200 hover:bg-red-50'
                        : 'border-neutral-100 bg-rb-page/80 hover:border-emerald-200 hover:bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-neutral-900">{meta.numero_transaction}</span>
                    {fraud ? (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        Fraude
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Valide
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {r.sender.city} → {r.receiver.city}
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    {km.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km · {meta.type_transaction}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="relative min-h-[min(70vh,560px)] flex-1 overflow-hidden rounded-2xl border border-neutral-200/90 bg-gradient-to-br from-slate-50 to-white shadow-inner">
        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[min(100%-2rem,22rem)] rounded-xl border border-neutral-200/80 bg-white/95 px-3 py-2.5 text-xs text-neutral-800 shadow-lg shadow-neutral-900/5 backdrop-blur-sm">
          {globalView ? (
            <p>
              <span className="font-semibold text-rb-black">Vue globale</span>{' '}
              <span className="text-neutral-500">
                — {withRoute.length} flux affichés · <span className="text-red-600">fraude</span> /{' '}
                <span className="text-emerald-600">valide</span>
              </span>
              <span className="mt-1 block text-[10px] text-neutral-400">
                Simulation temps réel · cliquez sur une trace pour le détail.
              </span>
            </p>
          ) : selectedTx && txRoute(selectedTx) ? (
            <>
              <p className="font-mono text-[11px] font-medium text-neutral-900">
                {selectedTx.transaction_event.metadata.numero_transaction}
              </p>
              <p className="mt-1 text-neutral-600">
                {txRoute(selectedTx)!.sender.city} ({txRoute(selectedTx)!.sender.countryCode}) →{' '}
                {txRoute(selectedTx)!.receiver.city} ({txRoute(selectedTx)!.receiver.countryCode})
              </p>
              {distanceKm != null && (
                <p className="mt-1 font-medium text-rb-black">
                  ≈ {distanceKm.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km
                </p>
              )}
              <span className="mt-1 block text-[10px] text-neutral-400">
                Autres flux en fond · cliquez sur une trace pour le détail.
              </span>
            </>
          ) : null}
        </div>

        <Map
          ref={mapRef}
          mapLib={maplibregl}
          mapStyle={MAP_STYLE_LIGHT}
          initialViewState={RDC_INITIAL_VIEW}
          style={{ width: '100%', height: '100%', minHeight: 'min(70vh, 560px)' }}
          attributionControl={{ compact: true }}
          reuseMaps
          interactiveLayerIds={[...interactiveLayerIds]}
          onClick={handleTraceClick}
          onMouseMove={handleMapMouseMove}
          onMouseLeave={handleMapMouseLeave}
          onLoad={(e) => {
            e.target.resize();
          }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <ScaleControl position="bottom-left" unit="metric" />

          <Source id="all-routes" type="geojson" data={allLinesFc}>
            <Layer
              id="all-lines-glow"
              type="line"
              layout={{
                visibility: globalView ? 'visible' : 'none',
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': LINE_COLOR_GLOW,
                'line-width': 18,
                'line-blur': 5,
                'line-opacity': 0.42,
              }}
            />
            <Layer
              id="all-lines-mid"
              type="line"
              layout={{
                visibility: globalView ? 'visible' : 'none',
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': LINE_COLOR_MAIN,
                'line-width': 4.2,
                'line-blur': 0.35,
                'line-opacity': 0.94,
              }}
            />
            <Layer
              id="all-lines-core"
              type="line"
              layout={{
                visibility: globalView ? 'visible' : 'none',
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': LINE_COLOR_CORE,
                'line-width': 1.15,
                'line-opacity': 0.65,
              }}
            />
            <Layer
              id="all-lines-hit"
              type="line"
              layout={{
                visibility: globalView ? 'visible' : 'none',
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': '#000000',
                'line-width': 24,
                'line-opacity': 0,
              }}
            />
          </Source>

          <Source id="detail-other-routes" type="geojson" data={otherLinesFc}>
            <Layer
              id="detail-other-glow"
              type="line"
              layout={{
                visibility: !globalView && otherLinesFc.features.length > 0 ? 'visible' : 'none',
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': LINE_COLOR_GLOW,
                'line-width': 14,
                'line-blur': 4,
                'line-opacity': ['case', ['==', ['get', 'fraud'], 1], 0.16, 0.14],
              }}
            />
            <Layer
              id="detail-other-mid"
              type="line"
              layout={{
                visibility: !globalView && otherLinesFc.features.length > 0 ? 'visible' : 'none',
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': LINE_COLOR_MAIN,
                'line-width': 2.4,
                'line-blur': 0.25,
                'line-opacity': ['case', ['==', ['get', 'fraud'], 1], 0.38, 0.36],
              }}
            />
            <Layer
              id="detail-other-hit"
              type="line"
              layout={{
                visibility: !globalView && otherLinesFc.features.length > 0 ? 'visible' : 'none',
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': '#000000',
                'line-width': 20,
                'line-opacity': 0,
              }}
            />
          </Source>

          <Source id="selected-route" type="geojson" data={selectedLineData}>
            <Layer
              id="sel-glow"
              type="line"
              layout={{
                visibility: !globalView && selectedFeature ? 'visible' : 'none',
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': LINE_COLOR_GLOW,
                'line-width': 22,
                'line-blur': 6,
                'line-opacity': 0.5,
              }}
            />
            <Layer
              id="sel-mid"
              type="line"
              layout={{
                visibility: !globalView && selectedFeature ? 'visible' : 'none',
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': LINE_COLOR_MAIN,
                'line-width': 5.5,
                'line-blur': 0.4,
                'line-opacity': 0.98,
              }}
            />
            <Layer
              id="sel-core"
              type="line"
              layout={{
                visibility: !globalView && selectedFeature ? 'visible' : 'none',
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': LINE_COLOR_CORE,
                'line-width': 1.35,
                'line-opacity': 0.75,
              }}
            />
            <Layer
              id="sel-hit"
              type="line"
              layout={{
                visibility: !globalView && selectedFeature ? 'visible' : 'none',
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': '#000000',
                'line-width': 30,
                'line-opacity': 0,
              }}
            />
          </Source>

          {!globalView && selectedTx && txRoute(selectedTx) && (
            <>
              <Marker longitude={txRoute(selectedTx)!.sender.lng} latitude={txRoute(selectedTx)!.sender.lat} anchor="center">
                <div
                  className={`flex h-11 w-11 cursor-default items-center justify-center rounded-full border-2 border-white bg-gradient-to-br shadow-xl ring-2 ring-offset-2 ring-offset-white/90 ${
                    isFraudSelected
                      ? 'from-rose-100 to-rose-200 text-rose-900 shadow-rose-500/25 ring-rose-300/50'
                      : 'from-teal-100 to-emerald-200 text-teal-900 shadow-teal-500/20 ring-teal-300/45'
                  }`}
                  title={`${txRoute(selectedTx)!.sender.label} — ${txRoute(selectedTx)!.sender.city} (${txRoute(selectedTx)!.sender.countryCode})`}
                >
                  <span className="text-[11px] font-bold tracking-tight">É</span>
                </div>
              </Marker>
              <Marker
                longitude={txRoute(selectedTx)!.receiver.lng}
                latitude={txRoute(selectedTx)!.receiver.lat}
                anchor="center"
              >
                <div
                  className={`flex h-11 w-11 cursor-default items-center justify-center rounded-full border-2 border-white bg-gradient-to-br shadow-xl ring-2 ring-offset-2 ring-offset-white/90 ${
                    isFraudSelected
                      ? 'from-rose-500 to-rose-700 text-white shadow-rose-600/35 ring-rose-400/55'
                      : 'from-teal-500 to-emerald-700 text-white shadow-teal-600/30 ring-teal-400/50'
                  }`}
                  title={`${txRoute(selectedTx)!.receiver.label} — ${txRoute(selectedTx)!.receiver.city} (${txRoute(selectedTx)!.receiver.countryCode})`}
                >
                  <span className="text-[11px] font-bold tracking-tight">B</span>
                </div>
              </Marker>
            </>
          )}
        </Map>
      </div>
    </div>
  );
}
