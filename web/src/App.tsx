import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Canvas, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {defaultTimeline, storyAt, type Story} from '../../src/timeline';
import {worldState} from '../../src/world/state';
import {World} from '../../src/world/World';
import {C} from '../../src/util';
import {ZONES, type Mode, type Tone, type Zone} from './zones';

const TL = defaultTimeline();
const S_FOR: Record<Mode, number> = {nu: 1.9, hub: 8.05};
const TONE: Record<Tone, string> = {
  red: C.congestion,
  cyan: C.grid,
  yellow: C.solar,
  green: C.gridGreen,
  neutral: '#c9d3dc',
};

/** Story-state voor een willekeurige story-time s (zelfde choreografie als de video). */
const storyFor = (s: number, sec: number): Story => {
  const i = Math.min(TL.scenes.length - 1, Math.max(0, Math.floor(s)));
  const sc = TL.scenes[i];
  const frac = Math.min(1, s - i);
  const frame = sc.startFrame + Math.round(frac * (sc.durationInFrames - 1));
  return {...storyAt(frame, TL), sec};
};

/** Vaste plattegrond-camera die het hele terrein + trafo + zonnepark in beeld houdt. */
const mapCamera = (w: number, h: number, px: number, py: number) => {
  const aspect = w / h;
  const portrait = aspect < 0.85;
  const fov = 30;
  const pitch = portrait ? 1.12 : 0.98;
  const yaw = portrait ? Math.PI / 2 : 0;
  const target = new THREE.Vector3(16 + (portrait ? 0 : px * 4), 0, 4 + (portrait ? px * 4 : py * 3));
  const vt = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const ht = vt * aspect;
  const spanLong = 84; // halve breedte terrein + trafo + zonnepark (x)
  const spanShort = 40; // halve diepte (z)
  const across = portrait ? spanShort : spanLong;
  const along = portrait ? spanLong : spanShort;
  const dist = Math.max(across / ht, (along * Math.sin(pitch) + 12) / vt) * 1.04;
  const pos = new THREE.Vector3(
    target.x + dist * Math.sin(yaw) * Math.cos(pitch),
    dist * Math.sin(pitch),
    target.z + dist * Math.cos(yaw) * Math.cos(pitch),
  );
  const cam = new THREE.PerspectiveCamera(fov, aspect, dist / 50, dist * 8);
  cam.position.copy(pos);
  cam.lookAt(target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return {cam, dist};
};

const Rig: React.FC<{px: number; py: number}> = ({px, py}) => {
  const {camera, size} = useThree();
  useLayoutEffect(() => {
    const {cam} = mapCamera(size.width, size.height, px, py);
    const c = camera as THREE.PerspectiveCamera;
    c.position.copy(cam.position);
    c.quaternion.copy(cam.quaternion);
    c.fov = cam.fov;
    c.near = cam.near;
    c.far = cam.far;
    c.updateProjectionMatrix();
  });
  return null;
};

const visibleZones = (mode: Mode) => ZONES.filter((z) => !z.only || z.only === mode);

const HitZones: React.FC<{mode: Mode; hovered: string | null}> = ({mode, hovered}) => {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), []);
  return (
    <group>
      {visibleZones(mode).map((z) => {
        const on = hovered === z.id;
        const tone = TONE[(z[mode] ?? z.hub ?? z.nu)!.tone];
        return (
          <group key={z.id} position={z.center}>
            <mesh scale={z.size} raycast={() => null}>
              <boxGeometry />
              <meshBasicMaterial color={tone} transparent opacity={on ? 0.16 : 0} depthWrite={false} toneMapped={false} />
            </mesh>
            {on ? (
              <lineSegments geometry={edges} scale={z.size}>
                <lineBasicMaterial color={tone} toneMapped={false} />
              </lineSegments>
            ) : null}
          </group>
        );
      })}
    </group>
  );
};

const RAY = new THREE.Raycaster();
const BOX = new THREE.Box3();
const HIT = new THREE.Vector3();

/**
 * Bepaalt in één keer welke zone onder de cursor ligt: eerst een marker (ruime straal),
 * anders de dichtstbijzijnde hitbox die de straal vanuit de camera raakt.
 */
const pick = (
  cam: THREE.PerspectiveCamera,
  x: number,
  y: number,
  w: number,
  h: number,
  mode: Mode,
  markers: {z: Zone; x: number; y: number}[],
  radius: number,
): string | null => {
  let best: string | null = null;
  let bestD = radius;
  for (const m of markers) {
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bestD) {
      bestD = d;
      best = m.z.id;
    }
  }
  if (best) return best;
  RAY.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), cam);
  let bestDist = Infinity;
  for (const z of visibleZones(mode)) {
    const pad = 0.8; // iets ruimer dan het gebouw: minder 'net ernaast'
    BOX.setFromCenterAndSize(new THREE.Vector3(...z.center), new THREE.Vector3(z.size[0] + pad, z.size[1] + pad, z.size[2] + pad));
    if (RAY.ray.intersectBox(BOX, HIT)) {
      const d = HIT.distanceTo(cam.position);
      if (d < bestDist) {
        bestDist = d;
        best = z.id;
      }
    }
  }
  return best;
};

const useNow = () => {
  const [now, setNow] = useState(0);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 1000 / 40) return; // ~40 fps is ruim genoeg
      last = t;
      setNow((t - t0) / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return now;
};

const useSize = () => {
  const [size, setSize] = useState({w: window.innerWidth, h: window.innerHeight});
  useEffect(() => {
    const on = () => setSize({w: window.innerWidth, h: window.innerHeight});
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return size;
};

const isTouch = () => window.matchMedia('(hover: none)').matches;

const Card: React.FC<{zone: Zone; mode: Mode; now: number; x: number; y: number; touch: boolean; onClose: () => void}> = ({zone, mode, now, x, y, touch, onClose}) => {
  const txt = zone[mode];
  if (!txt) return null;
  const tone = TONE[txt.tone];
  const W = 340;
  const left = Math.min(x + 22, window.innerWidth - W - 16);
  const top = Math.min(Math.max(16, y - 20), window.innerHeight - 260);
  return (
    <div className={`card ${touch ? 'sheet' : ''}`} style={touch ? {} : {left, top, width: W}}>
      {touch ? (
        <button className="close" onClick={onClose} aria-label="Sluiten">
          ×
        </button>
      ) : null}
      <div className="kicker" style={{color: tone}}>
        <span className="dot" style={{background: tone, boxShadow: `0 0 12px ${tone}`}} />
        {txt.kicker}
      </div>
      <div className="title">{zone.title}</div>
      <p>{txt.text}</p>
      {txt.stats?.map((s) => (
        <div className="stat" key={s.label}>
          <div className="row">
            <span>{s.label}</span>
            <strong style={{color: TONE[s.tone ?? 'neutral']}}>{s.value(now)}</strong>
          </div>
          {s.bar ? (
            <div className="bar">
              <div style={{width: `${Math.min(100, s.bar(now) * 100)}%`, background: TONE[s.tone ?? 'neutral']}} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export const MapView: React.FC<{tabs: React.ReactNode}> = ({tabs}) => {
  const now = useNow();
  const {w, h} = useSize();
  const [mode, setMode] = useState<Mode>('nu');
  const [pinned, setPinned] = useState<string | null>(null);
  const [touch] = useState(isTouch);
  // Cursorpositie in een ref: geen extra renders per muisbeweging; de 40-fps-loop leest hem uit.
  const pointer = useRef({x: -1, y: -1, inside: false});
  const [hoverId, setHoverId] = useState<string | null>(null);
  const lastHit = useRef<{x: number; y: number} | null>(null);
  const clearTimer = useRef<number | null>(null);
  const view = useRef<{cam: THREE.PerspectiveCamera; markers: {z: Zone; x: number; y: number}[]; w: number; h: number; mode: Mode} | null>(null);
  const sRef = useRef(S_FOR.nu);
  const lastNow = useRef(0);

  // Story-time loopt vloeiend naar de gekozen modus: de transformatie speelt zich live af.
  const dt = Math.min(0.1, Math.max(0, now - lastNow.current));
  lastNow.current = now;
  const target = S_FOR[mode];
  const diff = target - sRef.current;
  sRef.current += Math.sign(diff) * Math.min(Math.abs(diff), dt * 1.7);
  const s = sRef.current;
  const transforming = Math.abs(target - s) > 0.01;

  const story = storyFor(s, now);
  const raw = worldState(story);
  const ws = {...raw, dim: 0, dash: 0, map: 0, localFade: 0, dusk: Math.min(raw.dusk, 0.45)};

  // Vaste camera: niets mag onder de cursor wegschuiven op een hover-kaart.
  const px = 0;
  const py = 0;
  const {cam, dist} = mapCamera(w, h, px, py);

  const markers = visibleZones(mode).map((z) => {
    const top: [number, number, number] = [z.center[0], z.center[1] + z.size[1] / 2 + 1.5, z.center[2]];
    const v = new THREE.Vector3(...top).project(cam);
    return {z, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h};
  });

  view.current = {cam, markers, w, h, mode};
  // Desktop: hover wordt direct bij elke muisbeweging bepaald (los van de renderloop).
  // Touch: de laatst aangetikte zone blijft staan tot je ernaast tikt of sluit.
  const hovered = touch ? pinned : hoverId;

  useEffect(() => {
    const cancelClear = () => {
      if (clearTimer.current !== null) {
        window.clearTimeout(clearTimer.current);
        clearTimer.current = null;
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !view.current) return;
      const inside = !(e.target as Element)?.closest?.('.top, .card, .bottom');
      pointer.current = {x: e.clientX, y: e.clientY, inside};
      const v = view.current;
      const hit = inside ? pick(v.cam, e.clientX, e.clientY, v.w, v.h, v.mode, v.markers, 16) : null;
      if (hit) {
        cancelClear();
        lastHit.current = {x: e.clientX, y: e.clientY};
        setHoverId(hit);
        return;
      }
      const near = lastHit.current && Math.hypot(e.clientX - lastHit.current.x, e.clientY - lastHit.current.y) < 40;
      if (!near) {
        cancelClear();
        setHoverId(null);
      } else if (clearTimer.current === null) {
        // kort respijt over kleine gaatjes tussen gebouw en marker
        clearTimer.current = window.setTimeout(() => {
          clearTimer.current = null;
          setHoverId(null);
        }, 200);
      }
    };
    const leave = () => {
      pointer.current = {...pointer.current, inside: false};
      cancelClear();
      setHoverId(null);
    };
    window.addEventListener('pointermove', move);
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    return () => {
      cancelClear();
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
    };
  }, []);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'default';
  }, [hovered]);

  const zone = ZONES.find((z) => z.id === hovered && (!z.only || z.only === mode)) ?? null;

  const onTap = (e: React.PointerEvent) => {
    if (!touch) return;
    if ((e.target as Element).closest('.top, .card, .bottom')) return;
    setPinned(pick(cam, e.clientX, e.clientY, w, h, mode, markers, 30));
  };

  return (
    <div className="app" onPointerUp={onTap}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{antialias: true, powerPreference: 'high-performance'}}
        camera={{fov: 30, near: 1, far: 6000, position: [0, 200, 200]}}
      >
        <Rig px={px} py={py} />
        <World story={story} ws={ws} ambientSec={now} free={{dist}} />
        <HitZones mode={mode} hovered={hovered} />
      </Canvas>

      <div className="markers">
        {markers.map(({z, x, y}) => {
          const txt = z[mode];
          const tone = txt ? TONE[txt.tone] : '#fff';
          const named = !z.id.startsWith('pand') && !z.id.startsWith('wadi');
          return (
            <div
              key={z.id}
              className={`marker ${hovered === z.id ? 'on' : ''}`}
              style={{left: x, top: y, ['--tone' as string]: tone}}
              aria-hidden
            >
              <span className="pulse" />
              {z.id.startsWith('pand') ? <span className="num">{z.id.split('-')[1]}</span> : null}
              {named ? <span className="label">{z.title}</span> : null}
            </div>
          );
        })}
      </div>

      <header className="top">
        <div className="brand">
          <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" stroke={C.grid} strokeWidth="9" />
            <path d="M54 18 L32 54 L50 54 L44 82 L68 44 L50 44 Z" fill={C.solar} />
          </svg>
          <div>
            <div className="name">Energy Hub</div>
            <div className="sub">Plattegrond van het bedrijventerrein van de toekomst</div>
          </div>
        </div>
        {tabs}
        <div className="toggle" role="tablist" aria-label="Situatie">
          <button role="tab" aria-selected={mode === 'nu'} className={mode === 'nu' ? 'active red' : ''} onClick={() => setMode('nu')}>
            Nu: netcongestie
          </button>
          <button role="tab" aria-selected={mode === 'hub'} className={mode === 'hub' ? 'active cyan' : ''} onClick={() => setMode('hub')}>
            Met Energy Hub
          </button>
        </div>
      </header>

      {!zone ? (
        <div className="hint">
          {transforming
            ? mode === 'hub'
              ? 'Het terrein bouwt de Energy Hub…'
              : 'Terug naar vandaag…'
            : touch
              ? 'Tik op een gebouw of punt om te zien wat daar gebeurt'
              : 'Beweeg je muis over het terrein om te zien wat er gebeurt'}
        </div>
      ) : null}

      {zone ? <Card zone={zone} mode={mode} now={now} x={pointer.current.x} y={pointer.current.y} touch={touch} onClose={() => setPinned(null)} /> : null}

      <footer className="bottom" style={zone && touch ? {visibility: 'hidden'} : undefined}>
        <div className="legend">
          <span><i style={{background: C.congestion}} />Congestie</span>
          <span><i style={{background: C.grid}} />Smart grid</span>
          <span><i style={{background: C.solar}} />Zonne-energie</span>
          <span><i style={{background: C.gridGreen}} />Batterij &amp; groen</span>
        </div>
        <div className="credit">Energiek Innovatie Collectief · PowerUp Drenthe 2026 · indicatieve waarden</div>
      </footer>
    </div>
  );
};
