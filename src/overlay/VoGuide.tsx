import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SCENES, words} from '../script';
import type {Story} from '../timeline';
import {C} from '../util';

const FONT = 'Inter, system-ui, sans-serif';

/** Teleprompter voor de spreker: scènenummer linksboven, VO-tekst onderin met meelopende markering. */
export const VoGuide: React.FC<{story: Story}> = ({story}) => {
  const i = story.index;
  const scene = SCENES[i];
  const tl = story.timeline.scenes[i];
  const w = words(scene.vo);
  const inOutro = story.outro > 0;
  const cur = inOutro ? w.length : Math.floor(story.cp * w.length);
  const waiting = story.cp <= 0 && !inOutro;
  const done = story.cp >= 1 || inOutro;
  const remaining = Math.max(0, (1 - story.p) * tl.durationSeconds);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', fontFamily: FONT}}>
      <div style={{position: 'absolute', left: 40, top: 34, background: 'rgba(0,0,0,0.78)', color: 'white', padding: '14px 24px', borderRadius: 14, display: 'flex', gap: 22, alignItems: 'baseline'}}>
        <span style={{fontSize: 46, fontWeight: 800, color: C.solar}}>{inOutro ? 'EIND' : `${String(i + 1).padStart(2, '0')}/${SCENES.length}`}</span>
        <span style={{fontSize: 30, fontWeight: 700}}>{inOutro ? 'Eindkaart (geen VO)' : scene.title}</span>
        <span style={{fontSize: 24, fontWeight: 500, opacity: 0.7}}>{inOutro ? '' : `${scene.audioFile.replace('vo/', '')} · ${tl.durationSeconds.toFixed(1)} s · nog ${remaining.toFixed(1)} s`}</span>
      </div>
      {!inOutro ? (
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.82)', padding: '22px 80px 30px'}}>
          <div style={{fontSize: 22, fontWeight: 700, letterSpacing: 2, color: waiting ? C.solar : done ? 'rgba(255,255,255,0.5)' : C.gridGreen, marginBottom: 10}}>
            {waiting ? '● KLAAR VOOR START…' : done ? '■ STILTE / ADEMRUIMTE' : '● SPREKEN'}
          </div>
          <div style={{fontSize: 40, lineHeight: 1.35, fontWeight: 600}}>
            {w.map((word, k) => (
              <span key={k} style={{color: k < cur ? 'rgba(255,255,255,0.45)' : k === cur && !waiting ? C.solar : 'white'}}>
                {word}{' '}
              </span>
            ))}
          </div>
          <div style={{height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, marginTop: 16}}>
            <div style={{height: 6, width: `${story.p * 100}%`, background: C.grid, borderRadius: 3}} />
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
