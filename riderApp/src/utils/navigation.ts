export interface Coords {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lng, lat]
  distanceMeters: number;
  durationSeconds: number;
}

/** Haversine distance in meters */
export function haversineMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Fetch driving route from OSRM (free, no key) */
export async function fetchOSRMRoute(from: Coords, to: Coords): Promise<RouteResult | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const json = await res.json();
    const route = json.routes?.[0];
    if (!route) return null;
    return {
      coordinates: route.geometry.coordinates as [number, number][],
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch {
    return null;
  }
}

/**
 * Find the index of the closest point on the route to `pos`.
 * Returns the index so we can slice the remaining portion.
 */
export function closestPointIndex(
  coords: [number, number][],
  pos: Coords,
): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < coords.length; i++) {
    const d = haversineMeters(pos, { latitude: coords[i][1], longitude: coords[i][0] });
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return minIdx;
}

/**
 * Returns the remaining route GeoJSON geometry from driver's current position.
 * Slices from the closest point onward.
 */
export function remainingRouteGeometry(
  coords: [number, number][],
  pos: Coords,
): { type: 'LineString'; coordinates: [number, number][] } | null {
  if (coords.length < 2) return null;
  const idx = closestPointIndex(coords, pos);
  const remaining = [[pos.longitude, pos.latitude] as [number, number], ...coords.slice(idx + 1)];
  if (remaining.length < 2) return null;
  return { type: 'LineString', coordinates: remaining };
}

/**
 * Check if driver has deviated more than `thresholdMeters` from the route.
 */
export function isOffRoute(
  coords: [number, number][],
  pos: Coords,
  thresholdMeters = 50,
): boolean {
  const idx = closestPointIndex(coords, pos);
  const closest = { latitude: coords[idx][1], longitude: coords[idx][0] };
  return haversineMeters(pos, closest) > thresholdMeters;
}

export function formatETA(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
