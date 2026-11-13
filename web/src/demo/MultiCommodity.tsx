import React, {useMemo, useState} from 'react';
import {COMPANIES, DEFAULT_THERMAL, fmtTime, type Settings} from './sim';
import {ASSUMPTIONS, compareScenarios, scenarioFor, SCENARIO_NAMES, type EnergyDay} from '../../../src/energy/model';
import './multi.css';

const n = (v: number) => Math.round(v).toLocaleString('nl-NL');
const eur = (v: number) => v.toLocaleString('nl-NL', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0});
const colors = {electric: '#ffd23f', heat: '#ff9d2e', cold: '#65baff', green: '#4ef08a'};

function BalanceChart({day, t, onTime}: {day: EnergyDay; t: number; onTime: (t: number) => void}) {
  const maxE = Math.max(1, ...day.steps.map(x => x.demand));
  const maxH = Math.max(1, ...day.steps.map(x => x.heatDemand));
  const path = (get: (x: EnergyDay['steps'][number]) => number, max: number, top: number) =>
    day.steps.map((x, i) => `${i ? 'L' : 'M'}${45 + x.h / 24 * 800},${top + 105 - get(x) / max * 95}`).join(' ');
  return <svg viewBox="0 0 890 300" role="img" aria-label="Elektriciteits- en warmtebalans over 24 uur" onClick={e => {
    const r = e.currentTarget.getBoundingClientRect();
    onTime(Math.min(23.75, Math.max(0, Math.round((((e.clientX - r.left) / r.width * 890 - 45) / 800 * 24) * 4) / 4)));
  }}>
    <text x="45" y="18" fill={colors.electric}>Elektriciteit · kW · schaal 0–{n(maxE)}</text>
    <text x="45" y="153" fill={colors.heat}>Warmte · kWth · schaal 0–{n(maxH)}</text>
    {[0, 6, 12, 18, 24].map(h => <g key={h}><line x1={45 + h / 24 * 800} x2={45 + h / 24 * 800} y1="28" y2="265" stroke="#ffffff15"/><text x={45 + h / 24 * 800} y="288" textAnchor="middle" fill="#b4c4d1">{h}u</text></g>)}
    <path d={path(x => x.demand, maxE, 25)} fill="none" stroke={colors.electric} strokeWidth="2"/>
    <path d={path(x => x.grid, maxE, 25)} fill="none" stroke="#21e6d0" strokeWidth="2"/>
    <path d={path(x => x.heatDemand, maxH, 160)} fill="none" stroke={colors.heat} strokeWidth="2"/>
    <path d={path(x => x.directHeat + x.bufferDischarge, maxH, 160)} fill="none" stroke={colors.green} strokeWidth="2"/>
    <line x1={45 + t / 24 * 800} x2={45 + t / 24 * 800} y1="28" y2="265" stroke="white" strokeDasharray="4 4"/>
  </svg>;
}

export function MultiCommodity({s, set, t, onTime}: {s: Settings; set: (s: Partial<Settings>) => void; t: number; onTime: (t: number) => void}) {
  const th = {...DEFAULT_THERMAL, ...s.thermal};
  const days = useMemo(() => compareScenarios(s), [s]);
  const day = days.find(d => d.scenario === scenarioFor(s))!;
  const x = day.steps[Math.min(95, Math.floor(t * 4))];
  const [company, setCompany] = useState(5);
  const patch = (p: Partial<typeof th>) => set({thermal: {...th, ...p}});
  const c = COMPANIES[company];
  return <section className="panel multi" aria-labelledby="multi-title">
    <div className="panel-head"><div><div className="multi-eyebrow">Eén terrein · drie energiedragers</div><h2 id="multi-title">Multi-Commodity Energy Management</h2></div><span className="multi-badge">Illustratieve profielen · {fmtTime(x.h)}</span></div>
    <p className="note">Dezelfde berekening voedt het dagprofiel, de bedrijfsgegevens, facturatie en de pitchvideo. Kies een scenario of schakel het warmtenet in: de elektriciteitsvraag verandert mee.</p>
    <div className="multi-switches">
      {days.map(d => <button key={d.scenario} aria-pressed={d.scenario === day.scenario} onClick={() => set({hub: d.scenario !== 'A', thermal: {...th, enabled: d.scenario === 'C'}})}>{d.scenario} · {SCENARIO_NAMES[d.scenario]}</button>)}
      <label><input type="checkbox" checked={s.hub && th.enabled} disabled={!s.hub} onChange={e => patch({enabled: e.target.checked})}/> Warmtenet actief</label>
    </div>
    <div className="multi-controls">
      <label title="Warmte uit de pomp gedeeld door zijn stroomgebruik. Een lagere COP kan de netpiek verhogen.">Warmtepomp-COP <b>{th.cop.toFixed(1)}</b><input aria-label="Warmtepomp-COP" type="range" min="2" max="6" step="0.1" value={th.cop} onChange={e => patch({cop: +e.target.value})}/></label>
      <label title="Bruikbare thermische opslag, met 0,5% verlies per uur en maximaal 250 kWth laden of ontladen.">Warmtebuffer <b>{n(th.bufferKwh)} kWhth</b><input aria-label="Warmtebuffer" type="range" min="0" max="1600" step="100" value={th.bufferKwh} onChange={e => patch({bufferKwh: +e.target.value})}/></label>
      <label title="Het deel van de onttrokken bronwarmte dat onderweg verloren gaat.">Leidingverlies <b>{n(th.networkLoss * 100)}%</b><input aria-label="Leidingverlies" type="range" min="0" max="0.3" step="0.01" value={th.networkLoss} onChange={e => patch({networkLoss: +e.target.value})}/></label>
      <label title="Alleen technisch terugwinbare condensatiewarmte is beschikbaar voor het net.">Terugwinbaar <b>{n(th.recovery * 100)}%</b><input aria-label="Terugwinbaar aandeel" type="range" min="0" max="1" step="0.05" value={th.recovery} onChange={e => patch({recovery: +e.target.value})}/></label>
    </div>
    <div className="carrier-grid">
      <article style={{borderColor: colors.electric}}><h3 style={{color: colors.electric}}>Elektriciteit</h3><strong>{n(x.demand)} <small>kW vraag</small></strong><p>{n(x.solar + x.wind)} kW lokale opwek · {n(x.grid)} kW import</p><p>Batterij {n(x.batteryKwh)} / {n(s.hub ? s.batteryKwh : 0)} kWh · export 0 kW</p><p>Gevraagde netpiek {n(day.kpi.peakRequired)} kW · grens {n(s.capKw)} kW</p></article>
      <article style={{borderColor: colors.heat}}><h3 style={{color: colors.heat}}>Warmte</h3><strong>{n(x.directHeat + x.bufferDischarge)} <small>kWth nuttig geleverd</small></strong><p>{n(x.availableHeat)} kWth bron · {n(x.heatDemand)} kWth vraag</p><p>Aanvullend {n(x.backupHeat)} kWth · pomp {n(x.heatPumpElectric + x.pumpElectric)} kW elektrisch</p><p>Buffer {n(x.bufferKwh)} / {n(day.scenario === 'C' && th.enabled ? th.bufferKwh : 0)} kWhth · {x.bufferCharge > 0.1 ? 'laden' : x.bufferDischarge > 0.1 ? 'ontladen' : 'stand-by'}</p></article>
      <article style={{borderColor: colors.cold}}><h3 style={{color: colors.cold}}>Koude</h3><strong>{n(x.coldDemand)} <small>kWth koelvraag</small></strong><p>{n(x.coolingElectric)} kW actieve koeling · EER {ASSUMPTIONS.coolingEer}</p><p>{n(x.rejectedHeat)} kWth condensatiewarmte, inclusief koelstroom</p><p>Koudebuffer {n(x.coldStoreKwh)} / {s.hub && s.rules.voorkoelen ? 400 : 0} kWhth · WKO optioneel, buiten simulatie.</p></article>
    </div>
    <div className="multi-flow">
      <svg viewBox="0 0 900 330" aria-label="Energiestromen tussen koelbedrijven, warmtepomp, opslag en afnemers" role="group">
        <defs><marker id="heat-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill={colors.heat}/></marker></defs>
        <path d="M205 115H340M520 115H600V65H680M600 115V155H680M600 155V245H680" className={x.sourceUsed > 0.1 ? 'heat-flow active' : 'heat-flow'} markerEnd="url(#heat-arrow)"/>
        <path d="M430 145V215" className={x.bufferCharge > 0.1 || x.bufferDischarge > 0.1 ? 'heat-flow active' : 'heat-flow'} markerEnd="url(#heat-arrow)"/>
        <path d="M55 48H125V90" stroke={colors.electric} strokeWidth="4" fill="none"/>
        <path d="M60 165H140V145" stroke={colors.cold} strokeWidth="4" fill="none"/>
        <text x="55" y="32" fill={colors.electric}>{n(x.coolingElectric)} kW koeling</text><text x="55" y="195" fill={colors.cold}>{n(x.coldDemand)} kWth koude</text>
        <g role="button" tabIndex={0} aria-label="Bekijk koelhuis" onClick={() => setCompany(5)} onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); setCompany(5);}}}>
          <rect x="45" y="90" width="175" height="55" rx="10" fill="#1b3545"/><text x="132" y="114" fill="white" textAnchor="middle">Koelbedrijven</text><text x="132" y="134" fill="#b4c4d1" textAnchor="middle" fontSize="12">o.a. koel- en vrieshuis</text>
        </g>
        <rect x="340" y="90" width="180" height="55" rx="10" fill="#433024"/><text x="430" y="123" fill="white" textAnchor="middle">Warmtepomp</text>
        <text x="430" y="60" fill={colors.heat} textAnchor="middle">{n(x.sourceUsed)} kWth bron</text><text x="430" y="177" fill={colors.electric} textAnchor="middle">{n(x.heatPumpElectric + x.pumpElectric)} kW stroom</text>
        <rect x="330" y="215" width="200" height="58" rx="10" fill="#433024"/><text x="430" y="240" fill="white" textAnchor="middle">Buffer {n(x.bufferKwh)} kWhth</text><text x="430" y="261" fill="#b4c4d1" fontSize="12" textAnchor="middle">{x.bufferCharge > .1 ? 'laden' : x.bufferDischarge > .1 ? 'ontladen' : 'stand-by'} · {n(x.bufferCharge || x.bufferDischarge)} kWth</text>
        {[{ci: 0, label: 'Metaalbewerking', q: x.perDelivered[0]}, {ci: 3, label: 'Logistiek / kantoor', q: x.perDelivered[3]}, {ci: 7, label: 'Overige bedrijven', q: x.perDelivered.reduce((v, q, i) => v + (i === 0 || i === 3 ? 0 : q), 0)}].map((v, i) => <g key={v.ci} role="button" tabIndex={0} aria-label={`Bekijk ${v.label}`} onClick={() => setCompany(v.ci)} onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); setCompany(v.ci);}}}>
          <rect x="680" y={35 + i * 90} width="195" height="60" rx="10" fill="#283c2e"/><text x="777" y={60 + i * 90} fill="white" textAnchor="middle">{v.label}</text><text x="777" y={82 + i * 90} fill={colors.heat} textAnchor="middle">{n(v.q)} kWth ontvangen</text>
        </g>)}
        <text x="45" y="307" fill="#b4c4d1">Leidingverlies {n(x.networkLoss)} kWth · ongebruikt {n(x.unusedHeat)} kWth · klik op een bedrijf</text>
      </svg>
    </div>
    <div className="multi-company"><label>Bekijk bedrijf <select aria-label="Bedrijf warmte en koude" value={company} onChange={e => setCompany(+e.target.value)}>{COMPANIES.map((v, i) => <option key={v.id} value={i}>{v.name}</option>)}</select></label><p><b>{c.name}</b> · warmtevraag {n(x.perHeat[company])} kWth · uit net/buffer {n(x.perDelivered[company])} kWth · koelvraag {n(x.perCold[company])} kWth</p></div>
    <div className="multi-daychart"><BalanceChart day={day} t={t} onTime={onTime}/></div>
    <p className="note">Geel: elektriciteitsvraag · cyaan: netimport · oranje: warmtevraag · groen: warmte uit net en buffer. Klik op een tijdstip; de tijdlijn hierboven bedient alle grafieken.</p>
    <div className="multi-balances"><p><b>Elektrische balans {fmtTime(x.h)}</b><br/>{n(x.grid)} net + {n(x.solar + x.wind)} opwek + {n(x.discharge)} batterij + {n(x.shortfall)} tekort = {n(x.demand)} vraag + {n(x.charge)} laden + {n(x.curtailed)} afregelen (kW).</p><p><b>Warmtebalans</b><br/>{n(x.heatPumpHeat)} warmtepomp + {n(x.backupHeat)} aanvullend + {n(x.bufferDischarge)} buffer = {n(x.heatDemand)} vraag + {n(x.bufferCharge)} opslaan (kWth). Afrondingsverschillen mogelijk.</p></div>
    <h3>Dezelfde dag, drie scenario’s</h3>
    <div className="multi-table"><table><thead><tr><th>Per etmaal</th>{days.map(d => <th key={d.scenario}>{d.scenario} · {SCENARIO_NAMES[d.scenario]}</th>)}</tr></thead><tbody>
      {([
        ['Gevraagde netpiek', (d: EnergyDay) => `${n(d.kpi.peakRequired)} kW`],
        ['Werkelijke importpiek', (d: EnergyDay) => `${n(d.kpi.peakImport)} kW`],
        ['Totale import', (d: EnergyDay) => `${n(d.kpi.importKwh)} kWh`],
        ['Nuttige net-/bufferwarmte¹', (d: EnergyDay) => `${n(d.kpi.usefulHeatKwh)} kWhth`],
        ['Teruggewonnen bronwarmte¹', (d: EnergyDay) => `${n(d.kpi.recoveredSourceKwh)} kWhth`],
        ['Aanvullende warmte', (d: EnergyDay) => `${n(d.kpi.backupHeatKwh)} kWhth`],
        ['Niet geleverde elektriciteit', (d: EnergyDay) => `${n(d.kpi.shortfallKwh)} kWh`],
        ['Indicatieve importkosten²', (d: EnergyDay) => eur(d.kpi.operatingCost)],
        ['Kostenvoordeel t.o.v. A²', (d: EnergyDay) => days[0].kpi.shortfallKwh > 0.01 || d.kpi.shortfallKwh > 0.01 ? 'Geen eerlijke vergelijking: tekort' : d.kpi.operatingCost >= days[0].kpi.operatingCost ? 'Geen kostenvoordeel' : eur(days[0].kpi.operatingCost - d.kpi.operatingCost)],
        ['Investering', () => 'Locatiespecifieke businesscase nodig'],
      ] as [string, (d: EnergyDay) => string][]).map(([label, get]) => <tr key={label}><th scope="row">{label}</th>{days.map(d => <td key={d.scenario}>{get(d)}</td>)}</tr>)}
    </tbody></table></div>
    <p className="note">¹ Niet optellen: geleverde warmte bevat ook warmtepompstroom; bronwarmte is vóór leidingverlies. ² Alleen netinkoop à €0,24/kWh, excl. onderhoud, investeringen, belastingen en coöperatieve verrekening. Kosten zijn geen volledige businesscase. Bij tekorten zijn de warmte- en koudewaarden de geplande diensten; uitvoering is niet gegarandeerd.</p>
    <details><summary>Aannames, grenzen en controle</summary><p>Alle scenario’s gebruiken dezelfde dagelijkse bedrijfsactiviteiten, warmtevraag en koelvraag. Proces- en laadtijden verschuiven met behoud van dagenergie. Voorkoelen gebruikt een illustratieve koudebuffer van 400 kWhth, maximaal 160 kWth en 0,5% verlies per uur; temperatuurregeling van individuele producten wordt niet gemodelleerd. Opwekcapaciteit is gelijk; A gebruikt alleen zon achter de eigen meter, B en C delen ook het gekoppelde park en de windturbine. Export staat op nul.</p><p>Alle opslag start leeg; eindvoorraad is zichtbaar in de tijdlijn. Batterij: 95% rendement per richting, maximaal 0,5 C. Warmte: lokale aanvullende warmtepomp COP 3, netwarmtepomp maximaal 450 kWth, buffer maximaal 250 kWth, 0,5% verlies per uur; circulatie vraagt 1,2% van bronvermogen elektrisch. Hoogste balansafwijking: {day.kpi.balanceError.toExponential(1)}. Geen gemeten bedrijfsdata of haalbaarheidsstudie.</p><p>Een eigen distributiesysteem vraagt passende contracten en wettelijke toetsing. Warmte-uitwisseling vereist geschikte bronnen, afnemers, temperatuur en afstand. Netverzwaring kan nodig blijven. WKO, waterstof, biogas en WKK maken geen deel uit van de actieve simulatie.</p></details>
  </section>;
}
