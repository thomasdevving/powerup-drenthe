import {BUILDINGS, HUB, SOLAR_PARK, TRAFO, TURBINE, WADIS} from '../../src/world/layout';

export type Mode = 'nu' | 'hub';
export type Tone = 'red' | 'cyan' | 'yellow' | 'green' | 'neutral';

export type Stat = {label: string; value: (t: number) => string; tone?: Tone; bar?: (t: number) => number};

export type ZoneText = {kicker: string; text: string; tone: Tone; stats?: Stat[]};

export type Zone = {
  id: string;
  title: string;
  /** Hitbox: middelpunt + afmetingen (wereld-eenheden). */
  center: [number, number, number];
  size: [number, number, number];
  /** Alleen zichtbaar/hoverbaar in deze modus (anders: beide). */
  only?: Mode;
  nu?: ZoneText;
  hub?: ZoneText;
};

const wobble = (t: number, seed: number, amp: number) =>
  amp * (Math.sin(t * 0.9 + seed * 1.7) * 0.6 + Math.sin(t * 2.3 + seed) * 0.4);

const NAMES = [
  'Metaalbewerking',
  'Drukkerij',
  'Installatiebedrijf',
  'Logistiek centrum',
  'Bakkerij',
  'Koel- en vrieshuis',
  'Houtbewerking',
  'Autobedrijf',
];
// indicatieve waarden in kW
const BASE = [180, 70, 110, 140, 95, 260, 120, 80];
const MIN = [120, 50, 70, 100, 70, 180, 80, 55];

const NU_TEXT: Record<number, string> = {
  0: 'Wil een hal bijbouwen, maar krijgt geen zwaardere aansluiting. De uitbreiding staat stil.',
  2: 'Heeft zonnepanelen op het dak, maar terugleveren lukt niet: het net staat op rood.',
  5: 'Grootste verbruiker. Bij pieken kan het net het niet aan, en uitbreiden mag niet.',
};

const buildingZone = (i: number): Zone => {
  const b = BUILDINGS[i];
  const solar = !b.greenRoof;
  return {
    id: `pand-${i + 1}`,
    title: `Pand ${i + 1} · ${NAMES[i]}`,
    center: [b.x, b.h / 2 + 0.5, b.z],
    size: [b.w + 0.8, b.h + 1.5, b.d + 0.8],
    nu: {
      kicker: NU_TEXT[i] ? 'Loopt vast' : 'Afhankelijk van een vol net',
      tone: NU_TEXT[i] ? 'red' : 'neutral',
      text: NU_TEXT[i] ?? 'Geen inzicht in het eigen verbruik. Elke extra machine is een nieuwe aanvraag in de wachtrij.',
      stats: [{label: 'Aanvraag zwaardere aansluiting', value: () => 'in de wachtrij', tone: 'red'}],
    },
    hub: {
      kicker: i === 0 ? 'Groeit weer' : solar ? 'Verbruikt én wekt op' : 'Groen dak, slim verbruik',
      tone: 'cyan',
      text:
        i === 0
          ? 'De nieuwe verdieping staat er. De ruimte komt uit slim verdelen binnen het terrein, niet uit verzwaren.'
          : i === 5
            ? 'Pieken van de koelinstallatie worden opgevangen door de batterij van de Energy Hub.'
            : solar
              ? 'Zonnepanelen op het dak leveren aan het eigen smart grid. Overschot gaat naar buren of de batterij.'
              : 'Groen dak voor koeling en waterberging. Verbruik is realtime zichtbaar op het dashboard.',
      stats: [
        {
          label: 'Verbruik nu',
          value: (t) => `${Math.round(BASE[i] + wobble(t, i, BASE[i] * 0.12))} kW`,
          tone: 'cyan',
          bar: (t) => (BASE[i] + wobble(t, i, BASE[i] * 0.12)) / (BASE[i] * 1.4),
        },
        {label: 'Gegarandeerd minimum', value: () => `${MIN[i]} kW`, tone: 'green'},
        ...(solar
          ? [{label: 'Eigen opwek (zon)', value: (t: number) => `${Math.round(BASE[i] * 0.35 + wobble(t, i + 9, 8))} kW`, tone: 'yellow' as Tone}]
          : []),
      ],
    },
  };
};

export const ZONES: Zone[] = [
  {
    id: 'trafo',
    title: 'Netaansluiting',
    center: [TRAFO.x, 3, TRAFO.z],
    size: [14, 7, 12],
    nu: {
      kicker: 'Net vol',
      tone: 'red',
      text: 'Elk bedrijf heeft een eigen aansluiting. Aanvragen voor meer vermogen staan in de wachtrij bij de netbeheerder.',
      stats: [{label: 'Aanvragen in de wachtrij', value: () => '7', tone: 'red'}],
    },
    hub: {
      kicker: 'Eén aansluiting',
      tone: 'cyan',
      text: 'De leverancier levert één vaste, afgesproken hoeveelheid aan het hele terrein. Het terrein verdeelt die zelf.',
      stats: [{label: 'Levering', value: () => 'zoals afgesproken', tone: 'cyan'}],
    },
  },
  {
    id: 'hub',
    title: 'Energy Hub',
    center: [HUB.x, 3, HUB.z],
    size: [16, 7, 13],
    nu: {
      kicker: 'Nog leeg',
      tone: 'neutral',
      text: 'Een leeg plein midden op het terrein. Hier kan de Energy Hub komen.',
    },
    hub: {
      kicker: 'Hart van het smart grid',
      tone: 'green',
      text: 'Batterijen slaan overschot van zon en wind op en vangen pieken op. Via het ringnet bereikt de stroom elk pand.',
      stats: [
        {
          label: 'Batterij',
          value: (t) => `${Math.round(62 + 18 * Math.sin(t * 0.25))}%`,
          tone: 'green',
          bar: (t) => (62 + 18 * Math.sin(t * 0.25)) / 100,
        },
        {label: 'Status', value: (t) => (Math.cos(t * 0.25) > 0 ? 'laden ▲' : 'piek opvangen ▼'), tone: 'cyan'},
      ],
    },
  },
  {
    id: 'zonnepark',
    title: 'Zonnepark',
    center: [(SOLAR_PARK.minX + SOLAR_PARK.maxX) / 2, 1.5, (SOLAR_PARK.minZ + SOLAR_PARK.maxZ) / 2],
    size: [SOLAR_PARK.maxX - SOLAR_PARK.minX + 2, 3, SOLAR_PARK.maxZ - SOLAR_PARK.minZ + 2],
    nu: {
      kicker: 'Naast elkaar, niet verbonden',
      tone: 'yellow',
      text: 'Het zonnepark levert aan een ver onderstation. Het bedrijventerrein ernaast kan er niets mee.',
    },
    hub: {
      kicker: 'Nu wél verbonden',
      tone: 'yellow',
      text: 'Een directe kabel naar de Energy Hub. Zonnestroom gaat het terrein op of de batterij in.',
      stats: [{label: 'Levert nu', value: (t) => `${Math.round(1450 + wobble(t, 3, 90))} kW`, tone: 'yellow'}],
    },
  },
  {
    id: 'turbine',
    title: 'Windturbine',
    center: [TURBINE.x, 9, TURBINE.z],
    size: [8, 18, 8],
    only: 'hub',
    hub: {
      kicker: 'Ook als de zon niet schijnt',
      tone: 'yellow',
      text: 'Een kleine windturbine vult de zonnestroom aan, juist ’s avonds en in de winter.',
    },
  },
  ...WADIS.map(
    ([x, z, s], i): Zone => ({
      id: `wadi-${i + 1}`,
      title: 'Wadi en groen',
      center: [x, 0.8, z],
      size: [9 * s, 2, 5 * s],
      only: 'hub',
      hub: {
        kicker: 'Klimaatbestendig',
        tone: 'green',
        text: 'Regenwater zakt hier langzaam weg in plaats van het riool te overbelasten. Groen en bomen geven schaduw: minder hittestress.',
      },
    }),
  ),
  ...BUILDINGS.map((_, i) => buildingZone(i)),
];
