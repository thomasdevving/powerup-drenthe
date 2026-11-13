import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {HOOK_PHOTO, SCENES, cueFraction} from '../script';
import type {Story} from '../timeline';
import {easeInOut, seg} from '../util';

const FONT = 'Inter, system-ui, sans-serif';

/**
 * Echte foto als opening van scène 1. Langzame zoom (Ken Burns), schemer-grading,
 * en bij "Er ligt stroom" vloeit hij over in het 3D-luchtbeeld.
 * Alles op scène-progress; ontbreekt public/hook.*, dan rendert dit niets.
 */
export const HookPhoto: React.FC<{story: Story}> = ({story}) => {
  const file = story.timeline.hookPhoto;
  if (!file || story.index > 0) return null;
  const c = story.cprog(0);
  const p = story.prog(0);
  const handoff = cueFraction(SCENES[0], 'Er');
  const out = seg(c, handoff - 0.1, handoff + 0.1, easeInOut);
  if (out >= 0.999) return null;
  const zoom = 1.05 + 0.1 * p + 0.18 * out; // trage push-in, versnelt bij de overgang
  return (
    <AbsoluteFill style={{opacity: 1 - out, overflow: 'hidden'}}>
      <Img
        src={staticFile(file)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${zoom}) translateY(${-p * 1.5}%)`,
          transformOrigin: '55% 60%',
          filter: `saturate(0.9) brightness(${0.92 - 0.12 * out})`,
        }}
      />
      {/* schemer-grading zodat de foto aansluit op de 3D-wereld */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(42,48,98,0.38) 0%, rgba(242,168,131,0.18) 45%, rgba(20,16,30,0.35) 100%)', mixBlendMode: 'multiply'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(5,8,14,0.45) 100%)'}} />
      {HOOK_PHOTO.credit ? (
        <div style={{position: 'absolute', right: 28, bottom: 22, fontFamily: FONT, fontSize: 18, color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 4px rgba(0,0,0,0.6)'}}>
          Foto: {HOOK_PHOTO.credit}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
