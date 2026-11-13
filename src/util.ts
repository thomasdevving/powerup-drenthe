import * as THREE from 'three';

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const easeOutBack = (t: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Genormaliseerd segment van progress p tussen a en b, met easing. */
export const seg = (p: number, a: number, b: number, ease = easeInOut) =>
  ease(clamp01((p - a) / Math.max(1e-6, b - a)));

/** In en weer uit: 0 → 1 (a..b) → 1 → 0 (c..d). */
export const inOut = (p: number, a: number, b: number, c: number, d: number) =>
  Math.min(seg(p, a, b), 1 - seg(p, c, d));

export const fract = (x: number) => x - Math.floor(x);

/** Deterministische pseudo-random (geen Math.random in renders). */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const mixColor = (a: string, b: string, t: number) =>
  '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp01(t)).getHexString();

/** Kleurcode — consequent door de hele video. */
export const C = {
  congestion: '#ff4a2e', // rood/oranje: congestie, wachtrij
  congestionSoft: '#ff8a3d',
  grid: '#21e6d0', // cyaan/groen: smart grid
  gridGreen: '#4ef08a',
  solar: '#ffd23f', // geel: zonne-energie
  battery: '#4ef08a',
  cableIdle: '#5b6470',
  ink: '#0e1a24',
  paper: '#f6f3ec',
  grass: '#9cc06b',
  grassDark: '#7fa556',
  asphalt: '#8b9096',
  water: '#6fb7d6',
};
