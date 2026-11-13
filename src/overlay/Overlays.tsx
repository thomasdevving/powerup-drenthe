import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SCENES, PADDING_SECONDS, keywordAt} from '../script';
import type {Story} from '../timeline';
import {C, clamp01, easeOut, seg} from '../util';
import {at, type WorldState} from '../world/state';
import {makeCamera, projectToScreen} from '../world/camera';
import {DASH, TRAFO} from '../world/layout';
import {DRENTHE, ORIGIN} from '../world/geo';
import {HEAT_STATION, LAADPLEIN} from '../world/Future';
import {Dashboard} from './Dashboard';
import {SplitScreen} from './SplitScreen';
import {HookPhoto} from './HookPhoto';
import {Icon} from './Icons';
import {CoopCard, EndTitle, Haulerwijk, HeatCard, Pillars, Rain, Risks, Team, Visie} from './Story';

export const FONT = 'Inter, system-ui, sans-serif';
const HEAT = '#ff9d2e';

/** Accentkleur per scène, volgens de kleurcode. */
const ACCENT: Record<string, string> = {
  uitdaging: C.congestion,
  'groter-probleem': C.congestion,
  'energy-hub': C.grid,
  warmtenet: HEAT,
  ruimte: C.gridGreen,
  cooperatie: C.gridGreen,
};

/** Scènes met eigen typografie: geen losse keywords linksonder. */
const NO_KEYWORDS = new Set(['visie', 'haulerwijk', 'voordelen', 'risicos', 'afsluiter', 'team']);

/** Seconden → progress binnen de huidige scène (animatie blijft progress-gestuurd). */
const secToP = (story: Story, seconds: number) => seconds / story.timeline.scenes[story.index].durationSeconds;

const Keywords: React.FC<{story: Story}> = ({story}) => {
  const scene = SCENES[story.index];
  if (!scene || scene.keywords.length === 0 || story.outro > 0 || NO_KEYWORDS.has(scene.id)) return null;
  const fadeP = secToP(story, 0.35);
  const pad = secToP(story, PADDING_SECONDS);
  const toP = (cpos: number) => pad + cpos * (1 - 2 * pad);
  const kws = scene.keywords.map((k) => ({...k, p: toP(keywordAt(scene, k))}));
  const accent = ACCENT[scene.id] ?? C.grid;
  const endP = 1 - pad * 0.6;
  return (
    <AbsoluteFill>
      {kws.map((k, j) => {
        const next = kws[j + 1]?.p ?? endP;
        const a = seg(story.p, k.p - fadeP * 0.3, k.p + fadeP * 0.7, easeOut);
        const b = seg(story.p, next - fadeP * 0.6, next + fadeP * 0.2);
        const o = Math.min(a, 1 - b);
        if (o <= 0.001) return null;
        return (
          <div key={j} style={{position: 'absolute', left: 110, bottom: 120, transform: `translateY(${(1 - a) * 28 - b * 16}px)`, opacity: o, display: 'flex', alignItems: 'stretch', gap: 22}}>
            <div style={{width: 10, borderRadius: 5, background: accent, boxShadow: `0 0 24px ${accent}`}} />
            <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 88, letterSpacing: -2, lineHeight: 1.05, color: '#ffffff', padding: '18px 34px 22px', borderRadius: 22, background: 'rgba(10, 20, 32, 0.62)', textShadow: '0 2px 18px rgba(0,0,0,0.35)', whiteSpace: 'nowrap'}}>
              {k.text}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Inzet scène 1: kaart van Drenthe kleurt volledig rood. */
const DrentheInset: React.FC<{ws: WorldState}> = ({ws}) => {
  if (ws.inset <= 0.001) return null;
  const xs = DRENTHE.map((p) => p[0]);
  const ys = DRENTHE.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const k = Math.cos((ORIGIN[1] * Math.PI) / 180);
  const W = 300;
  const H = ((maxY - minY) / ((maxX - minX) * k)) * W;
  const pts = DRENTHE.map(([lon, lat]) => `${((lon - minX) / (maxX - minX)) * W},${(1 - (lat - minY) / (maxY - minY)) * H}`).join(' ');
  const sweep = ws.insetRed;
  return (
    <div style={{position: 'absolute', right: 90, top: 80, padding: 26, borderRadius: 26, background: 'rgba(10, 20, 32, 0.72)', opacity: ws.inset, transform: `scale(${0.9 + 0.1 * ws.inset})`, transformOrigin: 'top right', fontFamily: FONT, color: 'white'}}>
      <div style={{fontSize: 30, fontWeight: 700, marginBottom: 16, letterSpacing: 0.5}}>Drenthe</div>
      <svg width={W} height={H} viewBox={`-6 -6 ${W + 12} ${H + 12}`}>
        <defs>
          <clipPath id="dr">
            <polygon points={pts} />
          </clipPath>
        </defs>
        <polygon points={pts} fill="#3a4654" stroke="#8a98a6" strokeWidth={3} strokeLinejoin="round" />
        <g clipPath="url(#dr)">
          <rect x={0} y={H * (1 - sweep * 1.05)} width={W} height={H * 1.1} fill={C.congestion} />
        </g>
        <polygon points={pts} fill="none" stroke={sweep > 0.5 ? '#ffb39e' : '#8a98a6'} strokeWidth={3} strokeLinejoin="round" />
      </svg>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, fontSize: 24, fontWeight: 600, opacity: clamp01(sweep * 2)}}>
        <div style={{width: 18, height: 18, borderRadius: 9, background: C.congestion}} />
        Geen ruimte op het net
      </div>
    </div>
  );
};

/** Label met icoon, vastgeprikt op een 3D-punt. */
const Pin: React.FC<{x: number; y: number; o: number; color: string; icon?: string; text: string; sub?: string; dark?: boolean}> = ({x, y, o, color, icon, text, sub, dark}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -100%) translateY(${-24 - (1 - o) * 14}px)`, opacity: o, fontFamily: FONT}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: icon ? '10px 22px 10px 12px' : '12px 24px', borderRadius: 40, background: dark ? 'rgba(10,20,32,0.86)' : color, color: dark ? 'white' : '#0b1620', border: dark ? `2px solid ${color}` : 'none', boxShadow: `0 0 26px ${color}66`, whiteSpace: 'nowrap'}}>
      {icon ? (
        <div style={{width: 44, height: 44, borderRadius: '50%', background: dark ? `${color}2a` : 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Icon name={icon} color={dark ? color : '#0b1620'} size={30} stroke={6} />
        </div>
      ) : null}
      <div>
        <div style={{fontSize: 30, fontWeight: 800, lineHeight: 1.1}}>{text}</div>
        {sub ? <div style={{fontSize: 19, fontWeight: 600, opacity: 0.8}}>{sub}</div> : null}
      </div>
    </div>
    <div style={{width: 3, height: 24, background: color, margin: '0 auto'}} />
  </div>
);

/** Geprojecteerde 3D-labels en markers. */
const Labels: React.FC<{story: Story; ws: WorldState; width: number; height: number}> = ({story, ws, width, height}) => {
  const cam = makeCamera(story, width / height);
  const P = (p: [number, number, number]) => projectToScreen(cam, p, width, height);
  const items: React.ReactNode[] = [];
  const s = story.s;

  // 2. problemen komen samen
  const pins: {o: number; p: [number, number, number]; icon: string; text: string; color: string}[] = [
    {o: ws.pills.net, p: [TRAFO.x, 7, TRAFO.z], icon: 'bolt', text: 'Net overbelast', color: C.congestion},
    {o: ws.pills.trucks, p: [31, 4, 2.6], icon: 'truck', text: 'Vrachtwagens moeten laden', color: C.congestion},
    {o: ws.pills.heat, p: [-6, 12, 17], icon: 'thermo', text: 'Hittestress', color: HEAT},
    {o: ws.pills.water, p: [25, 1, 22], icon: 'drop', text: 'Wateroverlast', color: '#6fb7d6'},
    {o: ws.pills.space, p: [-20, 11, -13], icon: 'expand', text: 'Geen ruimte om te groeien', color: C.congestion},
  ];
  pins.forEach((pin, i) => {
    if (pin.o <= 0.001) return;
    const q = P(pin.p);
    items.push(<Pin key={`p${i}`} x={q.x} y={q.y} o={pin.o} color={pin.color} icon={pin.icon} text={pin.text} dark />);
  });

  // 4. levert zoals afgesproken + batterijniveau
  const supplyLabel = Math.min(seg(ws.supplyCable, 0.3, 0.9), 1 - seg(s, at('energy-hub', 0.5), at('energy-hub', 0.6)));
  if (supplyLabel > 0.001) {
    const q = P([(TRAFO.x + -14) / 2, 2, -6]);
    items.push(<Pin key="supply" x={q.x} y={q.y} o={supplyLabel} color={C.grid} text="Levert zoals afgesproken" />);
  }
  const gauge = Math.min(seg(ws.charge, 0, 0.2), 1 - seg(s, at('energy-hub', 0.66), at('energy-hub', 0.72)));
  if (gauge > 0.001) {
    const q = P([0, 9, 2]);
    const lvl = ws.battery;
    const charging = ws.discharge < 0.05;
    items.push(
      <div key="bat" style={{position: 'absolute', left: q.x + 40, top: q.y, transform: 'translateY(-100%)', opacity: gauge, display: 'flex', alignItems: 'flex-end', gap: 14, fontFamily: FONT}}>
        <div style={{width: 52, height: 104, borderRadius: 10, border: '5px solid white', position: 'relative', background: 'rgba(10,20,32,0.6)'}}>
          <div style={{position: 'absolute', left: 12, top: -13, width: 18, height: 8, borderRadius: 3, background: 'white'}} />
          <div style={{position: 'absolute', left: 4, right: 4, bottom: 4, height: `${lvl * 88}px`, borderRadius: 4, background: C.battery, boxShadow: `0 0 16px ${C.battery}`}} />
        </div>
        <div style={{color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.6)'}}>
          <div style={{fontSize: 44, fontWeight: 800, lineHeight: 1}}>{Math.round(lvl * 100)}%</div>
          <div style={{fontSize: 24, fontWeight: 700, color: charging ? C.battery : C.grid}}>{charging ? '▲ laden' : '▼ piek opvangen'}</div>
        </div>
      </div>,
    );
  }

  // 5. warmte
  if (ws.wasteLabel > 0.001) {
    const q = P([-20, 15, -13]);
    items.push(<Pin key="waste" x={q.x} y={q.y} o={ws.wasteLabel} color={HEAT} icon="flame" text="Restwarmte gaat verloren" dark />);
  }
  if (ws.stationLabel > 0.001) {
    const q = P([HEAT_STATION.x, 8, HEAT_STATION.z]);
    items.push(<Pin key="station" x={q.x} y={q.y} o={ws.stationLabel} color={HEAT} icon="heat" text="Warmtepomp + buffer" sub="lokaal warmtenet" dark />);
  }

  // 6. laadplein
  if (ws.laadLabel > 0.001) {
    const q = P([(LAADPLEIN.minX + LAADPLEIN.maxX) / 2, 5, (LAADPLEIN.minZ + LAADPLEIN.maxZ) / 2]);
    items.push(<Pin key="laad" x={q.x} y={q.y} o={ws.laadLabel} color={C.grid} icon="battery" text="Gedeeld laadplein · ± 2 ha" sub="zon op carports · laden voor auto's en vrachtwagens" dark />);
  }

  // 11. label Drenthe op de kaart
  const drLabel = Math.min(seg(s, at('afsluiter', 0.5), at('afsluiter', 0.56)), 1 - seg(s, at('afsluiter', 0.84), at('afsluiter', 0.9)));
  if (drLabel > 0.001) {
    items.push(
      <div key="dr" style={{position: 'absolute', left: 90, top: 70, textAlign: 'left', opacity: drLabel, fontFamily: FONT, fontWeight: 800, fontSize: 44, color: '#21402a', letterSpacing: 14, textTransform: 'uppercase'}}>
        Drenthe
      </div>,
    );
  }
  return <AbsoluteFill>{items}</AbsoluteFill>;
};

/** Dashboard-inhoud precies op het zwevende 3D-paneel. */
const DashboardOverlay: React.FC<{story: Story; ws: WorldState; width: number; height: number}> = ({story, ws, width, height}) => {
  if (ws.dash <= 0.02) return null;
  const cam = makeCamera(story, width / height);
  const s = 0.6 + 0.4 * ws.dash;
  const tl = projectToScreen(cam, [DASH.x - (DASH.w / 2) * s, DASH.y + (DASH.h / 2) * s, DASH.z + 0.45], width, height);
  const br = projectToScreen(cam, [DASH.x + (DASH.w / 2) * s, DASH.y - (DASH.h / 2) * s, DASH.z + 0.45], width, height);
  return (
    <div style={{position: 'absolute', left: tl.x, top: tl.y, width: br.x - tl.x, height: br.y - tl.y, opacity: seg(ws.dash, 0.6, 1)}}>
      <Dashboard p={ws.dashP} sec={story.sec} />
    </div>
  );
};

const HeatVignette: React.FC<{ws: WorldState}> = ({ws}) =>
  ws.heat > 0.001 ? <AbsoluteFill style={{background: `radial-gradient(ellipse at center, rgba(255,90,40,0) 40%, rgba(255,74,46,${0.24 * ws.heat * (1 - ws.dim) * (ws.s < 3 ? 1 : 0)}) 100%)`}} /> : null;

/** Zachte fade vanuit zwart tijdens de eerste ademruimte. */
const FadeIn: React.FC<{story: Story}> = ({story}) => {
  const o = 1 - seg(story.sec, 0, PADDING_SECONDS + 0.2);
  return o > 0.001 ? <AbsoluteFill style={{background: '#05080c', opacity: o}} /> : null;
};

export const Overlays: React.FC<{story: Story; ws: WorldState; width: number; height: number}> = ({story, ws, width, height}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <HookPhoto story={story} />
    <HeatVignette ws={ws} />
    <Rain ws={ws} sec={story.sec} />
    <Labels story={story} ws={ws} width={width} height={height} />
    <DashboardOverlay story={story} ws={ws} width={width} height={height} />
    <DrentheInset ws={ws} />
    <HeatCard ws={ws} />
    <CoopCard ws={ws} />
    <Visie story={story} ws={ws} />
    <Haulerwijk story={story} ws={ws} />
    <SplitScreen story={story} ws={ws} />
    <Risks story={story} ws={ws} />
    <Pillars story={story} />
    <Team story={story} />
    <Keywords story={story} />
    <EndTitle ws={ws} />
    <FadeIn story={story} />
  </AbsoluteFill>
);
