/**
 * Vue par défaut centrée sur la RDC (contexte opérationnel RawBank / Mokengeli).
 * Bounding box approximative du territoire pour encadrer les vues « globales » nationales.
 */
export const RDC_INITIAL_VIEW = {
  longitude: 23.6,
  latitude: -3.2,
  zoom: 5.2,
  pitch: 0,
  bearing: 0,
} as const;

/** [[minLng, minLat], [maxLng, maxLat]] — marge large pour l’ensemble du pays */
export const RDC_BOUNDS: [[number, number], [number, number]] = [
  [12.0, -13.8],
  [31.5, 5.6],
];

/** Style vectoriel clair (Carto Positron) — lisible, moderne, sans clé API */
export const MAP_STYLE_LIGHT =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
