import {getStaticFiles, staticFile} from 'remotion';
import {getAudioDurationInSeconds} from '@remotion/media-utils';
import {
  HOOK_PHOTO,
  FPS,
  OUTRO_SECONDS,
  PADDING_SECONDS,
  SCENES,
  defaultDurationSeconds,
} from './script';

export type TimelineScene = {
  id: string;
  title: string;
  vo: string;
  visual: string;
  audioFile: string;
  index: number;
  startFrame: number;
  durationInFrames: number;
  durationSeconds: number;
  /** Pad naar opname als die bestaat, anders null. */
  audio: string | null;
  source: 'audio' | 'default' | 'override';
};

export type Timeline = {
  fps: number;
  padding: number;
  scenes: TimelineScene[];
  outroFrames: number;
  totalFrames: number;
  hasMusic: boolean;
  /** Pad naar de echte hook-foto in public/, of null. */
  hookPhoto: string | null;
};

export type PitchProps = {
  /** Optioneel: forceer scèneduur in seconden, bv. {"energy-hub": 30}. */
  durationOverrides?: Record<string, number>;
  /** Wordt gevuld door calculateMetadata. */
  timeline?: Timeline;
};

const safeStaticFiles = (): string[] => {
  try {
    return getStaticFiles().map((f) => f.name);
  } catch {
    return [];
  }
};

export const resolveTimeline = async (
  overrides: Record<string, number> = {},
): Promise<Timeline> => {
  const files = new Set(safeStaticFiles());
  let cursor = 0;
  const scenes: TimelineScene[] = [];
  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    let seconds = defaultDurationSeconds(s);
    let source: TimelineScene['source'] = 'default';
    let audio: string | null = null;
    if (files.has(s.audioFile)) {
      try {
        const d = await getAudioDurationInSeconds(staticFile(s.audioFile));
        if (Number.isFinite(d) && d > 0) {
          seconds = d + 2 * PADDING_SECONDS;
          audio = s.audioFile;
          source = 'audio';
        }
      } catch (e) {
        // Onleesbaar bestand: val terug op standaardduur.
        console.warn(`Kon ${s.audioFile} niet lezen, standaardduur gebruikt`, e);
      }
    }
    if (overrides[s.id] !== undefined) {
      seconds = overrides[s.id];
      source = 'override';
    }
    const frames = Math.max(2, Math.round(seconds * FPS));
    scenes.push({
      id: s.id,
      title: s.title,
      vo: s.vo,
      visual: s.visual,
      audioFile: s.audioFile,
      index: i,
      startFrame: cursor,
      durationInFrames: frames,
      durationSeconds: frames / FPS,
      audio,
      source,
    });
    cursor += frames;
  }
  const outroFrames = Math.round(OUTRO_SECONDS * FPS);
  return {
    fps: FPS,
    padding: PADDING_SECONDS,
    scenes,
    outroFrames,
    totalFrames: cursor + outroFrames,
    hasMusic: files.has('music.mp3'),
    hookPhoto: HOOK_PHOTO.files.find((f) => files.has(f)) ?? null,
  };
};

/** Synchrone fallback (studio-thumbnail e.d.): alleen standaardduren. */
export const defaultTimeline = (): Timeline => {
  let cursor = 0;
  const scenes = SCENES.map((s, i) => {
    const frames = Math.round(defaultDurationSeconds(s) * FPS);
    const t: TimelineScene = {
      id: s.id,
      title: s.title,
      vo: s.vo,
      visual: s.visual,
      audioFile: s.audioFile,
      index: i,
      startFrame: cursor,
      durationInFrames: frames,
      durationSeconds: frames / FPS,
      audio: null,
      source: 'default',
    };
    cursor += frames;
    return t;
  });
  const outroFrames = Math.round(OUTRO_SECONDS * FPS);
  return {fps: FPS, padding: PADDING_SECONDS, scenes, outroFrames, totalFrames: cursor + outroFrames, hasMusic: false, hookPhoto: null};
};

/**
 * Story-state voor een globaal frame.
 *  - index: huidige scène (0-based). Tijdens de outro: laatste scène.
 *  - p: ruwe scène-progress 0..1 (incl. ademruimte)
 *  - cp: content-progress 0..1 binnen het VO-venster (zonder ademruimte)
 *  - s: story-time = index + p (continu 0..N)
 *  - sec: globale seconden (alleen voor doorlopende ambient-loops)
 */
export type Story = {
  index: number;
  p: number;
  cp: number;
  s: number;
  sec: number;
  outro: number; // 0..1 voortgang van de eindkaart
  timeline: Timeline;
  /** Progress van scène i: 0 vóór, 1 na, anders p. */
  prog: (i: number) => number;
  /** Content-progress van scène i: 0 vóór, 1 na. */
  cprog: (i: number) => number;
  /** Globale seconde waarop story-time `s` valt. */
  secAt: (s: number) => number;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const contentProgress = (p: number, durationSeconds: number) => {
  const pad = Math.min(0.45, PADDING_SECONDS / Math.max(0.001, durationSeconds));
  return clamp01((p - pad) / (1 - 2 * pad));
};

export const storyAt = (frame: number, timeline: Timeline): Story => {
  const {scenes} = timeline;
  const last = scenes[scenes.length - 1];
  const endOfScenes = last.startFrame + last.durationInFrames;
  let index = scenes.length - 1;
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    if (frame < sc.startFrame + sc.durationInFrames) {
      index = i;
      break;
    }
  }
  const sc = scenes[index];
  const p = clamp01((frame - sc.startFrame) / Math.max(1, sc.durationInFrames - 1));
  const cp = contentProgress(p, sc.durationSeconds);
  const outro =
    timeline.outroFrames > 0 ? clamp01((frame - endOfScenes) / timeline.outroFrames) : 0;
  const prog = (i: number) => (i < index ? 1 : i > index ? 0 : p);
  const cprog = (i: number) => (i < index ? 1 : i > index ? 0 : cp);
  const secAt = (s: number) => {
    const i = Math.min(scenes.length - 1, Math.max(0, Math.floor(s)));
    const frac = s >= scenes.length ? 1 : s - i;
    const scn = scenes[i];
    return (scn.startFrame + frac * scn.durationInFrames) / timeline.fps;
  };
  return {
    index,
    p,
    cp,
    s: index + p,
    sec: frame / timeline.fps,
    outro,
    timeline,
    prog,
    cprog,
    secAt,
  };
};
