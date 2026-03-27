/**
 * Géolocalisation navigateur (HTTPS requis en prod — ex. Vercel).
 * Utilisée de façon obligatoire avant validation d’une opération.
 */
export interface GeoCoords {
  latitude: number;
  longitude: number;
}

const ERR_MSG: Record<number, string> = {
  1: 'La géolocalisation est obligatoire pour cette opération. Autorisez l’accès dans les paramètres du navigateur.',
  2: 'Position indisponible. Vérifiez le GPS ou le réseau puis réessayez.',
  3: 'Délai dépassé pour la position. Réessayez.',
};

/**
 * Demande la position actuelle. Échoue si refus, indisponible ou timeout.
 */
export function getRequiredGeolocation(): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Géolocalisation non disponible sur cet appareil.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        const msg = ERR_MSG[err.code] ?? err.message ?? 'Erreur de géolocalisation.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 25_000, maximumAge: 0 }
    );
  });
}
