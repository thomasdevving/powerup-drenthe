import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {C, clamp01} from '../util';
import type {WorldState} from './state';
import {DRENTHE_SITES, DRENTHE_XY, NL_SITES, PROVINCE_XY} from './geo';

/** Kaartlaag voor scène 9: Nederland, Drenthe en 120 terreinen die groen oplichten. */

const shapeOf = (pts: [number, number][], holes: [number, number][][] = []) => {
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  holes.forEach((h) => sh.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z)))));
  return new THREE.ShapeGeometry(sh);
};

const DOT = new THREE.CylinderGeometry(1, 1, 1, 18);

const Dots: React.FC<{
  pts: [number, number][];
  lit: number;
  radius: number;
  y: number;
  litColor: string;
  baseOpacity: number;
  opacity: number;
}> = ({pts, lit, radius, y, litColor, baseOpacity, opacity}) => {
  const core = useRef<THREE.InstancedMesh>(null);
  const halo = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const base = new THREE.Color('#8d97a1');
    const on = new THREE.Color(litColor);
    const c = new THREE.Color();
    const n = pts.length;
    pts.forEach(([x, z], i) => {
      // één voor één aan: elk punt heeft een eigen moment binnen `lit`
      const t = clamp01((lit * (n + 6) - i) / 6);
      const pop = t > 0 && t < 1 ? 1 + 0.6 * Math.sin(t * Math.PI) : 1;
      sc.set(radius * pop, 4, radius * pop);
      m.compose(v.set(x, y, z), q, sc);
      core.current!.setMatrixAt(i, m);
      c.copy(base).lerp(on, t);
      core.current!.setColorAt(i, c);
      sc.set(radius * 2.4 * t, 1, radius * 2.4 * t);
      m.compose(v.set(x, y - 1, z), q, sc.set(Math.max(0.001, sc.x), 1, Math.max(0.001, sc.z)));
      halo.current!.setMatrixAt(i, m);
    });
    core.current!.instanceMatrix.needsUpdate = true;
    halo.current!.instanceMatrix.needsUpdate = true;
    if (core.current!.instanceColor) core.current!.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={core} args={[DOT, undefined, pts.length]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} transparent opacity={opacity * Math.max(baseOpacity, 1)} />
      </instancedMesh>
      <instancedMesh ref={halo} args={[DOT, undefined, pts.length]} frustumCulled={false}>
        <meshBasicMaterial color={litColor} toneMapped={false} transparent opacity={0.28 * opacity} depthWrite={false} />
      </instancedMesh>
    </group>
  );
};

export const MapLayer: React.FC<{ws: WorldState; camDist: number}> = ({ws, camDist}) => {
  // Alle provincies als land; Drenthe apart uitgelicht
  const provinces = useMemo(
    () =>
      PROVINCE_XY.filter((p) => p.name !== 'Drenthe').flatMap((p) => p.rings.map((r) => shapeOf(r))),
    [],
  );
  const borders = useMemo(
    () =>
      PROVINCE_XY.flatMap((p) =>
        p.rings.map((r) => {
          const pts = [...r, r[0]].map(([x, z]) => new THREE.Vector3(x, 0, z));
          const path = new THREE.CurvePath<THREE.Vector3>();
          for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
          return new THREE.TubeGeometry(path, Math.max(40, r.length * 2), 9, 3, false);
        }),
      ),
    [],
  );
  const dr = useMemo(() => shapeOf(DRENTHE_XY), []);
  // Rechte segmenten: hoeken (Ter Apel, Schoonebeek, Meppel) blijven scherp
  const drOutline = useMemo(() => {
    const pts = [...DRENTHE_XY, DRENTHE_XY[0]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    return path;
  }, []);
  const outlineGeo = useMemo(() => new THREE.TubeGeometry(drOutline, 400, 22, 4, false), [drOutline]);
  if (ws.map <= 0.001) return null;
  const o = ws.map;
  return (
    <group>
      {provinces.map((g, i) => (
        <mesh key={i} geometry={g} rotation={[-Math.PI / 2, 0, 0]} position={[0, 30, 0]}>
          <meshBasicMaterial side={THREE.DoubleSide} color="#f4f0e6" transparent opacity={o} depthWrite={o > 0.99} />
        </mesh>
      ))}
      {borders.map((g, i) => (
        <mesh key={`b${i}`} geometry={g} position={[0, 31, 0]}>
          <meshBasicMaterial color="#b9b2a2" transparent opacity={o} />
        </mesh>
      ))}
      <mesh geometry={dr} rotation={[-Math.PI / 2, 0, 0]} position={[0, 34, 0]}>
        <meshBasicMaterial side={THREE.DoubleSide} color="#d3e8b6" transparent opacity={o} depthWrite={o > 0.99} />
      </mesh>
      <mesh geometry={outlineGeo} position={[0, 36, 0]}>
        <meshBasicMaterial color="#7fa85a" transparent opacity={o} toneMapped={false} />
      </mesh>
      <Dots pts={DRENTHE_SITES} lit={ws.sitesLit} radius={Math.min(75, Math.max(18, camDist * 0.006))} y={40} litColor={C.gridGreen} baseOpacity={1} opacity={o} />
      <Dots pts={NL_SITES} lit={ws.nlLit} radius={Math.min(150, Math.max(40, camDist * 0.0032))} y={38} litColor={C.grid} baseOpacity={1} opacity={o * clamp01(ws.nlLit * 4 + (ws.s > 8.6 ? 0.6 : 0))} />
    </group>
  );
};
