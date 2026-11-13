/**
 * Gestileerde (vereenvoudigde) contouren van Drenthe en Nederland in [lon, lat].
 * Bewust lowpoly — het gaat om herkenbaarheid, niet om cartografische precisie.
 */
import {rand} from '../util';

export type LonLat = [number, number];

export const DRENTHE: LonLat[] = [
  [6.12, 52.85], [6.17, 52.95], [6.3, 53.0], [6.35, 53.08], [6.4, 53.11],
  [6.45, 53.2], [6.6, 53.18], [6.7, 53.12], [6.8, 53.05], [6.9, 52.98],
  [7.0, 52.93], [7.08, 52.85], [7.05, 52.72], [7.05, 52.64], [6.85, 52.65],
  [6.72, 52.62], [6.55, 52.64], [6.4, 52.68], [6.3, 52.72], [6.2, 52.78],
];

export const NETHERLANDS: LonLat[] = [
  [3.36, 51.37], [3.8, 51.21], [4.25, 51.37], [4.55, 51.43], [4.85, 51.45],
  [5.05, 51.48], [5.25, 51.26], [5.55, 51.22], [5.8, 51.1], [5.65, 50.8],
  [6.02, 50.75], [6.08, 50.92], [5.92, 51.05], [6.17, 51.18], [6.22, 51.38],
  [6.22, 51.52], [5.95, 51.78], [6.15, 51.85], [6.4, 51.83], [6.75, 51.92],
  [6.85, 52.1], [7.05, 52.23], [7.05, 52.4], [6.72, 52.48], [6.72, 52.58],
  [7.05, 52.64], [7.1, 52.85], [7.2, 53.0], [7.2, 53.25], [6.9, 53.45],
  [6.25, 53.42], [5.6, 53.4], [5.35, 53.25], [5.3, 53.05], [5.0, 52.93],
  [4.75, 52.96], [4.6, 52.45], [4.4, 52.2], [4.12, 52.0], [3.95, 51.85],
  [3.7, 51.7], [3.45, 51.55],
];

export const IJSSELMEER: LonLat[] = [
  [5.05, 52.92], [5.42, 52.9], [5.58, 52.78], [5.4, 52.6], [5.15, 52.55], [5.05, 52.65],
];

/** Locatie van ons voorbeeldterrein (ten zuiden van Assen). */
export const ORIGIN: LonLat = [6.58, 52.97];
/** Wereld-eenheden per kilometer (1 eenheid ≈ 11 m). */
export const UNITS_PER_KM = 90;

const KM_PER_LON = 111.32 * Math.cos((ORIGIN[1] * Math.PI) / 180);
const KM_PER_LAT = 110.57;

/** lon/lat → wereld x/z (noord = -z). */
export const project = ([lon, lat]: LonLat): [number, number] => [
  (lon - ORIGIN[0]) * KM_PER_LON * UNITS_PER_KM,
  -(lat - ORIGIN[1]) * KM_PER_LAT * UNITS_PER_KM,
];

export const projectPoly = (poly: LonLat[]) => poly.map(project);

export const pointInPoly = (x: number, y: number, poly: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const bbox = (poly: [number, number][]) => {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return {minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys)};
};

export const centroid = (poly: [number, number][]): [number, number] => {
  const b = bbox(poly);
  return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
};

/** Deterministische punten binnen een polygoon met minimale onderlinge afstand. */
const scatter = (
  poly: [number, number][],
  count: number,
  seed: number,
  minDist: number,
  exclude: [number, number][][] = [],
  preset: [number, number][] = [],
) => {
  const b = bbox(poly);
  const pts: [number, number][] = [...preset];
  let k = 0;
  while (pts.length < count && k < 40000) {
    k++;
    const x = b.minX + rand(seed + k * 2.13) * (b.maxX - b.minX);
    const y = b.minY + rand(seed + k * 7.77) * (b.maxY - b.minY);
    if (!pointInPoly(x, y, poly)) continue;
    if (exclude.some((e) => pointInPoly(x, y, e))) continue;
    // marge t.o.v. de rand
    if (pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < minDist)) continue;
    pts.push([x, y]);
  }
  return pts;
};

export const DRENTHE_XY = projectPoly(DRENTHE);
export const NL_XY = projectPoly(NETHERLANDS);
export const IJSSEL_XY = projectPoly(IJSSELMEER);
export const DRENTHE_CENTER = centroid(DRENTHE_XY);
export const NL_CENTER = centroid(NL_XY);

/** 120 bedrijventerreinen in Drenthe; de eerste is ons voorbeeldterrein (0,0). Gesorteerd op afstand → golf. */
export const DRENTHE_SITES: [number, number][] = scatter(DRENTHE_XY, 120, 11, 330, [], [[0, 0]]).sort(
  (a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]),
);

/** Overige terreinen in NL (voor de landelijke uitrol). */
export const NL_SITES: [number, number][] = scatter(NL_XY, 260, 97, 900, [DRENTHE_XY, IJSSEL_XY]);
