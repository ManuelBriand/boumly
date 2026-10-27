// Utilitaires géo partagés client + serveur (rayon de livraison locale).

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult extends LatLng {
  country: string | null; // ISO alpha-2 minuscule (zones d'expédition)
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distance haversine en km entre deux points. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Géocode une adresse via Mapbox Geocoding v6 (serveur).
 * Renvoie les coords du meilleur résultat, ou null si introuvable / token absent.
 * Utilisé pour re-vérifier le rayon côté serveur sans faire confiance aux coords client.
 */
export async function geocodeAddress(
  address: string,
  country?: string
): Promise<GeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || !address.trim()) return null;
  try {
    const url =
      `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}` +
      `&access_token=${token}&limit=1&language=fr&types=address,street` +
      (country ? `&country=${country}` : "");
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const [lng, lat] = coords;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    const cc = feature?.properties?.context?.country?.country_code;
    return { lat, lng, country: cc ? String(cc).toLowerCase() : null };
  } catch {
    return null;
  }
}
