import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {C, mixColor} from '../util';
import type {WorldState} from './state';
import {HV_BRANCH, HV_MAIN, PARK_STATION, SOLAR_PARK, TERRAIN, TRAFO} from './layout';
import {Cable, Clay, Flow, polyCurve, sagCurve} from './primitives';

/** Hoogspanningsnet, trafo-aftakking, zonnepark en het "andere" station. */

const PYLON_H = 28;
const ARM_Y = 21.5;
const ARM_HALF = 6.5;

type Pylon = {x: number; z: number; yaw: number; nx: number; nz: number};

const pylonsFor = (pts: [number, number][]): Pylon[] =>
  pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    return {x: p[0], z: p[1], yaw: Math.atan2(dx, dz), nx: -dz / len, nz: dx / len};
  });

const PylonMesh: React.FC<{p: Pylon}> = ({p}) => (
  <group position={[p.x, 0, p.z]} rotation={[0, p.yaw, 0]}>
    <mesh position={[0, PYLON_H / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <cylinderGeometry args={[0.45, 2.6, PYLON_H, 4, 1]} />
      <meshStandardMaterial color="#9aa3ab" roughness={0.8} flatShading />
    </mesh>
    <mesh position={[0, ARM_Y + 0.4, 0]} castShadow>
      <boxGeometry args={[ARM_HALF * 2 + 1, 0.7, 0.7]} />
      <meshStandardMaterial color="#9aa3ab" roughness={0.8} />
    </mesh>
    <mesh position={[0, PYLON_H - 2, 0]}>
      <boxGeometry args={[7, 0.5, 0.5]} />
      <meshStandardMaterial color="#9aa3ab" roughness={0.8} />
    </mesh>
  </group>
);

/** Rij masten met twee draden + deeltjesstroom. */
const HvLine: React.FC<{
  pts: [number, number][];
  ws: WorldState;
  sec: number;
  endHeight?: number;
  flowSpeed: number;
  count: number;
}> = ({pts, ws, sec, endHeight, flowSpeed, count}) => {
  const pylons = useMemo(() => pylonsFor(pts), [pts]);
  const wires = useMemo(
    () =>
      [-1, 1].map((side) =>
        sagCurve(
          pylons.map((p, i) => {
            const last = endHeight !== undefined && i === pylons.length - 1;
            const half = last ? 2.5 : ARM_HALF;
            return [p.x + p.nx * half * side, last ? endHeight! : ARM_Y, p.z + p.nz * half * side];
          }),
          endHeight !== undefined ? 2.5 : 3.2,
        ),
      ),
    [pylons, endHeight],
  );
  const wireColor = mixColor('#3f4650', C.congestion, ws.congestion);
  const flowColor = mixColor('#eaf2ff', C.congestion, ws.congestion);
  const flowAmt = 0.55 + 0.45 * ws.congestion;
  return (
    <group>
      {pylons.map((p, i) =>
        endHeight !== undefined && i === pylons.length - 1 ? null : <PylonMesh key={i} p={p} />,
      )}
      {wires.map((w, i) => (
        <group key={i}>
          <Cable curve={w} radius={0.13} color={wireColor} emissive={C.congestion} glow={ws.congestion * 1.4} segments={400} />
          <Flow
            curve={w}
            count={count}
            speed={flowSpeed}
            sec={sec}
            amount={flowAmt * (1 - ws.map)}
            color={flowColor}
            size={0.55}
            jam={ws.jam}
            phase={i * 0.37}
          />
        </group>
      ))}
    </group>
  );
};

const PANEL = new THREE.BoxGeometry(3.6, 0.14, 2.3);

const SolarPark: React.FC<{ws: WorldState}> = ({ws}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const panels = useMemo(() => {
    const out: [number, number][] = [];
    for (let z = SOLAR_PARK.minZ + 1.5; z <= SOLAR_PARK.maxZ - 1; z += 3.3) {
      for (let x = SOLAR_PARK.minX + 2; x <= SOLAR_PARK.maxX - 2; x += 3.9) out.push([x, z]);
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, 0, 0));
    panels.forEach(([x, z], i) => {
      m.compose(new THREE.Vector3(x, 1.5, z), q, new THREE.Vector3(1, 1, 1));
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [panels]);
  const cx = (SOLAR_PARK.minX + SOLAR_PARK.maxX) / 2;
  const cz = (SOLAR_PARK.minZ + SOLAR_PARK.maxZ) / 2;
  // Panelen glimmen geel (zonne-energie), sterker overdag
  const glint = 0.25 + 0.45 * (1 - ws.dusk);
  return (
    <group>
      <Clay pos={[cx, 0.12, cz]} size={[SOLAR_PARK.maxX - SOLAR_PARK.minX + 2, 0.2, SOLAR_PARK.maxZ - SOLAR_PARK.minZ + 2]} color="#a8c47a" shadow={false} />
      <instancedMesh ref={ref} args={[PANEL, undefined, panels.length]} castShadow receiveShadow>
        <meshStandardMaterial color="#2c4470" emissive={C.solar} emissiveIntensity={glint * 0.35} roughness={0.45} metalness={0.1} />
      </instancedMesh>
      {/* omvormerhuisje */}
      <Clay pos={[SOLAR_PARK.maxX + 3, 1.5, 4]} size={[3, 3, 4]} color="#dfe3e6" />
    </group>
  );
};

const Station: React.FC<{x: number; z: number; glow: number; glowColor: string}> = ({x, z, glow, glowColor}) => (
  <group position={[x, 0, z]}>
    <Clay pos={[0, 0.15, 0]} size={[12, 0.3, 10]} color="#b9bdc0" shadow={false} />
    <Clay pos={[-2.5, 1.8, -1.5]} size={[3.2, 3.4, 2.6]} color="#7f8a94" />
    <Clay pos={[1.8, 1.8, -1.5]} size={[3.2, 3.4, 2.6]} color="#7f8a94" />
    <Clay pos={[0, 1.6, 3]} size={[6, 3.2, 2.6]} color="#e4e0d8" />
    <mesh position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[7, 8.2, 40]} />
      <meshBasicMaterial color={glowColor} transparent opacity={glow * 0.85} toneMapped={false} />
    </mesh>
  </group>
);

export const Grid: React.FC<{ws: WorldState; sec: number}> = ({ws, sec}) => {
  // Kabel van het terrein naar de trafo (terugleveren, scène 2-3)
  const feed = useMemo(
    () => polyCurve([[16, 7.4, -14], [16, 0.5, -9.2], [16, 0.5, -6], [-14, 0.5, -6], [TRAFO.x + 4, 0.5, -6]]),
    [],
  );
  // Zonnepark → eigen, ver station (scène 3)
  const parkCable = useMemo(
    () => polyCurve([[SOLAR_PARK.maxX + 4.5, 0.5, 4], [110, 0.5, 4], [110, 0.5, PARK_STATION.z], [PARK_STATION.x - 6, 0.5, PARK_STATION.z]]),
    [],
  );
  // Terrein → trafo (scène 3: de andere kant op)
  const terrainCable = useMemo(
    () => polyCurve([[TERRAIN.maxX, 0.5, -6], [-14, 0.5, -6], [TRAFO.x + 4, 0.5, -6]]),
    [],
  );
  const trafoRed = Math.max(ws.congestion, ws.queue * 0.8);
  const trafoGlow = Math.max(trafoRed, ws.gridOn * 0.7);
  const trafoColor = ws.gridOn > 0.5 && trafoRed < 0.3 ? C.grid : C.congestion;
  const fade = 1 - ws.map;
  return (
    <group>
      <HvLine pts={HV_MAIN} ws={ws} sec={sec} flowSpeed={0.035} count={90} />
      <HvLine pts={HV_BRANCH} ws={ws} sec={sec} endHeight={11} flowSpeed={0.12} count={18} />
      {/* portaal in de trafo */}
      <group position={[TRAFO.x, 0, TRAFO.z - 3]}>
        <Clay pos={[-2.5, 5.5, 0]} size={[0.6, 11, 0.6]} color="#9aa3ab" />
        <Clay pos={[2.5, 5.5, 0]} size={[0.6, 11, 0.6]} color="#9aa3ab" />
        <Clay pos={[0, 11, 0]} size={[6, 0.5, 0.5]} color="#9aa3ab" />
      </group>
      <Station x={TRAFO.x} z={TRAFO.z} glow={trafoGlow} glowColor={trafoColor} />
      <SolarPark ws={ws} />
      <Station x={PARK_STATION.x} z={PARK_STATION.z} glow={ws.parkCables * 0.6} glowColor={C.solar} />

      {/* Scène 2: terugleveren ketst terug (geel → rood) */}
      <Cable curve={feed} radius={0.22} color="#5b6470" opacity={fade} />
      <Flow curve={feed} count={26} speed={0.32} sec={sec} amount={ws.bounce} color={C.solar} color2={C.congestion} size={0.5} bounce={1} />

      {/* Scène 3: twee kabels, twee kanten op */}
      <Cable curve={parkCable} radius={0.3} color={mixColor('#5b6470', C.solar, ws.parkCables * 0.6)} emissive={C.solar} glow={ws.parkCables * 0.6} reveal={Math.max(0.0011, ws.parkCables)} opacity={fade} />
      <Flow curve={parkCable} count={30} speed={0.14} sec={sec} amount={ws.parkCables} color={C.solar} size={0.6} />
      <Flow curve={terrainCable} count={24} speed={0.12} sec={sec} amount={ws.parkCables * (1 - ws.gridOn)} color={C.congestionSoft} size={0.55} jam={0.6} />
    </group>
  );
};
