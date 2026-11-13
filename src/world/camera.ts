import * as THREE from 'three';
import type {Story} from '../timeline';
import {DASH, TRAFO} from './layout';
import {DRENTHE_CENTER, NL_CENTER} from './geo';

/**
 * Camerarit als keyframes in story-time (s = scène-index + progress).
 * Interpolatie gebeurt in echte seconden met een vloeiende Hermite-spline,
 * zodat de camera nooit hard knipt, ook niet als scèneduren veranderen.
 * Afstand wordt logaritmisch geïnterpoleerd (nodig voor de uitzoom naar NL).
 */
type Key = {
  s: number;
  target: [number, number, number];
  dist: number;
  yaw: number; // rad, rond de y-as (0 = vanaf het zuiden)
  pitch: number; // rad, hoogtehoek
  fov: number;
};

const D = DRENTHE_CENTER;
const N = NL_CENTER;

export const CAMERA_KEYS: Key[] = [
  // 1 Hook — luchtbeeld bij schemering
  {s: 0.0, target: [-60, 0, -120], dist: 950, yaw: -0.55, pitch: 0.2, fov: 30},
  {s: 0.55, target: [-40, 0, -60], dist: 560, yaw: -0.45, pitch: 0.27, fov: 30},
  {s: 1.0, target: [-28, 0, -30], dist: 300, yaw: -0.38, pitch: 0.38, fov: 30},
  // 2 Probleem — camera zakt het terrein in
  {s: 1.3, target: [-30, 3, -9], dist: 120, yaw: -0.5, pitch: 0.4, fov: 32},
  {s: 1.6, target: [-16, 3, -9], dist: 140, yaw: -0.25, pitch: 0.44, fov: 32},
  {s: 2.0, target: [-12, 2, -6], dist: 165, yaw: -0.05, pitch: 0.5, fov: 32},
  // 3 Gemiste kans — zonnepark ernaast
  {s: 2.45, target: [42, 0, 4], dist: 225, yaw: 0.1, pitch: 0.6, fov: 30},
  {s: 3.0, target: [46, 0, 4], dist: 240, yaw: 0.16, pitch: 0.64, fov: 30},
  // 4 Omslag — rustig omhoog, terug naar het terrein
  {s: 3.5, target: [20, 0, 2], dist: 260, yaw: 0.05, pitch: 0.82, fov: 30},
  {s: 4.0, target: [0, 0, 0], dist: 170, yaw: 0.2, pitch: 0.75, fov: 30},
  // 5 Energy Hub
  {s: 4.18, target: [0, 3, 0], dist: 85, yaw: 0.55, pitch: 0.48, fov: 32},
  {s: 4.42, target: [-18, 2, -2], dist: 120, yaw: 0.3, pitch: 0.52, fov: 32},
  {s: 4.72, target: [2, 2, 2], dist: 122, yaw: -0.15, pitch: 0.58, fov: 32},
  {s: 5.0, target: [0, 6, 2], dist: 118, yaw: -0.05, pitch: 0.5, fov: 32},
  // 6 Dashboard — vlieg naar het zwevende paneel
  {s: 5.16, target: [DASH.x, DASH.y - 6, DASH.z], dist: 108, yaw: 0, pitch: 0.03, fov: 30},
  {s: 5.88, target: [DASH.x, DASH.y - 6, DASH.z], dist: 104, yaw: 0, pitch: 0.03, fov: 30},
  // 7 Koel, groen en samen
  {s: 6.15, target: [0, 0, 2], dist: 135, yaw: 0.55, pitch: 0.62, fov: 32},
  {s: 7.0, target: [0, 0, 0], dist: 120, yaw: 0.9, pitch: 0.55, fov: 32},
  // 8 Win-win — trafo links, terrein rechts
  {s: 7.2, target: [(TRAFO.x + 20) / 2 - 2, 0, -2], dist: 160, yaw: 0.04, pitch: 0.5, fov: 32},
  {s: 8.0, target: [(TRAFO.x + 20) / 2, 0, -2], dist: 150, yaw: 0.0, pitch: 0.52, fov: 32},
  // 9 Opschalen — uit naar Drenthe, dan Nederland
  {s: 8.07, target: [0, 0, 0], dist: 260, yaw: 0.0, pitch: 0.95, fov: 32},
  {s: 8.24, target: [D[0], 0, D[1] + 300], dist: 12500, yaw: 0, pitch: 1.3, fov: 32},
  {s: 8.42, target: [D[0], 0, D[1] + 300], dist: 11800, yaw: 0, pitch: 1.32, fov: 32},
  {s: 8.7, target: [N[0], 0, N[1]], dist: 50000, yaw: 0, pitch: 1.38, fov: 32},
  {s: 9.0, target: [N[0], 0, N[1]], dist: 53000, yaw: 0, pitch: 1.38, fov: 32},
];

type Pose = {position: THREE.Vector3; target: THREE.Vector3; fov: number; near: number; far: number; dist: number};

const vecOf = (k: Key) => [
  k.target[0], k.target[1], k.target[2], Math.log(k.dist), k.yaw, k.pitch, k.fov,
];

const hermite = (p0: number, p1: number, m0: number, m1: number, t: number, h: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * p0 +
    (t3 - 2 * t2 + t) * h * m0 +
    (-2 * t3 + 3 * t2) * p1 +
    (t3 - t2) * h * m1
  );
};

export const cameraAt = (story: Story): Pose => {
  const times = CAMERA_KEYS.map((k) => story.secAt(k.s));
  const vals = CAMERA_KEYS.map(vecOf);
  const t = Math.min(story.sec, times[times.length - 1]);
  let i = 0;
  while (i < times.length - 2 && t > times[i + 1]) i++;
  const t0 = times[i];
  const t1 = times[i + 1];
  const h = Math.max(1e-6, t1 - t0);
  const u = Math.min(1, Math.max(0, (t - t0) / h));
  // Catmull-Rom tangenten in de tijd, met eindpunten in rust.
  const tangent = (j: number, c: number) => {
    if (j <= 0 || j >= times.length - 1) return 0;
    const dt = times[j + 1] - times[j - 1];
    if (dt <= 1e-6) return 0;
    const m = (vals[j + 1][c] - vals[j - 1][c]) / dt;
    // Begrens overshoot: als het een lokaal extremum is → 0.
    const a = vals[j][c] - vals[j - 1][c];
    const b = vals[j + 1][c] - vals[j][c];
    if (a * b <= 0) return 0;
    return m;
  };
  const out = vals[i].map((v, c) => hermite(v, vals[i + 1][c], tangent(i, c), tangent(i + 1, c), u, h));
  // Na de laatste key: blijf hangen met een héél trage drift.
  const [tx, ty, tz, logD, yaw, pitch, fov] = out;
  const dist = Math.exp(logD);
  const target = new THREE.Vector3(tx, ty, tz);
  const position = new THREE.Vector3(
    tx + dist * Math.sin(yaw) * Math.cos(pitch),
    ty + dist * Math.sin(pitch),
    tz + dist * Math.cos(yaw) * Math.cos(pitch),
  );
  return {position, target, fov, dist, near: Math.max(0.5, dist / 60), far: Math.max(4000, dist * 6)};
};

/** Losse THREE-camera met dezelfde pose (voor projectie van 2D-labels). */
export const makeCamera = (story: Story, aspect: number) => {
  const pose = cameraAt(story);
  const cam = new THREE.PerspectiveCamera(pose.fov, aspect, pose.near, pose.far);
  cam.position.copy(pose.position);
  cam.lookAt(pose.target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};

/** Projecteer een wereldpunt naar schermpixels. */
export const projectToScreen = (
  cam: THREE.PerspectiveCamera,
  p: [number, number, number],
  width: number,
  height: number,
) => {
  const v = new THREE.Vector3(...p).project(cam);
  return {x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, visible: v.z < 1 && v.z > -1};
};
