import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SCENES, cueFraction} from '../script';
import type {Story} from '../timeline';
import {C, easeOut, seg} from '../util';
import type {WorldState} from '../world/state';

const FONT = 'Inter, system-ui, sans-serif';
const S = SCENES[7];

const Icon: React.FC<{name: string; color: string}> = ({name, color}) => {
  const p = {fill: 'none', stroke: color, strokeWidth: 6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  switch (name) {
    case 'plug':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <path d="M22 8 v14 M42 8 v14 M14 22 h36 v10 a18 18 0 0 1 -36 0 z M32 50 v10" {...p} />
        </svg>
      );
    case 'check':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={32} r={24} {...p} />
          <path d="M21 33 l8 8 l15 -17" {...p} />
        </svg>
      );
    case 'doc':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <path d="M16 8 h22 l12 12 v36 h-34 z M38 8 v12 h12 M24 34 h18 M24 44 h12" {...p} />
        </svg>
      );
    case 'grow':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <path d="M10 54 h44 M16 54 v-14 h10 v14 M30 54 v-24 h10 v24 M44 54 v-12 M42 22 l8 -10 l8 10 M50 12 v22" {...p} />
        </svg>
      );
    case 'battery':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={10} y={18} width={40} height={28} rx={5} {...p} />
          <path d="M54 27 v10 M18 32 h8 M30 26 l-4 6 h8 l-4 6" {...p} />
        </svg>
      );
    default:
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <path d="M32 58 s-18 -18 -18 -32 a18 18 0 0 1 36 0 c0 14 -18 32 -18 32 z" {...p} />
          <circle cx={32} cy={26} r={6} {...p} />
        </svg>
      );
  }
};

type Side = {title: string; color: string; points: {icon: string; text: string}[]; cue: string};

const LEFT: Side = {
  title: 'Leverancier',
  color: '#bcd3ff',
  cue: 'leverancier:',
  points: [
    {icon: 'plug', text: 'Eén aansluiting'},
    {icon: 'check', text: 'Levert zoals afgesproken'},
    {icon: 'doc', text: 'Minder administratie'},
  ],
};
const RIGHT: Side = {
  title: 'Bedrijventerrein',
  color: C.gridGreen,
  cue: 'bedrijventerrein:',
  points: [
    {icon: 'grow', text: 'Ruimte om te groeien'},
    {icon: 'battery', text: 'Onafhankelijk'},
    {icon: 'pin', text: 'Aantrekkelijk vestigingsklimaat'},
  ],
};

const Card: React.FC<{side: Side; t: number; align: 'left' | 'right'}> = ({side, t, align}) => (
  <div
    style={{
      position: 'absolute',
      top: 150,
      [align]: 110,
      width: 760,
      padding: '44px 50px 50px',
      borderRadius: 32,
      background: 'rgba(10, 20, 32, 0.78)',
      border: `2px solid ${side.color}55`,
      opacity: seg(t, 0, 0.25),
      transform: `translateY(${(1 - seg(t, 0, 0.3, easeOut)) * 40}px)`,
      fontFamily: FONT,
      color: 'white',
    }}
  >
    <div style={{fontSize: 30, fontWeight: 600, color: side.color, letterSpacing: 3, textTransform: 'uppercase'}}>Voor de</div>
    <div style={{fontSize: 74, fontWeight: 800, letterSpacing: -2, marginBottom: 30}}>{side.title}</div>
    {side.points.map((pt, i) => {
      const a = seg(t, 0.15 + i * 0.18, 0.4 + i * 0.18, easeOut);
      return (
        <div key={i} style={{display: 'flex', alignItems: 'center', gap: 26, marginTop: 22, opacity: a, transform: `translateX(${(1 - a) * 30}px)`}}>
          <div style={{width: 92, height: 92, borderRadius: 24, background: `${side.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
            <Icon name={pt.icon} color={side.color} />
          </div>
          <div style={{fontSize: 46, fontWeight: 700, lineHeight: 1.1}}>{pt.text}</div>
        </div>
      );
    })}
  </div>
);

export const SplitScreen: React.FC<{story: Story; ws: WorldState}> = ({story, ws}) => {
  if (ws.split <= 0.001) return null;
  const c = story.cprog(7);
  const lc = cueFraction(S, LEFT.cue);
  const rc = cueFraction(S, RIGHT.cue);
  // Elke kant animeert over zijn eigen stuk VO
  const lt = seg(c, lc - 0.08, rc + 0.05, (x) => x);
  const rt = seg(c, rc - 0.08, 1.0, (x) => x);
  return (
    <AbsoluteFill style={{opacity: ws.split}}>
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(6,12,20,0.55), rgba(6,12,20,0.2) 50%, rgba(6,12,20,0.55))'}} />
      <div style={{position: 'absolute', left: 959, top: 110, bottom: 110, width: 2, background: 'rgba(255,255,255,0.55)'}} />
      <Card side={LEFT} t={lt} align="left" />
      <Card side={RIGHT} t={rt} align="right" />
    </AbsoluteFill>
  );
};
