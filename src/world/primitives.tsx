import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {clamp01, fract} from '../util';

const SPHERE = new THREE.IcosahedronGeometry(1, 1);

/** Polyline → curve (rechte stukken, booglengte-geparametriseerd). */
export const polyCurve = (pts: [number, number, number][]) => {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < pts.length - 1; i++) {
    path.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i]), new THREE.Vector3(...pts[i + 1])));
  }
  return path;
};

/** Doorhangende draad tussen masttoppen. */
export const sagCurve = (pts: [number, number, number][], sag: number) => {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(...pts[i]);
    const b = new THREE.Vector3(...pts[i + 1]);
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= sag * 2; // kwadratische bezier: controlepunt 2× zo diep
    path.add(new THREE.QuadraticBezierCurve3(a, mid, b));
  }
  return path;
};

/** Afgeronde rechthoek als gesloten curve (ringnet). */
export const roundedRectCurve = (hx: number, hz: number, r: number, y: number) => {
  const pts: THREE.Vector3[] = [];
  const corners: [number, number, number][] = [
    [hx - r, -hz + r, -Math.PI / 2],
    [hx - r, hz - r, 0],
    [-hx + r, hz - r, Math.PI / 2],
    [-hx + r, -hz + r, Math.PI],
  ];
  for (const [cx, cz, a0] of corners) {
    for (let k = 0; k <= 6; k++) {
      const a = a0 + (k / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r));
    }
  }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.2);
};

type FlowProps = {
  curve: THREE.Curve<THREE.Vector3>;
  count: number;
  /** Rondes per seconde (ambient loop, onafhankelijk van scèneduur). */
  speed: number;
  sec: number;
  amount: number;
  color: string;
  /** Kleur voor terugketsende deeltjes. */
  color2?: string;
  size?: number;
  /** 0..1 dichtslibben: vertragen en klonteren. */
  jam?: number;
  /** 0..1 terugketsen halverwege. */
  bounce?: number;
  /** Alleen het deel 0..reveal van de curve tonen. */
  reveal?: number;
  phase?: number;
};

/** Gloeiende energiedeeltjes langs een curve. */
export const Flow: React.FC<FlowProps> = ({
  curve, count, speed, sec, amount, color, color2, size = 0.45, jam = 0, bounce = 0, reveal = 1, phase = 0,
}) => {
  const core = useRef<THREE.InstancedMesh>(null);
  const glow = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(
    () => ({m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), c: new THREE.Color(), c1: new THREE.Color(), c2: new THREE.Color()}),
    [],
  );
  useLayoutEffect(() => {
    const a = core.current;
    const g = glow.current;
    if (!a || !g) return;
    const {m, q, s, p, c, c1, c2} = tmp;
    c1.set(color);
    c2.set(color2 ?? color);
    const k = 7; // aantal klonten bij congestie
    for (let i = 0; i < count; i++) {
      const u = fract(i / count + phase + sec * speed * (1 - 0.85 * jam));
      let t = u;
      let back = 0;
      if (jam > 0) t = u - (jam * 0.92 * (fract(u * k) - 0.5)) / k;
      if (bounce > 0) {
        const reach = 1 - 0.5 * bounce;
        if (u < 0.5) t = 2 * u * reach;
        else {
          t = 2 * (1 - u) * reach;
          back = bounce;
        }
      }
      t = clamp01(t) * reveal;
      curve.getPointAt(clamp01(t), p);
      const edge = Math.min(1, t * 25, (reveal - t) * 25 + 0.0001, 1);
      const sz = size * amount * Math.max(0, edge) * (1 + 0.35 * jam);
      s.setScalar(Math.max(0.0001, sz));
      m.compose(p, q, s);
      a.setMatrixAt(i, m);
      s.setScalar(Math.max(0.0001, sz * 2.6));
      m.compose(p, q, s);
      g.setMatrixAt(i, m);
      c.copy(c1).lerp(c2, back);
      a.setColorAt(i, c);
      g.setColorAt(i, c);
    }
    a.instanceMatrix.needsUpdate = true;
    g.instanceMatrix.needsUpdate = true;
    if (a.instanceColor) a.instanceColor.needsUpdate = true;
    if (g.instanceColor) g.instanceColor.needsUpdate = true;
  });
  return (
    <group visible={amount > 0.001}>
      <instancedMesh ref={core} args={[SPHERE, undefined, count]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glow} args={[SPHERE, undefined, count]} frustumCulled={false}>
        <meshBasicMaterial
          toneMapped={false}
          transparent
          opacity={0.22 * amount}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </group>
  );
};

type CableProps = {
  curve: THREE.Curve<THREE.Vector3>;
  radius: number;
  color: string;
  emissive?: string;
  glow?: number;
  reveal?: number;
  opacity?: number;
  segments?: number;
  closed?: boolean;
};

/** Kabel als buis, kan progressief "uitrollen". */
export const Cable: React.FC<CableProps> = ({
  curve, radius, color, emissive = '#000000', glow = 0, reveal = 1, opacity = 1, segments = 160, closed = false,
}) => {
  const geo = useMemo(() => new THREE.TubeGeometry(curve, segments, radius, 6, closed), [curve, segments, radius, closed]);
  const total = geo.index ? geo.index.count : 0;
  const per = 6 * 6; // indices per buissegment
  geo.setDrawRange(0, Math.floor((total / per) * clamp01(reveal)) * per);
  if (reveal <= 0.001 || opacity <= 0.001) return null;
  return (
    <mesh geometry={geo} castShadow={false}>
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={glow}
        roughness={0.7}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
};

/** Box met clay-materiaal. */
export const Clay: React.FC<{
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  rot?: [number, number, number];
  emissive?: string;
  glow?: number;
  shadow?: boolean;
  opacity?: number;
}> = ({pos, size, color, rot, emissive = '#000', glow = 0, shadow = true, opacity = 1}) => (
  <mesh position={pos} rotation={rot} castShadow={shadow} receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial
      color={color}
      roughness={0.92}
      emissive={emissive}
      emissiveIntensity={glow}
      transparent={opacity < 1}
      opacity={opacity}
    />
  </mesh>
);
