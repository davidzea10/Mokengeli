const EARTH_R_M = 6378137;

/** Distance entre deux points WGS84 (km) — formule de Haversine */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Web Mercator (EPSG:3857) — x,y en mètres */
function mercatorMeters(lat: number, lng: number): [number, number] {
  const x = EARTH_R_M * (lng * Math.PI) / 180;
  const y = EARTH_R_M * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [x, y];
}

function inverseMercatorMeters(x: number, y: number): [number, number] {
  const lng = (x / EARTH_R_M) * 180 / Math.PI;
  const lat = (2 * Math.atan(Math.exp(y / EARTH_R_M)) - Math.PI / 2) * 180 / Math.PI;
  return [lat, lng];
}

/**
 * Trajectoire « courbe » lisible sur la carte : arc quadratique en Mercator avec surélévation
 * perpendiculaire à la corde (effet type flux / virement), puis échantillonnage dense.
 * Pour les très courts trajets, retombe sur un grand cercle densifié.
 */
export function transactionRoutePath(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  segments = 96
): [number, number][] {
  const dKm = haversineKm(a.lat, a.lng, b.lat, b.lng);
  if (!Number.isFinite(dKm) || dKm < 0.05) {
    return [
      [a.lat, a.lng],
      [b.lat, b.lng],
    ];
  }

  if (dKm < 2) {
    return greatCirclePositions(a, b, Math.max(40, segments));
  }

  const [ax, ay] = mercatorMeters(a.lat, a.lng);
  const [bx, by] = mercatorMeters(b.lat, b.lng);
  const dx = bx - ax;
  const dy = by - ay;
  const chord = Math.hypot(dx, dy) || 1;
  const px = -dy / chord;
  const py = dx / chord;
  /** Courbure modérée : ~18 % de la corde pour un arc fluide type « flux » */
  const bulge = Math.min(chord * 0.18, 480_000);
  const cx = (ax + bx) / 2 + px * bulge;
  const cy = (ay + by) / 2 + py * bulge;

  const out: [number, number][] = [];
  const nSeg = Math.max(segments, 120);
  for (let i = 0; i <= nSeg; i++) {
    const t = i / nSeg;
    const u = 1 - t;
    const mx = u * u * ax + 2 * u * t * cx + t * t * bx;
    const my = u * u * ay + 2 * u * t * cy + t * t * by;
    const [lat, lng] = inverseMercatorMeters(mx, my);
    out.push([lat, lng]);
  }
  return out;
}

/** Points le long du grand cercle pour un rendu de trajectoire fluide sur la carte */
export function greatCirclePositions(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  segments = 64
): [number, number][] {
  const lat1 = (a.lat * Math.PI) / 180;
  const lng1 = (a.lng * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const lng2 = (b.lng * Math.PI) / 180;

  const sin = Math.sin;
  const cos = Math.cos;
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lng2 - lng1) / 2) ** 2
      )
    );

  if (!Number.isFinite(d) || d < 1e-8) {
    return [
      [a.lat, a.lng],
      [b.lat, b.lng],
    ];
  }

  const out: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const A = sin((1 - t) * d) / sin(d);
    const B = sin(t * d) / sin(d);
    const x = A * cos(lat1) * cos(lng1) + B * cos(lat2) * cos(lng2);
    const y = A * cos(lat1) * sin(lng1) + B * cos(lat2) * sin(lng2);
    const z = A * sin(lat1) + B * sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lng = Math.atan2(y, x);
    out.push([(lat * 180) / Math.PI, (lng * 180) / Math.PI]);
  }
  return out;
}
