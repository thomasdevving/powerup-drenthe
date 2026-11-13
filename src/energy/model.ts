/** Illustratief kwartiermodel. kW elektrisch, kWth thermisch, opslag in kWh/kWhth.
 * Alle scenario's leveren dezelfde geplande diensten. Tekorten blijven expliciet staan.
 * Warmte en koude zijn berekende vraagprofielen, geen gemeten bedrijfsgegevens.
 */
import {COMPANIES, DEFAULT_SETTINGS, DEFAULT_THERMAL, DT, STEPS, PARK_KWP, WIND_KW,
  companyLoad, solarPerKwp, type Settings, type Category, type DayResult, type Step} from './profiles';

export type Scenario = 'A' | 'B' | 'C';
export const SCENARIO_NAMES = {A: 'Traditioneel', B: 'Elektrische Energy Hub', C: 'Multi-Commodity Energy Hub'};
export const ASSUMPTIONS = {coolingEer: 3, backupCop: 3, batteryEfficiency: 0.95,
  heatPumpKw: 450, bufferPowerKw: 250, bufferLossPerHour: 0.005, pumpFactor: 0.012, importPrice: 0.24,
  coldStorageKwh: 400, coldStoragePowerKw: 160, coldLossPerHour: 0.005};
export type EnergyStep = Step & {
  gridRequired: number; gridCharge: number; batteryKwh: number; batteryLoss: number;
  coldDemand: number; coolingElectric: number; rejectedHeat: number; availableHeat: number;
  sourceUsed: number; networkLoss: number; heatPumpHeat: number; heatPumpElectric: number; pumpElectric: number;
  heatDemand: number; directHeat: number; backupHeat: number; unusedHeat: number;
  bufferKwh: number; bufferCharge: number; bufferDischarge: number; bufferLoss: number;
  perHeat: number[]; perCold: number[]; perDelivered: number[];
  coldProduced: number; coldStoreKwh: number; coldCharge: number; coldDischarge: number; coldStoreLoss: number;
};
export type EnergyDay = {scenario: Scenario; steps: EnergyStep[]; electrical: DayResult; kpi: {
  peakRequired: number; peakImport: number; importKwh: number; usefulHeatKwh: number;
  recoveredSourceKwh: number; backupHeatKwh: number; heatDemandKwh: number; coldDemandKwh: number;
  heatPumpElectricKwh: number; unusedHeatKwh: number; shortfallKwh: number; operatingCost: number;
  bufferEndKwh: number; batteryEndKwh: number; balanceError: number;
}};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const close = (a: number, b: number, name: string) => {
  const error = Math.abs(a - b);
  if (error > 1e-6) throw new Error(`Energiebalans ${name}: ${a} ≠ ${b}`);
  return error;
};
const finiteRange = (v: number, min: number, max: number, name: string) => {
  if (!Number.isFinite(v) || v < min || v > max) throw new Error(`Ongeldige ${name}: ${v}`);
};

export function simulateEnergy(s: Settings = DEFAULT_SETTINGS, scenario: Scenario = 'C'): EnergyDay {
  const th = {...DEFAULT_THERMAL, ...s.thermal};
  finiteRange(s.capKw, 0, 1e6, 'netlimiet');
  finiteRange(s.batteryKwh, 0, 1e6, 'batterijcapaciteit');
  finiteRange(th.cop, 1.1, 10, 'COP');
  finiteRange(th.bufferKwh, 0, 1e6, 'warmtebuffer');
  finiteRange(th.networkLoss, 0, 0.9, 'leidingverlies');
  finiteRange(th.recovery, 0, 1, 'terugwinbaar aandeel');
  const hub = scenario !== 'A';
  const heatOn = scenario === 'C' && th.enabled;
  const capacity = hub ? s.batteryKwh : 0;
  const thermalCapacity = heatOn ? th.bufferKwh : 0;
  const a = ASSUMPTIONS;
  // Begin leeg: geen gratis energie uit een impliciete vorige dag.
  let battery = 0, buffer = 0, coldStore = 0, balanceError = 0;
  const baseline = Array.from({length: STEPS}, (_, i) => COMPANIES.map(c => companyLoad(c, i * DT, {...s, hub: false})));
  const planned = Array.from({length: STEPS}, (_, i) => COMPANIES.map(c => companyLoad(c, i * DT, {...s, hub})));
  // Alleen processen en laden verschuiven. Normalisatie conserveert de dagenergie per bedrijf.
  for (let j = 0; j < COMPANIES.length; j++) for (const cat of ['machines', 'laden'] as Category[]) {
    const original = sum(baseline.map(x => x[j][cat]));
    const scheduled = sum(planned.map(x => x[j][cat]));
    planned.forEach(x => { x[j][cat] *= scheduled > 0 ? original / scheduled : 0; });
  }
  const steps: EnergyStep[] = [];
  for (let i = 0; i < STEPS; i++) {
    const h = i * DT;
    const perHeat = baseline[i].map(c => c.warmte * a.backupCop);
    const perCold = baseline[i].map(c => c.koeling * a.coolingEer);
    const heatDemand = sum(perHeat), coldDemand = sum(perCold);
    const oldCold = coldStore;
    const coldStoreLoss = coldStore * a.coldLossPerHour * DT;
    coldStore -= coldStoreLoss;
    const coldStorageOn = hub && s.rules.voorkoelen;
    const coldCharge = coldStorageOn && h >= 11.5 && h < 16
      ? Math.min(a.coldStoragePowerKw, (a.coldStorageKwh - coldStore) / DT) : 0;
    const coldDischarge = coldStorageOn && h >= 17 && h < 22
      ? Math.min(a.coldStoragePowerKw, coldDemand, coldStore / DT) : 0;
    coldStore += (coldCharge - coldDischarge) * DT;
    const coldProduced = coldDemand + coldCharge - coldDischarge;
    const coolingElectric = coldProduced / a.coolingEer;
    const rejectedHeat = coldProduced + coolingElectric;
    const availableHeat = rejectedHeat * th.recovery;
    const oldBuffer = buffer;
    const bufferLoss = buffer * a.bufferLossPerHour * DT;
    buffer -= bufferLoss;
    // Ontladen in ochtend/avond: bronwarmte zoveel mogelijk direct, overschot overdag opslaan.
    const peak = h >= 17 && h < 22;
    const bufferDischarge = heatOn && (h < 9 || peak)
      ? Math.min(heatDemand, a.bufferPowerKw, buffer / DT) : 0;
    buffer -= bufferDischarge * DT;
    const remainingHeat = heatDemand - bufferDischarge;
    const chargeRoom = heatOn && !peak && h >= 9 && h < 17
      ? Math.min(a.bufferPowerKw, (thermalCapacity - buffer) / DT) : 0;
    const heatPumpHeat = heatOn ? Math.min(a.heatPumpKw, remainingHeat + chargeRoom,
      availableHeat * (1 - th.networkLoss) / (1 - 1 / th.cop)) : 0;
    const heatPumpElectric = heatPumpHeat / th.cop;
    const sourceUsed = heatOn ? (heatPumpHeat - heatPumpElectric) / (1 - th.networkLoss) : 0;
    const networkLoss = sourceUsed * th.networkLoss;
    const pumpElectric = sourceUsed * a.pumpFactor;
    const directHeat = Math.min(remainingHeat, heatPumpHeat);
    const bufferCharge = heatPumpHeat - directHeat;
    buffer += bufferCharge * DT;
    const backupHeat = remainingHeat - directHeat;
    const unusedHeat = availableHeat - sourceUsed;
    const heatElectric = heatPumpElectric + pumpElectric + backupHeat / a.backupCop;
    const perCompany = COMPANIES.map((c, j) => {
      const cats = {...planned[i][j], koeling: coldDemand ? coolingElectric * perCold[j] / coldDemand : 0,
        licht: baseline[i][j].licht, warmte: heatDemand ? heatElectric * perHeat[j] / heatDemand : 0};
      return {use: sum(Object.values(cats)), cats,
        pv: c.pvKwp * solarPerKwp(h, s.season), shifted: 0};
    });
    const demand = sum(perCompany.map(p => p.use));
    const park = s.parkLink ? PARK_KWP * solarPerKwp(h, s.season) : 0;
    const solar = sum(perCompany.map(p => p.pv)) + park;
    const wind = s.wind ? WIND_KW * (s.season === 'winter' ? 0.55 : 0.3) * (0.7 + 0.25 * Math.sin(h * 0.63 + 2)) : 0;
    const local = hub ? Math.min(demand, solar + wind) : sum(perCompany.map(p => Math.min(p.use, p.pv)));
    const surplus = solar + wind - local;
    let net = demand - local;
    const oldBattery = battery;
    let charge = 0, discharge = 0, gridCharge = 0;
    if (hub && surplus > 0) charge = Math.min(surplus, capacity * 0.5, (capacity - battery) / DT / a.batteryEfficiency);
    if (hub && net > s.capKw * (peak ? 0.7 : 0.85)) {
      discharge = Math.min(net - s.capKw * (peak ? 0.7 : 0.85), capacity * 0.5, battery * a.batteryEfficiency / DT);
      net -= discharge;
    } else if (hub && surplus < 1e-9 && (h < 6 || h >= 22) && net < s.capKw * 0.6) {
      gridCharge = Math.min(s.capKw * 0.6 - net, capacity * 0.5, (capacity - battery) / DT / a.batteryEfficiency);
      charge = gridCharge;
    }
    battery += (charge * a.batteryEfficiency - discharge / a.batteryEfficiency) * DT;
    const batteryLoss = (charge * (1 - a.batteryEfficiency) + discharge * (1 / a.batteryEfficiency - 1)) * DT;
    const gridRequired = net + gridCharge;
    const grid = Math.min(s.capKw, gridRequired);
    const shortfall = gridRequired - grid;
    const curtailed = surplus - (charge - gridCharge);
    const gridToLoad = grid - gridCharge;
    balanceError = Math.max(balanceError,
      close(grid + solar + wind + discharge + shortfall, demand + charge + curtailed, 'elektriciteit'),
      close(oldBattery + charge * DT, battery + discharge * DT + batteryLoss, 'batterij'),
      close(sourceUsed + heatPumpElectric, heatPumpHeat + networkLoss, 'warmtepomp'),
      close(heatPumpHeat + backupHeat + bufferDischarge, heatDemand + bufferCharge, 'warmte'),
      close(oldBuffer + bufferCharge * DT, buffer + bufferDischarge * DT + bufferLoss, 'buffer'),
      close(sourceUsed + unusedHeat, availableHeat, 'bron'),
      close(coldProduced + coolingElectric, rejectedHeat, 'koelinstallatie'),
      close(oldCold + coldCharge * DT, coldStore + coldDischarge * DT + coldStoreLoss, 'koudebuffer'),
      close(coldProduced + coldDischarge, coldDemand + coldCharge, 'koelvraag'));
    for (const [label, value] of Object.entries({battery, buffer, charge, discharge, shortfall, backupHeat, unusedHeat, sourceUsed}))
      if (!Number.isFinite(value) || value < -1e-7) throw new Error(`Negatieve/ongeldige stroom ${label}`);
    if (battery > capacity + 1e-6 || buffer > thermalCapacity + 1e-6 || coldStore < -1e-6 || coldStore > a.coldStorageKwh + 1e-6) throw new Error('Opslaggrens overschreden');
    steps.push({h, demand, solar, wind, grid, gridToLoad, gridRequired, gridCharge,
      ownToLoad: local, charge, discharge, soc: capacity ? battery / capacity : 0,
      curtailed, shortfall, shifted: 0, perCompany, batteryKwh: battery, batteryLoss,
      coldDemand, coolingElectric, rejectedHeat, availableHeat, sourceUsed, networkLoss,
      heatPumpHeat, heatPumpElectric, pumpElectric, heatDemand, directHeat, backupHeat, unusedHeat,
      bufferKwh: buffer, bufferCharge, bufferDischarge, bufferLoss, perHeat, perCold,
      perDelivered: perHeat.map(q => heatDemand ? (directHeat + bufferDischarge) * q / heatDemand : 0),
      coldProduced, coldStoreKwh: coldStore, coldCharge, coldDischarge, coldStoreLoss});
  }
  const integrate = (get: (x: EnergyStep) => number) => sum(steps.map(get)) * DT;
  const shortfallKwh = integrate(x => x.shortfall);
  const importKwh = integrate(x => x.grid);
  const demandKwh = integrate(x => x.demand);
  // Herkomst van batterij-energie niet als eigen opwek claimen; alleen directe lokale opwek telt.
  const electrical: DayResult = {steps, kpi: {peakGrid: Math.max(...steps.map(x => x.gridRequired)),
    hoursOver: steps.filter(x => x.shortfall > 0.5).length * DT,
    selfShare: demandKwh ? integrate(x => x.ownToLoad) / demandKwh : 0,
    curtailedKwh: integrate(x => x.curtailed), shortfallKwh, demandKwh}};
  return {scenario, steps, electrical, kpi: {
    peakRequired: electrical.kpi.peakGrid, peakImport: Math.max(...steps.map(x => x.grid)), importKwh,
    usefulHeatKwh: integrate(x => x.directHeat + x.bufferDischarge), recoveredSourceKwh: integrate(x => x.sourceUsed),
    backupHeatKwh: integrate(x => x.backupHeat), heatDemandKwh: integrate(x => x.heatDemand),
    coldDemandKwh: integrate(x => x.coldDemand), heatPumpElectricKwh: integrate(x => x.heatPumpElectric + x.pumpElectric),
    unusedHeatKwh: integrate(x => x.unusedHeat), shortfallKwh,
    operatingCost: importKwh * a.importPrice, bufferEndKwh: buffer, batteryEndKwh: battery, balanceError}};
}

export const scenarioFor = (s: Settings): Scenario => !s.hub ? 'A' : (s.thermal?.enabled ?? true) ? 'C' : 'B';
export const simulate = (s: Settings): DayResult => simulateEnergy(s, scenarioFor(s)).electrical;
export const compareScenarios = (s: Settings) => (['A', 'B', 'C'] as Scenario[]).map(id => simulateEnergy(s, id));
