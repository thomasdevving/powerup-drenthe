import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {loadFont} from '@remotion/google-fonts/Inter';
import {PADDING_SECONDS} from './script';
import {defaultTimeline, storyAt, type PitchProps, type Timeline} from './timeline';
import {worldState} from './world/state';
import {World} from './world/World';
import {Overlays} from './overlay/Overlays';
import {VoGuide} from './overlay/VoGuide';

loadFont('normal', {weights: ['400', '500', '600', '700', '800'], subsets: ['latin']});

const MUSIC_VOLUME = 0.12;
const MUSIC_DUCKED = 0.05;

/** Muziekvolume per frame: zacht, en verder omlaag tijdens elk VO-venster. */
const musicVolume = (frame: number, tl: Timeline) => {
  const fps = tl.fps;
  const pad = PADDING_SECONDS * fps;
  const ramp = 0.4 * fps;
  let duck = 0;
  for (const s of tl.scenes) {
    const a = s.startFrame + pad;
    const b = s.startFrame + s.durationInFrames - pad;
    const d = Math.min(Math.max(0, Math.min((frame - (a - ramp)) / ramp, ((b + ramp) - frame) / ramp)), 1);
    duck = Math.max(duck, d);
  }
  const fadeOut = Math.min(1, Math.max(0, (tl.totalFrames - frame) / (2 * fps)));
  const fadeIn = Math.min(1, frame / (1 * fps));
  return (MUSIC_VOLUME - (MUSIC_VOLUME - MUSIC_DUCKED) * duck) * fadeOut * fadeIn;
};

const AudioLayer: React.FC<{tl: Timeline}> = ({tl}) => (
  <>
    {tl.scenes.map((s) =>
      s.audio ? (
        <Sequence key={s.id} from={s.startFrame + Math.round(PADDING_SECONDS * tl.fps)} durationInFrames={s.durationInFrames} layout="none">
          <Audio src={staticFile(s.audio)} />
        </Sequence>
      ) : null,
    )}
    {tl.hasMusic ? <Audio src={staticFile('music.mp3')} loop volume={(f) => musicVolume(f, tl)} /> : null}
  </>
);

export const Pitch: React.FC<PitchProps & {guide?: boolean}> = ({timeline, guide}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const tl = timeline ?? defaultTimeline();
  const story = storyAt(frame, tl);
  const ws = worldState(story);
  return (
    <AbsoluteFill style={{backgroundColor: '#0c141c'}}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        gl={{antialias: true, powerPreference: 'high-performance'}}
        camera={{fov: 30, near: 1, far: 5000, position: [0, 200, 200]}}
      >
        <World story={story} ws={ws} />
      </ThreeCanvas>
      <Overlays story={story} ws={ws} width={width} height={height} />
      {guide ? <VoGuide story={story} /> : null}
      <AudioLayer tl={tl} />
    </AbsoluteFill>
  );
};
