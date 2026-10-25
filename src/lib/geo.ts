import {
  CITY_COORDS,
  COUNTRY_CENTROIDS,
  MAP_BOTTOM,
  MAP_H,
  MAP_TOP,
  MAP_W,
  NAME_TO_CODE,
} from "./geoData";

export interface LatLon {
  lat: number;
  lon: number;
}

/** Equirectangular projection, matching tools/gen_map.py. */
export function projectPoint(lat: number, lon: number): [number, number] {
  return [((lon + 180) / 360) * MAP_W, ((90 - lat) / 180) * MAP_H];
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * `region` is free text in Komari: "HK", "Hong Kong", "香港", "Tokyo - JP"…
 * Tries the ISO code, then a country name (EN/中文), then a city alias.
 */
export function locateRegion(region: string | null | undefined): LatLon | null {
  if (!region) return null;
  const raw = region.trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper) && COUNTRY_CENTROIDS[upper]) {
    const [lat, lon] = COUNTRY_CENTROIDS[upper];
    return { lat, lon };
  }

  const key = normalize(raw);
  const candidates = [
    key,
    key.replace(/\s*\(.*\)$/, ""),
    key.replace(/\b(sar|region|province|state)\b/g, "").trim(),
    key.split(/[,(]/)[0].trim(),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const code = NAME_TO_CODE[candidate];
    if (code && COUNTRY_CENTROIDS[code]) {
      const [lat, lon] = COUNTRY_CENTROIDS[code];
      return { lat, lon };
    }
  }
  for (const candidate of candidates) {
    const city = CITY_COORDS[candidate];
    if (city) return { lat: city[0], lon: city[1] };
  }
  return null;
}

/** City aliases only: used when a node is literally named after its city. */
export function locateCity(name: string | null | undefined): LatLon | null {
  if (!name) return null;
  const key = normalize(name).replace(/[\s_-]*\d+$/, "");
  const hit = CITY_COORDS[key];
  return hit ? { lat: hit[0], lon: hit[1] } : null;
}

export interface MapPin {
  key: string;
  /** Percent of the rendered map box, both axes. */
  x: number;
  y: number;
  nodes: Array<{ uuid: string; name: string }>;
  online: boolean;
  count: number;
}

/**
 * Pins are clustered on a 0.5° grid so eight nodes in one city do not stack
 * into an unclickable pile.
 */
export function buildPins(
  nodes: Array<{ uuid: string; name: string; region?: string | null }>,
  online: Set<string>,
): { pins: MapPin[]; located: number } {
  const buckets = new Map<string, MapPin>();
  let located = 0;

  for (const node of nodes) {
    // A node called "Sydney" with region AU belongs at the city, not at the
    // centre of Australia; fall back to the country label point.
    const point = locateCity(node.name) ?? locateRegion(node.region);
    if (!point) continue;
    located += 1;
    const [x, y] = projectPoint(point.lat, point.lon);
    const key = `${Math.round(point.lat * 2)}:${Math.round(point.lon * 2)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.nodes.push({ uuid: node.uuid, name: node.name });
      existing.count += 1;
      existing.online = existing.online || online.has(node.uuid);
    } else {
      buckets.set(key, {
        key,
        x: (x / MAP_W) * 100,
        y: ((y - MAP_TOP) / (MAP_BOTTOM - MAP_TOP)) * 100,
        nodes: [{ uuid: node.uuid, name: node.name }],
        online: online.has(node.uuid),
        count: 1,
      });
    }
  }

  return { pins: [...buckets.values()].sort((a, b) => a.x - b.x), located };
}
