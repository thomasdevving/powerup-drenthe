import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SCENES, PADDING_SECONDS, keywordAt} from '../script';
import type {Story} from '../timeline';
import {C, clamp01, easeOut, seg} from '../util';
import type {WorldState} from '../world/state';
import {makeCamera, projectToScreen} from '../world/camera';
import {DASH, TRAFO} from '../world/layout';
import {DRENTHE, ORIGIN} from '../world/geo';
import {Dashboard} from './Dashboard';
import {SplitScreen} from './SplitScreen';
import {HookPhoto} from './HookPhoto';

export const FONT = 'Inter, system-ui, sans-serif';

/** Accentkleur per scène, volgens de kleurcode. */
const accentFor = (i: number) => (i <= 2 ? C.congestion : i === 3 ? '#ffffff' : i === 6 ? C.gridGreen : C.grid);

/** Seconden → progress binnen de huidige scène (animatie blijft progress-gestuurd). */
const secToP = (story: Story, seconds: number) =>
  seconds / story.timeline.scenes[story.index].durationSeconds;

const Keywords: React.FC<{story: Story; ws: WorldState}> = ({story, ws}) => {
  const i = story.index;
  const scene = SCENES[i];
  if (!scene || scene.keywords.length === 0 || story.outro > 0) return null;
  if (i === 3) return null; // omslag heeft eigen centrale typografie
  const fadeP = secToP(story, 0.35);
  const pad = secToP(story, PADDING_SECONDS);
  // VO-venster → ruwe progress
  const toP = (cpos: number) => pad + cpos * (1 - 2 * pad);
  const kws = scene.keywords.map((k) => ({...k, p: toP(keywordAt(scene, k))}));
  const accent = accentFor(i);
  const endP = 1 - pad * 0.6;
  const hideForTitle = i === 8 ? 1 - ws.endTitle : 1;
  return (
    <AbsoluteFill>
      {kws.map((k, j) => {
        const next = kws[j + 1]?.p ?? endP;
        const a = seg(story.p, k.p - fadeP * 0.3, k.p + fadeP * 0.7, easeOut);
        const b = seg(story.p, next - fadeP * 0.6, next + fadeP * 0.2);
        const o = Math.min(a, 1 - b) * hideForTitle;
        if (o <= 0.001) return null;
        return (
          <div
            key={j}
            style={{
              position: 'absolute',
              left: 110,
              bottom: 120,
              transform: `translateY(${(1 - a) * 28 - b * 16}px)`,
              opacity: o,
              display: 'flex',
              alignItems: 'stretch',
              gap: 22,
            }}
          >
            <div style={{width: 10, borderRadius: 5, background: accent, boxShadow: `0 0 24px ${accent}`}} />
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 92,
                letterSpacing: -2,
                lineHeight: 1.05,
                color: '#ffffff',
                padding: '18px 34px 22px',
                borderRadius: 22,
                background: 'rgba(10, 20, 32, 0.62)',
                textShadow: '0 2px 18px rgba(0,0,0,0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              {k.text}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Scène 4: beeld dimt, één zin centraal. */
const Omslag: React.FC<{story: Story; ws: WorldState}> = ({story, ws}) => {
  const scene = SCENES[3];
  const c = story.cprog(3);
  const a = seg(c, keywordAt(scene, scene.keywords[0]) - 0.05, keywordAt(scene, scene.keywords[0]) + 0.12, easeOut);
  const b = seg(c, keywordAt(scene, scene.keywords[1]) - 0.05, keywordAt(scene, scene.keywords[1]) + 0.12, easeOut);
  const out = 1 - seg(story.s, 3.82, 4.02);
  if (ws.dim <= 0.001) return null;
  return (
    <AbsoluteFill style={{background: `rgba(6, 10, 18, ${0.62 * ws.dim})`, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: FONT, textAlign: 'center', opacity: out}}>
        <div style={{fontSize: 112, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: -3, opacity: a, transform: `translateY(${(1 - a) * 30}px)`}}>
          <span style={{textDecoration: b > 0.5 ? 'line-through' : 'none', textDecorationColor: C.congestion, textDecorationThickness: 8, opacity: 1 - 0.45 * b}}>
            Niet verzwaren.
          </span>
        </div>
        <div style={{fontSize: 132, fontWeight: 800, color: C.grid, letterSpacing: -3, marginTop: 10, opacity: b, transform: `translateY(${(1 - b) * 30}px)`, textShadow: `0 0 40px ${C.grid}66`}}>
          Slimmer verdelen.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Inzet scène 2: kaart van Drenthe kleurt volledig rood. */
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
    <div
      style={{
        position: 'absolute',
        right: 90,
        top: 80,
        padding: 26,
        borderRadius: 26,
        background: 'rgba(10, 20, 32, 0.72)',
        opacity: ws.inset,
        transform: `scale(${0.9 + 0.1 * ws.inset})`,
        transformOrigin: 'top right',
        fontFamily: FONT,
        color: 'white',
      }}
    >
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

/** Geprojecteerde 3D-labels en markers. */
const Labels: React.FC<{story: Story; ws: WorldState; width: number; height: number}> = ({story, ws, width, height}) => {
  const cam = makeCamera(story, width / height);
  const items: React.ReactNode[] = [];

  // Scène 5: "levert zoals afgesproken"
  const supplyLabel = Math.min(seg(ws.supplyCable, 0.3, 0.9), 1 - seg(story.s, 4.62, 4.75));
  if (supplyLabel > 0.001) {
    const p = projectToScreen(cam, [(TRAFO.x + -14) / 2, 2, -6], width, height);
    items.push(
      <div key="supply" style={{position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%, -100%) translateY(-34px)', opacity: supplyLabel}}>
        <div style={{fontFamily: FONT, fontSize: 34, fontWeight: 700, color: '#06202a', background: C.grid, padding: '12px 24px', borderRadius: 40, whiteSpace: 'nowrap', boxShadow: `0 0 30px ${C.grid}88`}}>
          Levert zoals afgesproken
        </div>
        <div style={{width: 3, height: 34, background: C.grid, margin: '0 auto'}} />
      </div>,
    );
  }

  // Scène 5: batterijniveau naast de hub
  const gauge = Math.min(seg(ws.charge, 0, 0.2), 1 - seg(story.s, 4.97, 5.06));
  if (gauge > 0.001) {
    const p = projectToScreen(cam, [0, 9, 2], width, height);
    const lvl = ws.battery;
    const charging = ws.discharge < 0.05;
    items.push(
      <div key="bat" style={{position: 'absolute', left: p.x + 40, top: p.y, transform: 'translateY(-100%)', opacity: gauge, display: 'flex', alignItems: 'flex-end', gap: 14, fontFamily: FONT}}>
        <div style={{width: 52, height: 104, borderRadius: 10, border: '5px solid white', position: 'relative', background: 'rgba(10,20,32,0.6)', boxShadow: '0 4px 18px rgba(0,0,0,0.25)'}}>
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

  // Scène 3: zonnepark en terrein niet verbonden
  if (ws.notConnected > 0.001) {
    const a = projectToScreen(cam, [33, 0.6, 0], width, height);
    const b = projectToScreen(cam, [46, 0.6, 0], width, height);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    items.push(
      <svg key="gap" width={width} height={height} style={{position: 'absolute', left: 0, top: 0, opacity: ws.notConnected}}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.congestion} strokeWidth={5} strokeDasharray="10 10" strokeLinecap="round" />
        <circle cx={mx} cy={my} r={30} fill={C.congestion} />
        <path d={`M ${mx - 11} ${my - 11} L ${mx + 11} ${my + 11} M ${mx + 11} ${my - 11} L ${mx - 11} ${my + 11}`} stroke="white" strokeWidth={6} strokeLinecap="round" />
      </svg>,
    );
  }

  // Scène 9: label Drenthe
  const drLabel = Math.min(seg(story.s, 8.2, 8.28), 1 - seg(story.s, 8.42, 8.5));
  if (drLabel > 0.001) {
    items.push(
      <div key="dr" style={{position: 'absolute', left: 0, right: 0, top: 64, textAlign: 'center', opacity: drLabel, fontFamily: FONT, fontWeight: 800, fontSize: 44, color: '#21402a', letterSpacing: 14, textTransform: 'uppercase'}}>
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
  const contentO = seg(ws.dash, 0.6, 1);
  return (
    <div style={{position: 'absolute', left: tl.x, top: tl.y, width: br.x - tl.x, height: br.y - tl.y, opacity: contentO}}>
      <Dashboard story={story} />
    </div>
  );
};

const HeatVignette: React.FC<{ws: WorldState}> = ({ws}) =>
  ws.heat > 0.001 ? (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at center, rgba(255,90,40,0) 35%, rgba(255,74,46,${0.45 * ws.heat}) 100%)`}} />
  ) : null;

/** Zachte fade vanuit zwart tijdens de eerste ademruimte. */
const FadeIn: React.FC<{story: Story}> = ({story}) => {
  const o = 1 - seg(story.sec, 0, PADDING_SECONDS + 0.2);
  return o > 0.001 ? <AbsoluteFill style={{background: '#05080c', opacity: o}} /> : null;
};

const EndTitle: React.FC<{ws: WorldState; story: Story}> = ({ws, story}) => {
  const t = ws.endTitle;
  if (t <= 0.001) return null;
  const sub = Math.max(seg(t, 0.4, 1), story.outro > 0 ? 1 : 0);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', background: `radial-gradient(ellipse at center, rgba(8,16,26,${0.72 * t}) 0%, rgba(8,16,26,${0.5 * t}) 45%, rgba(8,16,26,${0.18 * t}) 100%)`}}>
      <div style={{fontFamily: FONT, textAlign: 'center', color: 'white'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, opacity: t, transform: `translateY(${(1 - t) * 30}px)`}}>
          <svg width={110} height={110} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={42} fill="none" stroke={C.grid} strokeWidth={7} />
            <path d="M 54 18 L 32 54 L 50 54 L 44 82 L 68 44 L 50 44 Z" fill={C.solar} />
          </svg>
          <div style={{fontSize: 170, fontWeight: 800, letterSpacing: -5}}>Energy Hub</div>
        </div>
        <div style={{fontSize: 42, fontWeight: 500, marginTop: 18, opacity: sub, color: 'rgba(255,255,255,0.88)', letterSpacing: 0.5}}>
          Energiek Innovatie Collectief · PowerUp Drenthe 2026
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Overlays: React.FC<{story: Story; ws: WorldState; width: number; height: number}> = ({story, ws, width, height}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <HookPhoto story={story} />
    <HeatVignette ws={ws} />
    <Labels story={story} ws={ws} width={width} height={height} />
    <DashboardOverlay story={story} ws={ws} width={width} height={height} />
    <DrentheInset ws={ws} />
    <SplitScreen story={story} ws={ws} />
    <Omslag story={story} ws={ws} />
    <Keywords story={story} ws={ws} />
    <EndTitle ws={ws} story={story} />
    <FadeIn story={story} />
  </AbsoluteFill>
);
