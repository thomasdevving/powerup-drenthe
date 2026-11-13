import {compareScenarios} from '../../src/energy/model';
import {COMPANIES, DEFAULT_SETTINGS, PARK_KWP, solarPerKwp, fmtTime, type Settings} from '../../src/energy/profiles';
import {BUILDINGS, HUB, SOLAR_PARK, TRAFO, TURBINE, WADIS} from '../../src/world/layout';
import {HEAT_STATION, LAADPLEIN} from '../../src/world/Future';

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
      stats: [],
    },
    hub: {
      kicker: i === 0 ? 'Groeit weer' : solar ? 'Verbruikt én wekt op' : 'Groen dak, slim verbruik',
      tone: 'cyan',
      text:
        i === 0
          ? 'Slim verdelen kan ontwikkeling ondersteunen. Het model toont resterende tekorten; netverzwaring kan nodig blijven.'
          : i === 5
            ? 'Pieken van de koelinstallatie worden opgevangen door de batterij van de Energy Hub.'
            : solar
              ? 'Zonnepanelen op het dak leveren aan het eigen smart grid. Overschot gaat naar buren of de batterij.'
              : 'Groen dak voor koeling en waterberging. Verbruik is realtime zichtbaar op het dashboard.',
      stats: [],
    },
  };
};

const ZONE_LAYOUT: Zone[] = [
  {
    id: 'trafo',
    title: 'Netaansluiting',
    center: [TRAFO.x, 3, TRAFO.z],
    size: [14, 7, 12],
    nu: {
      kicker: 'Net vol',
      tone: 'red',
      text: 'Elk bedrijf heeft een eigen aansluiting. Aanvragen voor meer vermogen staan in de wachtrij bij de netbeheerder.',
      stats: [],
    },
    hub: {
      kicker: 'Eén aansluiting',
      tone: 'cyan',
      text: 'Gezamenlijk energiemanagement binnen de netlimiet, met passende contracten en wettelijke toetsing. Er komt geen fictieve netcapaciteit bij.',
      stats: [],
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
      stats: [],
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
      stats: [],
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
  {
    id: 'warmtenet',
    title: 'Warmtepomp en warmtebuffer',
    center: [HEAT_STATION.x, 3, HEAT_STATION.z],
    size: [5, 7, 8],
    only: 'hub',
    hub: {
      kicker: 'Lokaal warmtenet',
      tone: 'yellow',
      text: 'Restwarmte van de metaalbewerking en het koelhuis gaat via ondergrondse leidingen naar kantoren en panden met warmtevraag. Haalbaarheid hangt af van temperatuur, afstand, aanbod en vraag.',
      stats: [],
    },
  },
  {
    id: 'laadplein',
    title: 'Gedeeld laadplein',
    center: [(LAADPLEIN.minX + LAADPLEIN.maxX) / 2, 1.5, (LAADPLEIN.minZ + LAADPLEIN.maxZ) / 2],
    size: [LAADPLEIN.maxX - LAADPLEIN.minX, 3, LAADPLEIN.maxZ - LAADPLEIN.minZ],
    only: 'hub',
    hub: {
      kicker: '± 2 hectare',
      tone: 'cyan',
      text: 'Carports met zonnepanelen, laadpunten voor auto’s en vrachtwagens, groen en wateropvang. Laden wordt gepland buiten de avondpiek.',
      stats: [],
    },
  },
  {
    id: 'vrachtwagens',
    title: 'Elektrische vrachtwagens',
    center: [31, 1.5, 2.6],
    size: [5, 3, 11],
    only: 'nu',
    nu: {
      kicker: 'Elektrificatie',
      tone: 'red',
      text: 'De logistiek stapt over op elektrische vrachtwagens, maar voor snelladers is geen netcapaciteit.',
      stats: [],
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

/** De plattegrond deelt de instellingen en berekening met dashboard en facturatie. */
export function makeZones(settings: Settings): Zone[] {
  const days = compareScenarios(settings);
  const hubDay = days[(settings.thermal?.enabled ?? true) ? 2 : 1];
  const sample = (t: number, mode: Mode) => (mode === 'nu' ? days[0] : hubDay).steps[Math.floor(((6 + t * .9) % 24) * 4)];
  const n = (v: number) => Math.round(v).toLocaleString('nl-NL');
  const getStats = (id: string, mode: Mode): Stat[] => {
    const st = (t: number) => sample(t, mode);
    const stats: Stat[] = [{label: 'Illustratieve modeltijd', value: t => `${settings.season} · ${fmtTime(st(t).h)}`}];
    if (id.startsWith('pand-')) {
      const j = Number(id.split('-')[1]) - 1;
      stats.push({label: 'Geplande elektriciteitsvraag', value: t => `${n(st(t).perCompany[j].use)} kW`, tone: 'cyan'},
        {label: 'Referentievermogen (geen garantie)', value: () => `${COMPANIES[j].minKw} kW`, tone: 'green'},
        {label: 'Dakopwek', value: t => `${n(st(t).perCompany[j].pv)} kW`, tone: 'yellow'},
        {label: 'Warmte uit net en buffer', value: t => `${n(st(t).perDelivered[j])} kWth`, tone: 'yellow'},
        {label: 'Koelvraag', value: t => `${n(st(t).perCold[j])} kWth`, tone: 'cyan'});
    } else if (id === 'trafo') stats.push(
      {label: 'Netimport', value: t => `${n(st(t).grid)} kW`, tone: 'cyan'},
      {label: 'Netlimiet', value: () => `${settings.capKw} kW`},
      {label: 'Niet geleverd', value: t => `${n(st(t).shortfall)} kW`, tone: 'red'});
    else if (id === 'hub') stats.push(
      {label: 'Batterijvoorraad', value: t => `${n(st(t).batteryKwh)} kWh`, tone: 'green', bar: t => st(t).soc},
      {label: 'Batterijstatus', value: t => st(t).charge > .1 ? 'laden' : st(t).discharge > .1 ? 'ontladen' : 'stand-by'});
    else if (id === 'zonnepark') stats.push({label: 'Naar collectief systeem', value: t => `${n(mode === 'hub' && settings.parkLink ? PARK_KWP * solarPerKwp(st(t).h, settings.season) : 0)} kW`, tone: 'yellow'});
    else if (id === 'turbine') stats.push({label: 'Naar collectief systeem', value: t => `${n(mode === 'hub' ? st(t).wind : 0)} kW`, tone: 'yellow'});
    else if (id === 'warmtenet') stats.push(
      {label: 'Nuttig geleverd', value: t => `${n(st(t).directHeat + st(t).bufferDischarge)} kWth`, tone: 'yellow'},
      {label: 'Pomp en circulatie', value: t => `${n(st(t).heatPumpElectric + st(t).pumpElectric)} kW`, tone: 'cyan'},
      {label: 'Warmtebuffer', value: t => `${n(st(t).bufferKwh)} kWhth`, tone: 'yellow'});
    else if (id === 'laadplein') stats.push({label: 'Carportopwek', value: () => 'Nog apart te dimensioneren'});
    else return [];
    return stats;
  };
  return ZONE_LAYOUT.map(z => ({...z,
    nu: z.nu ? {...z.nu, stats: getStats(z.id, 'nu')} : undefined,
    hub: z.hub ? {...z.hub, stats: getStats(z.id, 'hub')} : undefined,
  }));
}
export const ZONES = makeZones(DEFAULT_SETTINGS);
