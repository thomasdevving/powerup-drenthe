import React from 'react';
import {AbsoluteFill} from 'remotion';
import {sceneIndex} from '../script';
import type {Story} from '../timeline';
import {C, easeOut, seg} from '../util';
import type {WorldState} from '../world/state';
import {Icon} from './Icons';

const FONT = 'Inter, system-ui, sans-serif';

type Side = {kicker: string; title: string; color: string; points: {icon: string; text: string}[]};

const LEFT: Side = {
  kicker: 'Vandaag',
  title: 'Traditioneel bedrijventerrein',
  color: '#ff9b84',
  points: [
    {icon: 'alone', text: 'Afzonderlijke systemen'},
    {icon: 'flame', text: 'Restwarmte niet gedeeld'},
    {icon: 'peak', text: 'Weinig afstemming'},
  ],
};
const RIGHT: Side = {
  kicker: 'Morgen',
  title: 'Multi-Commodity bedrijventerrein',
  color: C.gridGreen,
  points: [
    {icon: 'bolt', text: 'Gezamenlijk energiemanagement'},
    {icon: 'loop', text: 'Warmtenet en thermische opslag'},
    {icon: 'leaf', text: 'Groen, water en samenwerking'},
  ],
};

const Card: React.FC<{side: Side; t: number; align: 'left' | 'right'}> = ({side, t, align}) => (
  <div
    style={{
      position: 'absolute',
      top: 130,
      [align]: 100,
      width: 790,
      padding: '40px 46px 44px',
      borderRadius: 32,
      background: 'rgba(10, 20, 32, 0.82)',
      border: `2px solid ${side.color}55`,
      opacity: seg(t, 0, 0.2),
      transform: `translateY(${(1 - seg(t, 0, 0.3, easeOut)) * 40}px)`,
      fontFamily: FONT,
      color: 'white',
    }}
  >
    <div style={{fontSize: 26, fontWeight: 700, color: side.color, letterSpacing: 3, textTransform: 'uppercase'}}>{side.kicker}</div>
    <div style={{fontSize: 52, fontWeight: 800, letterSpacing: -1.5, marginBottom: 22, lineHeight: 1.05}}>{side.title}</div>
    {side.points.map((pt, i) => {
      const a = seg(t, 0.12 + i * 0.14, 0.24 + i * 0.14, easeOut);
      return (
        <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 16, opacity: a, transform: `translateX(${(1 - a) * 30}px)`}}>
          <div style={{width: 76, height: 76, borderRadius: 20, background: `${side.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
            <Icon name={pt.icon} color={side.color} size={50} />
          </div>
          <div style={{fontSize: 36, fontWeight: 700, lineHeight: 1.15}}>{pt.text}</div>
        </div>
      );
    })}
  </div>
);

/** Scène "voordelen": traditioneel vs toekomstbestendig. */
export const SplitScreen: React.FC<{story: Story; ws: WorldState}> = ({story, ws}) => {
  if (ws.split <= 0.001) return null;
  const c = story.cprog(sceneIndex('voordelen'));
  const rc = 0.3;
  const lt = seg(c, 0.0, 0.48, (x) => x);
  const rt = seg(c, rc - 0.06, 1.0, (x) => x);
  return (
    <AbsoluteFill style={{opacity: ws.split}}>
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(6,12,20,0.6), rgba(6,12,20,0.3) 50%, rgba(6,12,20,0.6))'}} />
      <div style={{position: 'absolute', left: 959, top: 120, bottom: 120, width: 2, background: 'rgba(255,255,255,0.5)'}} />
      <Card side={LEFT} t={lt} align="left" />
      <Card side={RIGHT} t={rt} align="right" />
    </AbsoluteFill>
  );
};
