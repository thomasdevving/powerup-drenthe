import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SCENES, cueFraction, sceneIndex} from '../script';
import type {Story} from '../timeline';
import {C, clamp01, easeOut, inOut, seg} from '../util';
import type {WorldState} from '../world/state';
import {Icon} from './Icons';
import {pitchStep} from '../energy/pitch-data';
import {DEFAULT_THERMAL, fmtTime} from '../energy/profiles';

const FONT = 'Inter, system-ui, sans-serif';
const HEAT = '#ff9d2e';
const WARN = '#ff9d2e';

const cp = (story: Story, id: string) => story.cprog(sceneIndex(id));
const cue = (id: string, w: string) => cueFraction(SCENES[sceneIndex(id)], w);
/** In bij een woord, blijft staan. */
const at = (story: Story, id: string, w: string, lead = 0.04, dur = 0.08) => seg(cp(story, id), cue(id, w) - lead, cue(id, w) - lead + dur, easeOut);

const panel: React.CSSProperties = {
  background: 'rgba(10, 20, 32, 0.84)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 26,
  fontFamily: FONT,
  color: 'white',
};

/* ------------------------------------------------------------------ 3. visie */

export const Visie: React.FC<{story: Story; ws: WorldState}> = ({story, ws}) => {
  if (ws.dim <= 0.001) return null;
  const l1 = at(story, 'visie', 'kijken', 0.06, 0.1);
  const l2 = at(story, 'visie', 'ontwerpen', 0.05, 0.1);
  const words = ['slimmer,', 'groener,', 'efficiënter', 'gezamenlijk'];
  const labels = ['Slimmer', 'Groener', 'Efficiënter', 'Samen'];
  const colors = [C.grid, C.gridGreen, C.solar, '#ffffff'];
  return (
    <AbsoluteFill style={{background: `rgba(6, 10, 18, ${0.55 * ws.dim})`, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: FONT, textAlign: 'center', opacity: ws.dim}}>
        <div style={{fontSize: 74, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: -1.5, opacity: l1, transform: `translateY(${(1 - l1) * 26}px)`}}>
          Niet alleen het energieprobleem oplossen.
        </div>
        <div style={{fontSize: 96, fontWeight: 800, color: 'white', letterSpacing: -2.5, marginTop: 8, lineHeight: 1.05, opacity: l2, transform: `translateY(${(1 - l2) * 26}px)`}}>
          Het bedrijventerrein voorbereiden
          <br />
          <span style={{color: C.grid, textShadow: `0 0 40px ${C.grid}55`}}>op de toekomst.</span>
        </div>
        <div style={{display: 'flex', gap: 18, justifyContent: 'center', marginTop: 42}}>
          {words.map((w, i) => {
            const a = at(story, 'visie', w, 0.03, 0.07);
            return (
              <div key={w} style={{opacity: a, transform: `translateY(${(1 - a) * 18}px)`, fontSize: 40, fontWeight: 800, padding: '12px 28px', borderRadius: 999, background: 'rgba(10,20,32,0.7)', border: `2px solid ${colors[i]}`, color: 'white'}}>
                {labels[i]}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ 2. regen */

export const Rain: React.FC<{ws: WorldState; sec: number}> = ({ws, sec}) => {
  if (ws.rain <= 0.001) return null;
  const off = (sec * 900) % 120;
  return (
    <AbsoluteFill
      style={{
        opacity: ws.rain * 0.55,
        backgroundImage: 'repeating-linear-gradient(105deg, rgba(200,225,255,0.0) 0px, rgba(200,225,255,0.0) 22px, rgba(200,225,255,0.55) 23px, rgba(200,225,255,0.0) 25px)',
        backgroundPosition: `${off * 0.27}px ${off}px`,
        backgroundSize: '120px 120px',
        mixBlendMode: 'screen',
      }}
    />
  );
};

/* ------------------------------------------------------------------ 5. warmte */

export const HeatCard: React.FC<{ws: WorldState}> = ({ws}) => {
  if (ws.heatCard <= 0.001) return null;
  const x = pitchStep(ws.heatRecovered);
  const used = x.heatDemand ? (x.directHeat + x.bufferDischarge) / x.heatDemand : 0;
  const n = (v: number) => Math.round(v).toLocaleString('nl-NL');
  const row = (label: string, value: string, bar?: number, color = HEAT) => (
    <div style={{marginTop: 14}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 24}}>
        <span style={{color: 'rgba(255,255,255,0.72)'}}>{label}</span>
        <b>{value}</b>
      </div>
      {bar !== undefined ? (
        <div style={{height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.12)', marginTop: 8}}>
          <div style={{height: 10, borderRadius: 5, width: `${bar * 100}%`, background: color}} />
        </div>
      ) : null}
    </div>
  );
  return (
    <>
      <div style={{...panel, position: 'absolute', right: 80, top: 80, width: 470, padding: '24px 28px 26px', opacity: ws.heatCard, transform: `translateX(${(1 - ws.heatCard) * 40}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 20, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: HEAT}}>
          <Icon name="flame" color={HEAT} size={30} stroke={6} /> Dashboard · warmte
        </div>
        <div style={{fontSize: 18, marginTop: 12, color: '#b4c4d1'}}>Illustratieve winterdag · {fmtTime(x.h)}</div>
        {row('Bronwarmte', `${n(x.availableHeat)} kWth`)}
        {row('Nuttig geleverd', `${n(x.directHeat + x.bufferDischarge)} kWth`, used)}
        {row('Aanvullend nodig', `${n(x.backupHeat)} kWth`)}
        {row('Pomp + circulatie', `${n(x.heatPumpElectric + x.pumpElectric)} kW stroom`)}
        {row('Warmtebuffer', `${n(x.bufferKwh)} / ${DEFAULT_THERMAL.bufferKwh} kWhth`, x.bufferKwh / DEFAULT_THERMAL.bufferKwh, '#ffc06b')}
        <div style={{marginTop: 14, fontSize: 20, color: '#65baff'}}>Koude: {n(x.coldDemand)} kWth · koeling {n(x.coolingElectric)} kW</div>
        <div style={{marginTop: 12, fontSize: 18, color: '#b4c4d1'}}>WKO optioneel · locatieafhankelijk</div>
      </div>
      <div style={{position: 'absolute', right: 80, bottom: 46, fontFamily: FONT, fontSize: 21, color: 'rgba(255,255,255,0.8)', background: 'rgba(10,20,32,0.6)', padding: '8px 16px', borderRadius: 10, opacity: ws.heatCard}}>
        Indicatief · haalbaarheid hangt af van temperatuur, afstand, aanbod en vraag
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ 7. Haulerwijk */

const Building: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x},${y})`}>
    <rect x={-46} y={-40} width={92} height={70} rx={8} fill="#e9e3d6" />
    <rect x={-34} y={-18} width={68} height={12} rx={3} fill="#7d8e9c" />
    <rect x={-50} y={-46} width={100} height={8} rx={3} fill="#c9c4b9" />
  </g>
);

export const Haulerwijk: React.FC<{story: Story; ws: WorldState}> = ({ws}) => {
  if (ws.haulerwijk <= 0.001) return null;
  return <div style={{...panel, position: 'absolute', left: 110, bottom: 120, padding: '24px 36px', opacity: ws.haulerwijk}}>
    <div style={{fontSize: 22, color: C.gridGreen, fontWeight: 800}}>VAN INITIATIEF NAAR UITVOERING</div>
    <div style={{fontSize: 44, fontWeight: 800, marginTop: 10}}>Samenwerking zoals in Haulerwijk</div>
    <div style={{fontSize: 23, marginTop: 10, color: '#c2cdd5'}}>Inspiratie voor ons toekomstconcept · geen bestaande installatie</div>
  </div>;
};

/* ------------------------------------------------------------------ 8. coöperatie */

export const CoopCard: React.FC<{ws: WorldState}> = ({ws}) => {
  if (ws.coopCard <= 0.001) return null;
  const rows = [
    {icon: 'vote', title: 'Samen besluiten', text: 'Eén lid, één stem'},
    {icon: 'euro', title: 'Kosten naar gebruik', text: 'Transparante verrekening'},
    {icon: 'coop', title: 'Voordelen terug', text: 'Naar de deelnemende bedrijven'},
  ];
  return (
    <div style={{...panel, position: 'absolute', right: 80, top: 90, width: 520, padding: '26px 30px 22px', opacity: ws.coopCard, transform: `translateX(${(1 - ws.coopCard) * 40}px)`}}>
      <div style={{fontSize: 20, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.gridGreen}}>Coöperatie</div>
      <div style={{fontSize: 24, color: 'rgba(255,255,255,0.78)', marginTop: 6, lineHeight: 1.35}}>Gezamenlijk eigenaar van de Energy Hub en de gedeelde voorzieningen</div>
      {rows.map((r, i) => {
        const a = clamp01(ws.coopCard * 3 - i * 0.6);
        return (
          <div key={r.title} style={{display: 'flex', gap: 18, alignItems: 'center', marginTop: 18, opacity: a}}>
            <div style={{width: 64, height: 64, borderRadius: 18, background: 'rgba(78,240,138,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
              <Icon name={r.icon} color={C.gridGreen} size={40} stroke={5} />
            </div>
            <div>
              <div style={{fontSize: 30, fontWeight: 800}}>{r.title}</div>
              <div style={{fontSize: 22, color: 'rgba(255,255,255,0.7)'}}>{r.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ 10. risico's */

const RISKS = [
  {icon: 'shield', title: 'Zekerheid & afspraken', text: 'Leveringszekerheid, regelgeving en samenwerking vooraf regelen.'},
  {icon: 'heat', title: 'Technische haalbaarheid', text: 'Bronnen, afnemers, temperatuur en afstand bepalen wat kan.'},
  {icon: 'euro', title: 'Gefaseerd investeren', text: 'Businesscase per stap. Netverzwaring kan nodig blijven.'},
];
export const Risks: React.FC<{story: Story; ws: WorldState}> = ({story, ws}) => {
  if (ws.risks <= 0.001) return null;
  const p = cp(story, 'risicos');
  return <AbsoluteFill style={{background: 'rgba(6,10,18,.68)', opacity: ws.risks, fontFamily: FONT, color: 'white', padding: '160px 110px'}}>
    <div style={{fontSize: 24, fontWeight: 800, letterSpacing: 3, color: WARN}}>RISICO’S EN UITVOERBAARHEID</div>
    <div style={{fontSize: 60, fontWeight: 800, marginTop: 18, letterSpacing: -1.5}}>Realistische keuzes. Samen vooruit.</div>
    <div style={{display: 'flex', gap: 28, marginTop: 70}}>{RISKS.map((r, i) => <div key={r.title} style={{...panel, flex: 1, padding: '36px 30px', opacity: seg(p, i * .12, i * .12 + .1)}}>
      <Icon name={r.icon} color={WARN} size={52}/><div style={{fontSize: 34, fontWeight: 800, marginTop: 22}}>{r.title}</div><div style={{fontSize: 28, lineHeight: 1.4, color: '#c2cdd5', marginTop: 18}}>{r.text}</div>
    </div>)}</div>
    <div style={{fontSize: 25, marginTop: 48, color: C.gridGreen}}>Passende contracten · financiële haalbaarheid · geen automatische toestemming voor een eigen net</div>
  </AbsoluteFill>;
};

/* ------------------------------------------------------------------ 11. pijlers */

export const Pillars: React.FC<{story: Story}> = ({story}) => {
  const i = story.index;
  if (i !== sceneIndex('afsluiter')) return null;
  const items = [
    {w: 'slimme', label: 'Slimme energie', icon: 'bolt', color: C.grid},
    {w: 'gedeelde', label: 'Gedeelde warmte', icon: 'flame', color: HEAT},
    {w: 'groene', label: 'Groene ruimte', icon: 'leaf', color: C.gridGreen},
    {w: 'samenwerking.', label: 'Samenwerking', icon: 'coop', color: '#ffffff'},
  ];
  const out = 1 - seg(story.p, 0.94, 1);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 90, display: 'flex', justifyContent: 'center', gap: 18, fontFamily: FONT, opacity: out}}>
      {items.map((it) => {
        const a = at(story, 'afsluiter', it.w, 0.03, 0.06);
        return (
          <div key={it.label} style={{opacity: a, transform: `translateY(${(1 - a) * 20}px)`, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 26px 14px 16px', borderRadius: 999, background: 'rgba(10,20,32,0.82)', border: `2px solid ${it.color}`, color: 'white', fontSize: 34, fontWeight: 800}}>
            <Icon name={it.icon} color={it.color} size={44} stroke={5} />
            {it.label}
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ 12. team */

const TEAM = [
  {w: 'AI,', name: 'Thomas Nguyen', tag: 'AI & data', color: C.grid, icon: 'ai', lines: ['AI Engineer bij Schiphol Express', 'Student BSc Artificial Intelligence, UvA']},
  {w: 'energietransitie,', name: 'Catharina Meter', tag: 'Energietransitie & proces', color: C.solar, icon: 'people', lines: ['Verandermanager en procescoördinator', 'Verbinder van mensen, creatieve oplosser']},
  {w: 'ruimtelijke', name: 'Gerhard Hulshoff', tag: 'Ruimtelijke planning', color: C.gridGreen, icon: 'map', lines: ['Student Spatial Planning & Design, RUG', 'Stagiair bij Movares']},
  {w: 'techniek,', name: 'Martin Hoogenboom', tag: 'Techniek & coöperatie', color: HEAT, icon: 'wrench', lines: ['40 jaar IT, 15 jaar bouwkunde', 'Energiecoach en secretaris energiecoöperatie']},
];

export const Team: React.FC<{story: Story}> = ({story}) => {
  const ti = sceneIndex('team');
  if (story.index !== ti || story.outro > 0) return null;
  const inA = seg(story.p, 0, 0.08);
  const outA = 1 - seg(story.p, 0.95, 1);
  const head = at(story, 'team', 'Wij', 0.06, 0.1);
  return (
    <AbsoluteFill style={{background: `rgba(6, 10, 18, ${0.7 * inA * outA})`, alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: 'white', opacity: outA}}>
      <div style={{textAlign: 'center', opacity: head, transform: `translateY(${(1 - head) * 20}px)`}}>
        <div style={{fontSize: 24, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: C.grid}}>Het team</div>
        <div style={{fontSize: 64, fontWeight: 800, letterSpacing: -1.5, marginTop: 6}}>Energiek Innovatie Collectief</div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 400px)', gap: 24, marginTop: 50}}>
        {TEAM.map((m) => {
          const a = at(story, 'team', m.w, 0.04, 0.08);
          const initials = m.name.split(' ').map((p) => p[0]).join('');
          return (
            <div key={m.name} style={{...panel, padding: '30px 28px', opacity: a, transform: `translateY(${(1 - a) * 30}px)`, border: `1px solid ${m.color}66`}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                <div style={{width: 84, height: 84, borderRadius: '50%', background: `${m.color}22`, border: `3px solid ${m.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800}}>{initials}</div>
                <Icon name={m.icon} color={m.color} size={46} stroke={5} />
              </div>
              <div style={{fontSize: 34, fontWeight: 800, marginTop: 18, letterSpacing: -0.5}}>{m.name}</div>
              <div style={{fontSize: 22, fontWeight: 800, color: m.color, marginTop: 4}}>{m.tag}</div>
              {m.lines.map((l) => (
                <div key={l} style={{fontSize: 21, color: 'rgba(255,255,255,0.78)', marginTop: 10, lineHeight: 1.3}}>{l}</div>
              ))}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ eindkaart */

export const EndTitle: React.FC<{ws: WorldState}> = ({ws}) => {
  const t = ws.endTitle;
  if (t <= 0.001) return null;
  const sub = inOut(t, 0.3, 1, 2, 3);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: `radial-gradient(ellipse at center, rgba(8,16,26,${0.85 * t}) 0%, rgba(8,16,26,${0.6 * t}) 55%, rgba(8,16,26,${0.3 * t}) 100%)`}}>
      <div style={{fontFamily: FONT, textAlign: 'center', color: 'white'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, opacity: t, transform: `translateY(${(1 - t) * 30}px)`}}>
          <svg width={120} height={120} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={42} fill="none" stroke={C.grid} strokeWidth={7} />
            <path d="M 54 18 L 32 54 L 50 54 L 44 82 L 68 44 L 50 44 Z" fill={C.solar} />
          </svg>
          <div style={{fontSize: 170, fontWeight: 800, letterSpacing: 4}}>ENERGY HUB</div>
        </div>
        <div style={{fontSize: 52, fontWeight: 700, marginTop: 10, opacity: sub, color: C.grid}}>Het bedrijventerrein van de toekomst</div>
        <div style={{fontSize: 36, fontWeight: 500, marginTop: 34, opacity: sub, color: 'rgba(255,255,255,0.9)'}}>Energiek Innovatie Collectief</div>
        <div style={{fontSize: 30, fontWeight: 500, marginTop: 8, opacity: sub, color: 'rgba(255,255,255,0.7)'}}>PowerUp Drenthe Hackathon 2026</div>
      </div>
    </AbsoluteFill>
  );
};
