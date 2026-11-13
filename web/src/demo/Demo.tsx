import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
  CATEGORY_LABEL,
  COMPANIES,
  DEFAULT_SETTINGS,
  PEAK_END,
  PEAK_START,
  STEPS,
  companyLoad,
  events,
  fmtTime,
  simulate,
  type Category,
  type DayResult,
  type Settings,
  type Step,
} from './sim';
import './demo.css';

/** Gevalideerde grafiekkleuren (donker oppervlak), afgeleid van de kleurcode van de video. */
const SERIES = {
  grid: {color: '#169c8f', label: 'Leverancier (afspraak)'},
  own: {color: '#b88a0d', label: 'Zon & wind (eigen opwek)'},
  battery: {color: '#2ea35c', label: 'Batterij'},
  short: {color: '#d9442b', label: 'Boven afspraak'},
};
const CAT_COLOR: Record<Category, string> = {
  machines: '#5f7fbf',
  koeling: '#169c8f',
  licht: '#b88a0d',
  warmte: '#c0603a',
  laden: '#8a60d8',
};

const kw = (x: number) => `${Math.round(x).toLocaleString('nl-NL')} kW`;
const kwh = (x: number) => `${Math.round(x).toLocaleString('nl-NL')} kWh`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

const useWidth = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [w, setW] = useState(800);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
};

/* ---------------------------------------------------------------- grafiek */

const DayChart: React.FC<{r: DayResult; s: Settings; t: number; onPick: (h: number) => void}> = ({r, s, t, onPick}) => {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 300;
  const L = 52;
  const R = 14;
  const T = 14;
  const B = 28;
  const maxV = Math.max(s.capKw, ...r.steps.map((st) => st.demand)) * 1.12;
  const yMax = Math.ceil(maxV / 200) * 200;
  const x = (h: number) => L + (h / 24) * (W - L - R);
  const y = (v: number) => T + (1 - v / yMax) * (H - T - B);

  // gestapelde lagen: leverancier → eigen opwek → batterij → boven afspraak
  const layers: {key: keyof typeof SERIES; get: (st: Step) => number}[] = [
    {key: 'grid', get: (st) => st.gridToLoad},
    {key: 'own', get: (st) => st.ownToLoad},
    {key: 'battery', get: (st) => st.discharge},
    {key: 'short', get: (st) => st.shortfall},
  ];
  const paths = layers.map((layer, li) => {
    const top: string[] = [];
    const bottom: string[] = [];
    r.steps.forEach((st, i) => {
      const base = layers.slice(0, li).reduce((a, l) => a + l.get(st), 0);
      const v = base + layer.get(st);
      top.push(`${x(st.h).toFixed(1)},${y(v).toFixed(1)}`);
      bottom.unshift(`${x(st.h).toFixed(1)},${y(base).toFixed(1)}`);
      if (i === STEPS - 1) {
        top.push(`${x(24).toFixed(1)},${y(v).toFixed(1)}`);
        bottom.unshift(`${x(24).toFixed(1)},${y(base).toFixed(1)}`);
      }
    });
    return {key: layer.key, d: `M${top.join('L')}L${bottom.join('L')}Z`};
  });
  const demandLine = r.steps.map((st, i) => `${i ? 'L' : 'M'}${x(st.h).toFixed(1)},${y(st.demand).toFixed(1)}`).join('') + `L${x(24)},${y(r.steps[STEPS - 1].demand)}`;
  const hs = hover ?? null;
  const hStep = hs !== null ? r.steps[Math.min(STEPS - 1, Math.floor(hs * 4))] : null;
  const ticks = [];
  for (let v = 0; v <= yMax; v += yMax > 1200 ? 400 : 200) ticks.push(v);

  const shortLabel = s.hub ? 'Geschoven (boven afspraak)' : 'Tekort: net vol';
  return (
    <div className="chart" ref={ref}>
      <div className="legend-row" role="list">
        {layers
          .filter((l) => l.key !== 'battery' || s.hub)
          .map((l) => (
            <span key={l.key} role="listitem">
              <i style={{background: SERIES[l.key].color}} />
              {l.key === 'short' ? shortLabel : SERIES[l.key].label}
            </span>
          ))}
        <span role="listitem">
          <i className="line" />
          Totale vraag
        </span>
        <span role="listitem">
          <i className="dash" />
          Afgesproken levering
        </span>
      </div>
      <svg
        width={W}
        height={H}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const h = ((e.clientX - rect.left - L) / (W - L - R)) * 24;
          setHover(h >= 0 && h < 24 ? h : null);
        }}
        onMouseLeave={() => setHover(null)}
        onClick={() => hover !== null && onPick(Math.floor(hover * 4) / 4)}
        role="img"
        aria-label="Dagprofiel van vraag en levering op het terrein"
      >
        <rect x={x(PEAK_START)} y={T} width={x(PEAK_END) - x(PEAK_START)} height={H - T - B} className="peakband" />
        <text x={(x(PEAK_START) + x(PEAK_END)) / 2} y={T + 14} className="peaklabel" textAnchor="middle">
          avondpiek
        </text>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
            <text x={L - 8} y={y(v) + 4} className="axis" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
          <text key={h} x={x(h)} y={H - 8} className="axis" textAnchor="middle">
            {String(h).padStart(2, '0')}:00
          </text>
        ))}
        {paths.map((p) => (
          <path key={p.key} d={p.d} fill={SERIES[p.key].color} stroke="#0e1a26" strokeWidth={1.5} strokeLinejoin="round" />
        ))}
        <path d={demandLine} fill="none" stroke="#f4f7f9" strokeWidth={2} strokeLinejoin="round" />
        <line x1={L} x2={W - R} y1={y(s.capKw)} y2={y(s.capKw)} className="cap" />
        <text x={W - R - 4} y={y(s.capKw) - 6} className="caplabel" textAnchor="end">
          afspraak {kw(s.capKw)}
        </text>
        {/* huidige tijd */}
        <line x1={x(t)} x2={x(t)} y1={T} y2={H - B} className="now" />
        {hs !== null ? <line x1={x(hs)} x2={x(hs)} y1={T} y2={H - B} className="hoverline" /> : null}
      </svg>
      {hStep ? (
        <div className="tip" style={{left: Math.min(x(hStep.h) + 12, W - 230), top: 40}}>
          <strong>{fmtTime(hStep.h)}</strong>
          <div><span>Totale vraag</span><b>{kw(hStep.demand)}</b></div>
          <div><i style={{background: SERIES.grid.color}} /><span>Leverancier</span><b>{kw(hStep.gridToLoad)}</b></div>
          <div><i style={{background: SERIES.own.color}} /><span>Eigen opwek</span><b>{kw(hStep.ownToLoad)}</b></div>
          {s.hub ? <div><i style={{background: SERIES.battery.color}} /><span>Batterij</span><b>{kw(hStep.discharge)}</b></div> : null}
          {hStep.shortfall > 0.5 ? <div><i style={{background: SERIES.short.color}} /><span>{s.hub ? 'Geschoven' : 'Tekort'}</span><b>{kw(hStep.shortfall)}</b></div> : null}
          <em>klik om naar dit moment te gaan</em>
        </div>
      ) : null}
    </div>
  );
};

const SocChart: React.FC<{r: DayResult; t: number; capKwh: number}> = ({r, t, capKwh}) => {
  const [ref, W] = useWidth<HTMLDivElement>();
  const H = 86;
  const L = 52;
  const R = 14;
  const T = 8;
  const B = 8;
  const x = (h: number) => L + (h / 24) * (W - L - R);
  const y = (v: number) => T + (1 - v) * (H - T - B);
  const line = r.steps.map((st, i) => `${i ? 'L' : 'M'}${x(st.h).toFixed(1)},${y(st.soc).toFixed(1)}`).join('');
  return (
    <div className="chart soc" ref={ref}>
      <div className="chart-sub">
        Batterij vulling <span>{kwh(capKwh)} totaal</span>
      </div>
      <svg width={W} height={H} role="img" aria-label="Vulling van de batterij over de dag">
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
            <text x={L - 8} y={y(v) + 4} className="axis" textAnchor="end">
              {v * 100}%
            </text>
          </g>
        ))}
        <path d={`${line}L${x(24)},${y(r.steps[STEPS - 1].soc)}L${x(24)},${y(0)}L${x(0)},${y(0)}Z`} fill={SERIES.battery.color} opacity={0.35} />
        <path d={line} fill="none" stroke={SERIES.battery.color} strokeWidth={2} />
        <line x1={x(t)} x2={x(t)} y1={T} y2={H - B} className="now" />
      </svg>
    </div>
  );
};

/* ---------------------------------------------------------------- bedrijven */

const advice = (ci: number, s: Settings, step: Step): string[] => {
  const c = COMPANIES[ci];
  const out: string[] = [];
  const evening = 19;
  const without = companyLoad(c, evening, {...s, rules: {laden: false, voorkoelen: false, spreiden: false}});
  const withRule = (k: keyof Settings['rules']) => companyLoad(c, evening, {...s, hub: true, rules: {laden: false, voorkoelen: false, spreiden: false, [k]: true}});
  const dLaden = without.laden - withRule('laden').laden;
  const dKoel = without.koeling - withRule('voorkoelen').koeling;
  if (dLaden > 15) out.push(s.hub && s.rules.laden ? `Laadpalen laden nu overdag en ’s nachts: ${kw(dLaden)} minder in de avondpiek.` : `Laadpalen pieken tussen 17 en 22 uur. Met de regel “laden buiten de piek” scheelt dat ${kw(dLaden)}.`);
  if (dKoel > 15) out.push(s.hub && s.rules.voorkoelen ? `Koelt voor op de middag met zonnestroom: ${kw(dKoel)} minder in de avondpiek.` : `Voorkoelen op de middag (zonpiek) scheelt ${kw(dKoel)} in de avondpiek.`);
  if (c.loads.machines > 100) out.push(s.hub && s.rules.spreiden ? 'Zware machines starten gespreid op: geen opstartpieken meer.' : 'Zware machines starten tegelijk op. Spreiden haalt de opstartpiek eraf.');
  const pv = (s.hub ? c.pvKwp : c.pvNowKwp);
  if (pv > 0) out.push(s.hub ? `Dak levert ${kw(step.perCompany[ci].pv)} zonnestroom aan het eigen smart grid.` : `Heeft zonnepanelen, maar kan overschot niet terugleveren.`);
  else if (!s.hub) out.push('Geen eigen opwek. Met de Energy Hub deelt dit pand in de zonnestroom van de buren en het zonnepark.');
  return out.slice(0, 3);
};

const Companies: React.FC<{step: Step; s: Settings; open: number | null; setOpen: (i: number | null) => void}> = ({step, s, open, setOpen}) => {
  const scale = 480;
  return (
    <div className="panel companies">
      <div className="panel-head">
        <h3>Bedrijven op het terrein</h3>
        <span className="muted">verbruik om {fmtTime(step.h)}</span>
      </div>
      <ul>
        {COMPANIES.map((c, i) => {
          const p = step.perCompany[i];
          const over = p.use > c.minKw;
          const status = p.shifted > 0.5
            ? {tone: 'red', text: s.hub ? `${kw(p.shifted)} geschoven` : 'Wacht op netcapaciteit'}
            : !s.hub && step.shortfall > 0.5
              ? {tone: 'red', text: 'Net vol'}
              : over
                ? {tone: 'cyan', text: 'Boven minimum, past'}
                : {tone: 'green', text: 'Binnen minimum'};
          const isOpen = open === i;
          return (
            <li key={c.id} className={isOpen ? 'open' : ''}>
              <button className="row" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}>
                <span className="num">{c.id}</span>
                <span className="who">
                  <b>{c.name}</b>
                  <small>{c.address}</small>
                </span>
                <span className="usebar" aria-hidden>
                  <span className="fill" style={{width: `${Math.min(100, ((p.use - p.shifted) / scale) * 100)}%`}} />
                  {p.shifted > 0.5 ? (
                    <span className="shift" style={{left: `${Math.min(100, ((p.use - p.shifted) / scale) * 100)}%`, width: `${Math.min(100, (p.shifted / scale) * 100)}%`}} />
                  ) : null}
                  <span className="min" style={{left: `${(c.minKw / scale) * 100}%`}} title="gegarandeerd minimum" />
                </span>
                <span className="val">{kw(p.use)}</span>
                <span className={`chip ${status.tone}`}>{status.text}</span>
              </button>
              {isOpen ? (
                <div className="detail">
                  <div className="cats">
                    {(Object.keys(p.cats) as Category[]).filter((k) => p.cats[k] > 0.5).map((k) => (
                      <div key={k} className="cat">
                        <i style={{background: CAT_COLOR[k]}} />
                        <span>{CATEGORY_LABEL[k]}</span>
                        <span className="catbar"><span style={{width: `${(p.cats[k] / Math.max(1, p.use)) * 100}%`, background: CAT_COLOR[k]}} /></span>
                        <b>{kw(p.cats[k])}</b>
                      </div>
                    ))}
                  </div>
                  <div className="facts">
                    <div><span>Gegarandeerd minimum</span><b>{kw(c.minKw)}</b></div>
                    {p.pv > 0.5 ? <div><span>Eigen zonnestroom nu</span><b>{kw(p.pv)}</b></div> : null}
                  </div>
                  <ul className="advice">
                    {advice(i, s, step).map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="foot muted">
        <span className="min-legend" /> gegarandeerd minimum per bedrijf · daarboven wordt geschoven of zelf opgewekt
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- bediening */

const Seg: React.FC<{value: string; options: {v: string; label: string; tone?: string}[]; onChange: (v: string) => void; label: string}> = ({value, options, onChange, label}) => (
  <div className="seg" role="radiogroup" aria-label={label}>
    {options.map((o) => (
      <button key={o.v} role="radio" aria-checked={value === o.v} className={value === o.v ? `on ${o.tone ?? ''}` : ''} onClick={() => onChange(o.v)}>
        {o.label}
      </button>
    ))}
  </div>
);

const Toggle: React.FC<{on: boolean; onChange: (v: boolean) => void; title: string; text?: string; disabled?: boolean}> = ({on, onChange, title, text, disabled}) => (
  <label className={`toggle-row ${disabled ? 'disabled' : ''}`}>
    <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span className="switch" aria-hidden />
    <span>
      <b>{title}</b>
      {text ? <small>{text}</small> : null}
    </span>
  </label>
);

const Controls: React.FC<{s: Settings; set: (p: Partial<Settings>) => void}> = ({s, set}) => (
  <aside className="panel controls">
    <h3>Scenario</h3>
    <Seg
      label="Situatie"
      value={s.hub ? 'hub' : 'nu'}
      onChange={(v) => set({hub: v === 'hub'})}
      options={[{v: 'nu', label: 'Zonder hub', tone: 'red'}, {v: 'hub', label: 'Met Energy Hub', tone: 'cyan'}]}
    />
    <Seg label="Seizoen" value={s.season} onChange={(v) => set({season: v as Settings['season']})} options={[{v: 'winter', label: 'Winter'}, {v: 'zomer', label: 'Zomer'}]} />

    <label className="slider">
      <span>
        Afgesproken levering <b>{kw(s.capKw)}</b>
      </span>
      <input type="range" min={500} max={1300} step={50} value={s.capKw} onChange={(e) => set({capKw: Number(e.target.value)})} />
      <small>Wat de leverancier aan het hele terrein levert, “zoals afgesproken”.</small>
    </label>

    <div className={s.hub ? '' : 'dimmed'}>
      <h3>Energy Hub</h3>
      <label className="slider">
        <span>
          Batterij <b>{kwh(s.batteryKwh)}</b>
        </span>
        <input type="range" min={0} max={4000} step={200} value={s.batteryKwh} disabled={!s.hub} onChange={(e) => set({batteryKwh: Number(e.target.value)})} />
      </label>
      <Toggle on={s.parkLink} disabled={!s.hub} onChange={(v) => set({parkLink: v})} title="Zonnepark gekoppeld" text="1,4 MWp direct naar de hub" />
      <Toggle on={s.wind} disabled={!s.hub} onChange={(v) => set({wind: v})} title="Windturbine" text="300 kW, ook ’s avonds" />

      <h3>Gedragsregels <span className="muted">door de community</span></h3>
      <Toggle on={s.rules.laden} disabled={!s.hub} onChange={(v) => set({rules: {...s.rules, laden: v}})} title="Laden buiten de avondpiek" text="Laadpalen overdag (zon) of ’s nachts" />
      <Toggle on={s.rules.voorkoelen} disabled={!s.hub} onChange={(v) => set({rules: {...s.rules, voorkoelen: v}})} title="Voorkoelen op de middag" text="Koelhuis koelt met zonnestroom vooruit" />
      <Toggle on={s.rules.spreiden} disabled={!s.hub} onChange={(v) => set({rules: {...s.rules, spreiden: v}})} title="Opstartpieken spreiden" text="Zware machines niet tegelijk aan" />
      {!s.hub ? <p className="note">Zet “Met Energy Hub” aan om de hub en de regels te gebruiken.</p> : null}
    </div>
  </aside>
);

/* ---------------------------------------------------------------- KPI's */

const Kpi: React.FC<{label: string; value: string; other: string; better: boolean | null; hint: string}> = ({label, value, other, better, hint}) => (
  <div className="kpi">
    <div className="k-label">{label}</div>
    <div className="k-value">{value}</div>
    <div className="k-cmp">
      {better === null ? null : <span className={better ? 'up' : 'down'}>{better ? '▲ beter' : '▼ slechter'}</span>} {hint}: {other}
    </div>
  </div>
);

/* ---------------------------------------------------------------- pagina */

export const Demo: React.FC<{tabs: React.ReactNode}> = ({tabs}) => {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const set = (p: Partial<Settings>) => setS((prev) => ({...prev, ...p}));
  const r = useMemo(() => simulate(s), [s]);
  const other = useMemo(() => simulate({...s, hub: !s.hub}), [s]);
  const log = useMemo(() => events(r, s), [r, s]);

  const [t, setT] = useState(6);
  const [playing, setPlaying] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT((v) => (v + dt * 0.9) % 24); // ~27 s per dag
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const step = r.steps[Math.min(STEPS - 1, Math.floor(t * 4))];
  const k = r.kpi;
  const ko = other.kpi;
  const cmpLabel = s.hub ? 'zonder hub' : 'met hub';
  const peakNow = step.h >= PEAK_START && step.h < PEAK_END;
  const pastLog = log.filter((e) => e.h <= t).slice(-5).reverse();

  return (
    <div className="demo">
      <header className="d-top">
        <div className="brand">
          <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#21e6d0" strokeWidth="9" />
            <path d="M54 18 L32 54 L50 54 L44 82 L68 44 L50 44 Z" fill="#ffd23f" />
          </svg>
          <div>
            <div className="name">Energy Hub</div>
            <div className="sub">Smart grid-dashboard · demo</div>
          </div>
        </div>
        {tabs}
      </header>

      <section className="intro">
        <h1>Eén afspraak met de leverancier. Het terrein verdeelt zelf.</h1>
        <p>
          Simuleer een dag op een Drents bedrijventerrein. Zie per adres wat er nodig is, hoe de batterij pieken opvangt en hoe gedragsregels de avondpiek verschuiven. Vergelijk met de situatie zonder Energy Hub.
        </p>
      </section>

      <div className="d-grid">
        <Controls s={s} set={set} />

        <main className="d-main">
          <div className="panel timebar">
            <button className="play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pauzeer' : 'Speel de dag af'}>
              {playing ? '❚❚' : '▶'}
            </button>
            <div className="clock">
              <div className="time">{fmtTime(step.h)}</div>
              <div className={`phase ${peakNow ? 'peak' : ''}`}>{peakNow ? 'Avondpiek' : step.h < 6 || step.h >= 22 ? 'Nacht' : 'Overdag'}</div>
            </div>
            <div className="scrub">
              <div className="peakmark" style={{left: `${(PEAK_START / 24) * 100}%`, width: `${((PEAK_END - PEAK_START) / 24) * 100}%`}} />
              <input
                type="range"
                min={0}
                max={23.75}
                step={0.25}
                value={Math.floor(t * 4) / 4}
                onChange={(e) => {
                  setPlaying(false);
                  setT(Number(e.target.value));
                }}
                aria-label="Tijdstip"
              />
            </div>
            <div className="now-stats">
              <div><span>Vraag</span><b>{kw(step.demand)}</b></div>
              <div><span>Leverancier</span><b>{kw(step.gridToLoad)}</b></div>
              <div><span>Eigen opwek</span><b>{kw(step.ownToLoad)}</b></div>
              {s.hub ? <div><span>Batterij</span><b>{pct(step.soc)}</b></div> : null}
            </div>
          </div>

          <div className="kpis">
            <Kpi label="Hoogste piek uit het net" value={kw(k.peakGrid)} other={kw(ko.peakGrid)} better={s.hub ? k.peakGrid < ko.peakGrid : null} hint={cmpLabel} />
            <Kpi label="Uren boven de afspraak" value={`${k.hoursOver.toLocaleString('nl-NL')} u`} other={`${ko.hoursOver.toLocaleString('nl-NL')} u`} better={s.hub ? k.hoursOver <= ko.hoursOver : null} hint={cmpLabel} />
            <Kpi label="Verbruik uit eigen opwek" value={pct(k.selfShare)} other={pct(ko.selfShare)} better={s.hub ? k.selfShare >= ko.selfShare : null} hint={cmpLabel} />
            <Kpi label="Niet geleverde vraag" value={kwh(k.shortfallKwh)} other={kwh(ko.shortfallKwh)} better={s.hub ? k.shortfallKwh <= ko.shortfallKwh : null} hint={cmpLabel} />
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Dagprofiel van het terrein</h3>
              <span className="muted">vermogen in kW · {s.season === 'winter' ? 'winterdag' : 'zomerdag'} · {s.hub ? 'met Energy Hub' : 'zonder Energy Hub'}</span>
            </div>
            <DayChart r={r} s={s} t={t} onPick={(h) => { setPlaying(false); setT(h); }} />
            {s.hub && s.batteryKwh > 0 ? <SocChart r={r} t={t} capKwh={s.batteryKwh} /> : null}
          </div>
        </main>

        <div className="d-side">
          <Companies step={step} s={s} open={open} setOpen={setOpen} />
          <div className="panel log">
            <div className="panel-head">
              <h3>Logboek</h3>
              <span className="muted">tot {fmtTime(step.h)}</span>
            </div>
            {pastLog.length === 0 ? <p className="muted">Nog geen gebeurtenissen vandaag.</p> : null}
            <ul>
              {pastLog.map((e, i) => (
                <li key={`${e.h}-${i}`}>
                  <button onClick={() => { setPlaying(false); setT(e.h); }}>
                    <span className={`dot ${e.tone}`} />
                    <time>{fmtTime(e.h)}</time>
                    <span>{e.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <footer className="d-foot muted">Energiek Innovatie Collectief · PowerUp Drenthe 2026 · demo met indicatieve waarden, geen meetdata</footer>
    </div>
  );
};
