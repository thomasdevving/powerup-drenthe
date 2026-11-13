/** Vaste plattegrond van het voorbeeldterrein (wereld-eenheden, x = oost, z = zuid). */
export type Building = {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  /** Heeft vanaf het begin zonnepanelen (scène 2). */
  solarFromStart?: boolean;
  /** Krijgt in scène 7 een groen dak (anders zonnepanelen). */
  greenRoof?: boolean;
};

export const TERRAIN = {minX: -33, maxX: 33, minZ: -25, maxZ: 25};

export const BUILDINGS: Building[] = [
  {x: -20, z: -13, w: 13, h: 6, d: 9, color: '#e9e3d6'}, // B1: wil groeien
  {x: -2, z: -15, w: 10, h: 4.5, d: 7, color: '#cfd8dc', greenRoof: true},
  {x: 16, z: -14, w: 12, h: 7, d: 9, color: '#e3d9c9', solarFromStart: true}, // B3: terugleveren
  {x: 24, z: 3, w: 9, h: 5, d: 12, color: '#d8dee6'},
  {x: 14, z: 16, w: 12, h: 4, d: 8, color: '#ece6da', greenRoof: true},
  {x: -3, z: 16, w: 10, h: 8, d: 8, color: '#d7ccc0'},
  {x: -20, z: 14, w: 12, h: 5, d: 9, color: '#dfe5e8', greenRoof: true},
  {x: -25, z: 0, w: 8, h: 4, d: 7, color: '#e6dccb'},
];

/** Netaansluiting / trafostation van de netbeheerder. */
export const TRAFO = {x: -48, z: -4};
/** Energy Hub in het midden. */
export const HUB = {x: 0, z: 0};
/** Zonnepark naast het terrein. */
export const SOLAR_PARK = {minX: 46, maxX: 86, minZ: -20, maxZ: 20};
/** Ander onderstation waar het zonnepark op aangesloten is. */
export const PARK_STATION = {x: 150, z: 34};

/** Ringnet rond de hub (rechthoek met afgeronde hoeken). */
export const RING = {hx: 10, hz: 8};

/** Hoogspanningslijn: masten (x, z). Doorgaande lijn + aftakking naar de trafo. */
export const HV_MAIN: [number, number][] = [
  [-520, -150], [-430, -130], [-340, -112], [-250, -96], [-160, -86], [-75, -80],
  [10, -78], [95, -80], [180, -88], [265, -100], [350, -116], [440, -136],
];
export const HV_BRANCH: [number, number][] = [
  [-75, -80], [-62, -42], [TRAFO.x, TRAFO.z - 3],
];

/** Kleine windturbine (scène 5). */
export const TURBINE = {x: 30, z: 21};

/** Dashboardpaneel zweeft boven het terrein (scène 6). */
export const DASH = {x: 0, y: 46, z: -10, w: 64, h: 36};

/** Wadi's / waterberging (scène 7): x, z, schaal. */
export const WADIS: [number, number, number][] = [[29, -21, 1.0], [5, 22.5, 1.1], [-30.5, 6, 0.9], [-8, -21.5, 0.9]];
