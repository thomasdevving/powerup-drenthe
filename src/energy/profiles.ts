/**
 * Illustratieve bedrijfsprofielen, gedeeld door dashboard en video.
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

export type ThermalSettings = {
  enabled: boolean;
  cop: number;
  bufferKwh: number;
  networkLoss: number;
  recovery: number;
};
export const DEFAULT_THERMAL: ThermalSettings = {enabled: true, cop: 4, bufferKwh: 600, networkLoss: 0.08, recovery: 0.55};

export type Settings = {
  hub: boolean;
  season: Season;
  /** Afgesproken levering door de leverancier aan het terrein (kW). */
  capKw: number;
  batteryKwh: number;
  wind: boolean;
  parkLink: boolean;
  rules: Rules;
  thermal?: ThermalSettings;
};

export const DEFAULT_SETTINGS: Settings = {
  hub: true,
  thermal: DEFAULT_THERMAL,
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

export const PARK_KWP = 1400;
export const WIND_KW = 300;

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
  shifted: number; // werkelijk gepland verbruik; ongeleverde vraag staat in shortfall
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

export type LogItem = {h: number; tone: 'red' | 'cyan' | 'yellow' | 'green'; text: string};

/** Gebeurtenissen uit de dag halen (voor het logboek). */
export const events = (r: DayResult, s: Settings): LogItem[] => {
  const out: LogItem[] = [];
  const fmt = (x: number) => `${Math.round(x)} kW`;
  let prev: Step | null = null;
  for (const x of r.steps) {
    if (prev) {
      if (x.shortfall > 0.5 && prev.shortfall <= 0.5)
        out.push({h: x.h, tone: 'red', text: s.hub ? `Niet geleverde vraag: ${fmt(x.shortfall)}; extra maatregelen nodig` : `Net vol: ${fmt(x.grid)} gevraagd, ${fmt(s.capKw)} beschikbaar`});
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

/* ------------------------------------------------------------------ facturatie */

/**
 * Indicatieve tarieven (excl. btw). Met Energy Hub stuurt de leverancier één factuur aan de
 * coöperatie; de coöperatie verdeelt die per bedrijf op basis van de meetdata uit het dashboard.
 */
export const TARIFF = {
  grid: 0.24, // €/kWh uit het net (energie + netkosten, all-in)
  own: 0.12, // €/kWh intern tarief voor zon/wind uit het eigen smart grid
  battery: 0.16, // €/kWh uit de batterij (incl. afschrijving opslag)
  capacityPerKwDay: 0.3, // € per kW per dag: zonder hub per eigen piek, met hub per gegarandeerd minimum
  flexCredit: 0.06, // €/kWh vergoeding voor geschoven verbruik
  feedInCredit: 0.1, // €/kWh vergoeding voor eigen dakopwek die het smart grid in gaat
};

export type BillLine = {label: string; detail: string; amount: number};

export type CompanyBill = {
  id: number;
  name: string;
  useKwh: number;
  gridKwh: number;
  ownKwh: number;
  batteryKwh: number;
  shiftedKwh: number;
  unservedKwh: number;
  peakKw: number;
  roofKwh: number;
  lines: BillLine[];
  total: number;
};

const eur = (x: number) => x;

export const billing = (r: DayResult, s: Settings): CompanyBill[] =>
  COMPANIES.map((c, k) => {
    let useKwh = 0;
    let gridKwh = 0;
    let ownKwh = 0;
    let batteryKwh = 0;
    let shiftedKwh = 0;
    let unservedKwh = 0;
    let roofKwh = 0;
    let peakKw = 0;
    for (const st of r.steps) {
      const p = st.perCompany[k];
      useKwh += p.use * DT;
      peakKw = Math.max(peakKw, p.use);
      roofKwh += p.pv * DT;
      if (s.hub) {
        unservedKwh += st.shortfall * (st.demand ? p.use / st.demand : 0) * DT;
        // pool: ieder bedrijf krijgt naar rato van zijn verbruik uit net, eigen opwek en batterij
        const share = st.demand > 0 ? p.use / st.demand : 0;
        gridKwh += st.gridToLoad * share * DT;
        ownKwh += st.ownToLoad * share * DT;
        batteryKwh += st.discharge * share * DT;
        shiftedKwh += p.shifted * DT;
      } else {
        const own = Math.min(p.use, p.pv);
        ownKwh += own * DT;
        const share = st.grid + st.shortfall > 0 ? (p.use - own) / (st.grid + st.shortfall) : 0;
        gridKwh += st.grid * share * DT;
        unservedKwh += st.shortfall * share * DT;
      }
    }
    const lines: BillLine[] = s.hub
      ? [
          {label: 'Stroom via leverancier', detail: `${Math.round(gridKwh)} kWh × € ${TARIFF.grid.toFixed(2)}`, amount: eur(gridKwh * TARIFF.grid)},
          {label: 'Zon & wind uit het smart grid', detail: `${Math.round(ownKwh)} kWh × € ${TARIFF.own.toFixed(2)}`, amount: eur(ownKwh * TARIFF.own)},
          {label: 'Uit de batterij', detail: `${Math.round(batteryKwh)} kWh × € ${TARIFF.battery.toFixed(2)}`, amount: eur(batteryKwh * TARIFF.battery)},
          {label: 'Bijdrage coöperatie (minimum)', detail: `${c.minKw} kW × € ${TARIFF.capacityPerKwDay.toFixed(2)}`, amount: eur(c.minKw * TARIFF.capacityPerKwDay)},
          ...(roofKwh > 0.5 ? [{label: 'Vergoeding eigen dakopwek', detail: `${Math.round(roofKwh)} kWh × € ${TARIFF.feedInCredit.toFixed(2)}`, amount: -eur(roofKwh * TARIFF.feedInCredit)}] : []),
          ...(shiftedKwh > 0.5 ? [{label: 'Flexvergoeding (geschoven)', detail: `${Math.round(shiftedKwh)} kWh × € ${TARIFF.flexCredit.toFixed(2)}`, amount: -eur(shiftedKwh * TARIFF.flexCredit)}] : []),
        ]
      : [
          {label: 'Stroom via eigen aansluiting', detail: `${Math.round(gridKwh)} kWh × € ${TARIFF.grid.toFixed(2)}`, amount: eur(gridKwh * TARIFF.grid)},
          {label: 'Capaciteitstarief (eigen piek)', detail: `${Math.round(peakKw)} kW × € ${TARIFF.capacityPerKwDay.toFixed(2)}`, amount: eur(peakKw * TARIFF.capacityPerKwDay)},
        ];
    if (unservedKwh > 0.5) lines.push({label: 'Niet geleverd (niet gefactureerd)', detail: `${Math.round(unservedKwh)} kWh tekort; productie niet gegarandeerd`, amount: 0});
    const total = lines.reduce((a, l) => a + l.amount, 0);
    return {id: c.id, name: c.name, useKwh, gridKwh, ownKwh, batteryKwh, shiftedKwh, unservedKwh, peakKw, roofKwh, lines, total};
  });
