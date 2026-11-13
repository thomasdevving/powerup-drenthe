/**
 * Simulatie van één dag op het bedrijventerrein, in kwartieren (96 stappen).
 * Indicatief model voor de demo: geen echte meetdata.
 *
 * Zonder Energy Hub: ieder bedrijf eigen aansluiting, alleen pand 3 heeft zonnepanelen,
 * terugleveren kan niet (net staat op rood), zonnepark niet verbonden, geen batterij.
 * Met Energy Hub: één afgesproken levering voor het hele terrein, eigen opwek wordt gedeeld,
 * batterij vangt pieken op, en wat dan nog over de afspraak gaat wordt geschoven
 * boven het gegarandeerd minimum van elk bedrijf.
 */

export type Season = 'winter' | 'zomer';
export type Category = 'machines' | 'koeling' | 'licht' | 'warmte' | 'laden';

export const CATEGORY_LABEL: Record<Category, string> = {
  machines: 'Machines',
  koeling: 'Koeling',
  licht: 'Licht & kantoor',
  warmte: 'Verwarming',
  laden: 'Laadpalen',
};

export type Company = {
  id: number;
  name: string;
  address: string;
  minKw: number;
  /** Zonnepanelen op het dak (kWp) in de Energy Hub-situatie. */
  pvKwp: number;
  /** Zonnepanelen die er nu al liggen. */
  pvNowKwp: number;
  loads: Record<Category, number>;
  /** Afwijkend werkrooster voor machines (bv. bakkerij 's nachts). */
  shiftStart?: number;
  shiftEnd?: number;
};

export const COMPANIES: Company[] = [
  {id: 1, name: 'Metaalbewerking', address: 'Energieweg 1', minKw: 150, pvKwp: 120, pvNowKwp: 0, loads: {machines: 230, koeling: 10, licht: 25, warmte: 60, laden: 40}},
  {id: 2, name: 'Drukkerij', address: 'Energieweg 3', minKw: 60, pvKwp: 0, pvNowKwp: 0, loads: {machines: 90, koeling: 5, licht: 20, warmte: 30, laden: 15}},
  {id: 3, name: 'Installatiebedrijf', address: 'Energieweg 5', minKw: 50, pvKwp: 110, pvNowKwp: 110, loads: {machines: 40, koeling: 0, licht: 15, warmte: 25, laden: 90}},
  {id: 4, name: 'Logistiek centrum', address: 'Stroomlaan 2', minKw: 90, pvKwp: 160, pvNowKwp: 0, loads: {machines: 35, koeling: 0, licht: 40, warmte: 50, laden: 170}},
  {id: 5, name: 'Bakkerij', address: 'Stroomlaan 4', minKw: 70, pvKwp: 0, pvNowKwp: 0, loads: {machines: 120, koeling: 20, licht: 10, warmte: 20, laden: 20}, shiftStart: 3, shiftEnd: 11},
  {id: 6, name: 'Koel- en vrieshuis', address: 'Stroomlaan 6', minKw: 180, pvKwp: 150, pvNowKwp: 0, loads: {machines: 20, koeling: 270, licht: 10, warmte: 0, laden: 30}},
  {id: 7, name: 'Houtbewerking', address: 'Ringweg 1', minKw: 80, pvKwp: 0, pvNowKwp: 0, loads: {machines: 150, koeling: 0, licht: 15, warmte: 40, laden: 10}},
  {id: 8, name: 'Autobedrijf', address: 'Ringweg 3', minKw: 55, pvKwp: 70, pvNowKwp: 0, loads: {machines: 30, koeling: 0, licht: 20, warmte: 30, laden: 100}},
];

export type Rules = {
  /** Laadpalen niet in de avondpiek, maar overdag (zon) en 's nachts. */
  laden: boolean;
  /** Koelhuis koelt voor op de middag (zonpiek) en draait zuinig in de avond. */
  voorkoelen: boolean;
  /** Zware machines niet tegelijk opstarten: pieken worden gespreid. */
  spreiden: boolean;
};

export type Settings = {
  hub: boolean;
  season: Season;
  /** Afgesproken levering door de leverancier aan het terrein (kW). */
  capKw: number;
  batteryKwh: number;
  wind: boolean;
  parkLink: boolean;
  rules: Rules;
};

export const DEFAULT_SETTINGS: Settings = {
  hub: true,
  season: 'winter',
  capKw: 800,
  batteryKwh: 1600,
  wind: true,
  parkLink: true,
  rules: {laden: true, voorkoelen: true, spreiden: true},
};

export const STEPS = 96;
export const DT = 0.25; // uur per stap
export const PEAK_START = 17;
export const PEAK_END = 22;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const window_ = (h: number, a: number, b: number, edge = 0.75) => smoothstep(a - edge, a + edge, h) * (1 - smoothstep(b - edge, b + edge, h));
const bump = (h: number, c: number, w: number) => Math.exp(-Math.pow((h - c) / w, 2));
const noise = (h: number, seed: number) => 0.5 + 0.25 * Math.sin(h * 1.7 + seed * 2.1) + 0.25 * Math.sin(h * 0.63 + seed * 5.3);

/** Verbruik per categorie (kW) van één bedrijf op uur h. */
export const companyLoad = (c: Company, h: number, s: Settings): Record<Category, number> => {
  const winter = s.season === 'winter';
  const rules = s.hub ? s.rules : {laden: false, voorkoelen: false, spreiden: false};
  const L = c.loads;
  const start = c.shiftStart ?? 7;
  const end = c.shiftEnd ?? 17.5;

  // machines: werktijd met opstartpieken; spreiden haalt de toppen eraf
  const work = window_(h, start, end, 0.6);
  const peaks = bump(h, start + 1.2, 0.6) + bump(h, start + 6.2, 0.7);
  const machines = L.machines * work * (0.65 + 0.35 * noise(h, c.id)) + L.machines * 0.35 * peaks * (rules.spreiden ? 0.25 : 1);

  // koeling: altijd aan, zomer meer; voorkoelen verschuift avondverbruik naar de middag
  let koeling = L.koeling * (winter ? 0.55 : 0.85) * (0.85 + 0.15 * Math.sin(((h - 15) / 24) * Math.PI * 2));
  if (rules.voorkoelen) koeling *= 1 + 0.45 * window_(h, 11.5, 16, 0.5) - 0.4 * window_(h, PEAK_START, PEAK_END, 0.4);

  // licht & kantoor
  const licht = L.licht * (0.15 + 0.85 * window_(h, 7, 18)) * (winter ? 1 + 0.4 * window_(h, 16, 19, 0.5) : 0.8);

  // verwarming (warmtepomp): winter ochtend + avond, zomer bijna niets
  const warmte = L.warmte * (winter ? 0.35 + 0.65 * (bump(h, 7.5, 1.6) + 0.8 * bump(h, 18, 2.2)) : 0.08);

  // laadpalen: busjes en trucks komen 's avonds terug (17–22)
  const evening = window_(h, 17, 22, 0.5);
  const laden = rules.laden
    ? L.laden * (0.55 * window_(h, 11, 15.5, 0.5) + 0.5 * (window_(h, 22.5, 24, 0.3) + window_(h, 0, 5, 0.3)) + 0.12 * evening)
    : L.laden * (0.9 * evening + 0.15 * window_(h, 8, 16));

  return {machines, koeling, licht, warmte, laden};
};

/** Zonneproductie per kWp op uur h. */
export const solarPerKwp = (h: number, season: Season) => {
  const [rise, set, peak] = season === 'winter' ? [8.5, 16.5, 0.38] : [5.5, 21.5, 0.82];
  if (h <= rise || h >= set) return 0;
  const x = (h - rise) / (set - rise);
  const cloud = 0.85 + 0.15 * Math.sin(h * 2.3);
  return peak * Math.pow(Math.sin(Math.PI * x), 1.3) * cloud;
};

const PARK_KWP = 1400;
const WIND_KW = 300;

export type Step = {
  h: number;
  demand: number;
  solar: number;
  wind: number;
  grid: number; // uit het net (leverancier), incl. bijladen batterij
  gridToLoad: number; // deel van de netlevering dat direct naar de bedrijven gaat
  ownToLoad: number; // eigen opwek direct naar de bedrijven
  discharge: number; // batterij → terrein
  charge: number; // → batterij
  soc: number; // 0..1
  curtailed: number; // verspilde eigen opwek
  shortfall: number; // tekort boven de afspraak (congestie)
  shifted: number; // verbruik dat geschoven moet worden
  perCompany: {use: number; cats: Record<Category, number>; pv: number; shifted: number}[];
};

export type DayResult = {
  steps: Step[];
  kpi: {
    peakGrid: number;
    hoursOver: number;
    selfShare: number; // aandeel van verbruik uit eigen opwek (incl. via batterij)
    curtailedKwh: number;
    shortfallKwh: number;
    demandKwh: number;
  };
};

const runOnce = (s: Settings, soc0: number): DayResult => {
  const steps: Step[] = [];
  const cap = s.capKw;
  const capKwh = s.hub ? s.batteryKwh : 0;
  const power = capKwh * 0.5; // C-rate 0,5
  let soc = soc0;
  for (let i = 0; i < STEPS; i++) {
    const h = i * DT;
    const per = COMPANIES.map((c) => {
      const cats = companyLoad(c, h, s);
      const use = Object.values(cats).reduce((a, b) => a + b, 0);
      const pv = (s.hub ? c.pvKwp : c.pvNowKwp) * solarPerKwp(h, s.season);
      return {use, cats, pv, shifted: 0};
    });
    const demand = per.reduce((a, p) => a + p.use, 0);
    const roofPv = per.reduce((a, p) => a + p.pv, 0);
    const solar = roofPv + (s.hub && s.parkLink ? PARK_KWP * solarPerKwp(h, s.season) : 0);
    const wind = s.hub && s.wind ? WIND_KW * (s.season === 'winter' ? 0.55 : 0.3) * (0.4 + 1.2 * noise(h, 9)) : 0;

    let grid = 0;
    let gridCharge = 0;
    let charge = 0;
    let discharge = 0;
    let curtailed = 0;
    let shortfall = 0;

    if (!s.hub) {
      // Iedereen voor zich: eigen zon alleen achter de eigen meter, overschot gaat verloren.
      per.forEach((p) => {
        const own = Math.min(p.use, p.pv);
        curtailed += p.pv - own;
        grid += p.use - own;
      });
      shortfall = Math.max(0, grid - cap);
      grid = Math.min(grid, cap); // meer kan het net niet leveren
    } else {
      let net = demand - solar - wind;
      if (net < 0) {
        // overschot → batterij, rest gaat verloren (terugleveren kan niet)
        charge = Math.min(-net, power, ((1 - soc) * capKwh) / DT);
        curtailed = -net - charge;
        net = 0;
      } else {
        // piek afvlakken: batterij springt bij boven ~85% van de afspraak, en altijd in de avondpiek
        const inPeak = h >= PEAK_START && h < PEAK_END;
        const threshold = inPeak ? cap * 0.7 : cap * 0.85;
        if (net > threshold) {
          discharge = Math.min(net - threshold, power, (soc * capKwh) / DT);
          net -= discharge;
        }
        // 's nachts, ruim onder de afspraak: batterij bijladen uit het net voor de avondpiek
        if (!inPeak && (h < 6 || h >= 22) && net < cap * 0.6 && soc < 0.9) {
          charge = Math.min(cap * 0.6 - net, power, ((0.9 - soc) * capKwh) / DT);
          gridCharge = charge;
        }
      }
      grid = Math.min(cap, net + charge);
      shortfall = Math.max(0, net - cap);
    }

    // Tekort verdelen: iedereen houdt zijn minimum, de rest schuift naar rato van het verbruik daarboven.
    if (shortfall > 0) {
      const above = per.map((p, k) => Math.max(0, p.use - COMPANIES[k].minKw));
      const totalAbove = above.reduce((a, b) => a + b, 0) || 1;
      per.forEach((p, k) => {
        p.shifted = Math.min(above[k], (shortfall * above[k]) / totalAbove);
      });
    }

    soc = Math.min(1, Math.max(0, soc + ((charge - discharge) * DT) / Math.max(1, capKwh)));
    const gridToLoad = grid - gridCharge;
    const ownToLoad = Math.max(0, demand - gridToLoad - discharge - shortfall);
    steps.push({
      h, demand, solar, wind, grid, gridToLoad, ownToLoad, discharge, charge, soc: capKwh ? soc : 0, curtailed, shortfall,
      shifted: per.reduce((a, p) => a + p.shifted, 0),
      perCompany: per,
    });
  }
  const sum = (f: (x: Step) => number) => steps.reduce((a, x) => a + f(x), 0) * DT;
  const demandKwh = sum((x) => x.demand);
  const ownUsed = sum((x) => x.solar + x.wind - x.curtailed - x.charge) + sum((x) => x.discharge);
  return {
    steps,
    kpi: {
      peakGrid: Math.max(...steps.map((x) => x.grid + x.shortfall)),
      hoursOver: steps.filter((x) => x.shortfall > 0.5).length * DT,
      selfShare: Math.min(1, Math.max(0, ownUsed / demandKwh)),
      curtailedKwh: sum((x) => x.curtailed),
      shortfallKwh: sum((x) => x.shortfall),
      demandKwh,
    },
  };
};

/** Dag simuleren; tweede run start met de batterijstand van het eind van de eerste (stabiele dag). */
export const simulate = (s: Settings): DayResult => {
  const first = runOnce(s, 0.5);
  return runOnce(s, first.steps[STEPS - 1].soc || 0.5);
};

export type LogItem = {h: number; tone: 'red' | 'cyan' | 'yellow' | 'green'; text: string};

/** Gebeurtenissen uit de dag halen (voor het logboek). */
export const events = (r: DayResult, s: Settings): LogItem[] => {
  const out: LogItem[] = [];
  const fmt = (x: number) => `${Math.round(x)} kW`;
  let prev: Step | null = null;
  for (const x of r.steps) {
    if (prev) {
      if (x.shortfall > 0.5 && prev.shortfall <= 0.5)
        out.push({h: x.h, tone: 'red', text: s.hub ? `Vraag boven de afspraak: ${fmt(x.shortfall)} wordt geschoven, iedereen houdt zijn minimum` : `Net vol: ${fmt(x.grid)} gevraagd, ${fmt(s.capKw)} beschikbaar`});
      if (x.discharge > 5 && prev.discharge <= 5) out.push({h: x.h, tone: 'cyan', text: `Batterij vangt de piek op (${fmt(x.discharge)})`});
      if (x.charge > 5 && prev.charge <= 5 && x.solar + x.wind > x.demand) out.push({h: x.h, tone: 'green', text: 'Overschot eigen opwek gaat de batterij in'});
      if (x.curtailed > 5 && prev.curtailed <= 5)
        out.push({h: x.h, tone: 'yellow', text: s.hub ? 'Batterij vol: zonnestroom over' : 'Zonnestroom kan het net niet op (terugleveren: rood)'});
      if (s.hub && x.soc >= 0.99 && prev.soc < 0.99) out.push({h: x.h, tone: 'green', text: 'Batterij vol'});
    }
    prev = x;
  }
  return out;
};

export const fmtTime = (h: number) => {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`;
};
