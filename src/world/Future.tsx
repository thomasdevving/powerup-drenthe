import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {C, clamp01, easeOutBack, fract, mixColor, rand} from '../util';
import type {WorldState} from './state';
import {BUILDINGS} from './layout';
import {Cable, Clay, Flow, polyCurve} from './primitives';
import {pitchStep} from '../energy/pitch-data';
import {DEFAULT_THERMAL} from '../energy/profiles';

/**
 * Uitbreidingen voor het integrale verhaal, in dezelfde 3D-wereld:
 * problemen (plassen, vrachtwagens), warmtenet, gedeeld laadplein, groenstroken en coöperatie.
 */

export const HEAT = '#ff9d2e'; // warmte: amber-oranje (los van congestie-rood)
export const HEAT_SUPPLY = '#ffc06b';

/* ------------------------------------------------------------------ posities */

export const HEAT_STATION = {x: -18, z: 3.2};
export const LAADPLEIN = {minX: 34, maxX: 46, minZ: -4, maxZ: 10};
export const PUDDLES: [number, number, number][] = [
  [6, -9.6, 1.2], [-14, 3.5, 1.0], [14, -3, 0.9], [-30, -6, 1.1], [25, 22, 1.0], [-6, 22, 0.8],
];
const TRUCK_START: [number, number][] = [[30.9, -1], [30.9, 2.6], [30.9, 6.2]];
const TRUCK_END: [number, number][] = [[35.9, 8.7], [39.7, 8.7], [43.5, 8.7]];

/** Leidingen van het warmtenet (op maaiveldniveau getekend, ondergronds bedoeld). */
const HEAT_SOURCES: [number, number, number][][] = [
  // metaalbewerking (pand 1) → warmtestation
  [[-17.2, 0.45, -8.3], [-17.2, 0.45, -1.2], [HEAT_STATION.x + 0.6, 0.45, HEAT_STATION.z - 1.4]],
  // koel- en vrieshuis (pand 6) → warmtestation
  [[-5, 0.45, 11.8], [-5, 0.45, 8.8], [-17.2, 0.45, 8.8], [-17.2, 0.45, HEAT_STATION.z + 1.6]],
];
const HEAT_SINKS: [number, number, number][][] = [
  // → logistiek/kantoor pand 8
  [[HEAT_STATION.x - 0.8, 0.45, HEAT_STATION.z - 0.6], [-21, 0.45, HEAT_STATION.z - 0.6]],
  // → pand 7
  [[HEAT_STATION.x - 1.4, 0.45, HEAT_STATION.z + 1.4], [-19.6, 0.45, 9.5]],
  // → drukkerij pand 2
  [[-16.2, 0.45, HEAT_STATION.z - 1.2], [-16.2, 0.45, -7.8], [-2, 0.45, -7.8], [-2, 0.45, -11.4]],
];
const SINK_BUILDINGS = [7, 6, 1]; // indices in BUILDINGS
const SOURCE_BUILDINGS = [0, 5];

/* ------------------------------------------------------------------ problemen */

const Puddles: React.FC<{amt: number}> = ({amt}) =>
  amt <= 0.001 ? null : (
    <group>
      {PUDDLES.map(([x, z, s], i) => {
        const g = clamp01(amt * 1.4 - i * 0.07);
        return (
          <mesh key={i} position={[x, 0.44, z]} scale={[2.2 * s * g, 1, 1.4 * s * g]} rotation={[0, i * 0.7, 0]}>
            <cylinderGeometry args={[1, 1, 0.04, 20]} />
            <meshStandardMaterial color={C.water} roughness={0.15} metalness={0.2} emissive={C.water} emissiveIntensity={0.25} transparent opacity={0.9} />
          </mesh>
        );
      })}
    </group>
  );

const Truck: React.FC<{pos: [number, number]; scale: number; light: string; glow: number}> = ({pos, scale, light, glow}) => (
  <group position={[pos[0], 0, pos[1]]} scale={[scale, scale, scale]}>
    <Clay pos={[-1.15, 0.85, 0]} size={[2.5, 1.25, 1.0]} color="#eef1f3" />
    <Clay pos={[0.65, 0.75, 0]} size={[0.95, 1.05, 0.98]} color="#4f6d8f" />
    <Clay pos={[0.95, 0.95, 0]} size={[0.3, 0.45, 0.9]} color="#a9c4dc" shadow={false} />
    <mesh position={[-1.15, 1.75, 0]}>
      <sphereGeometry args={[0.28, 10, 8]} />
      <meshBasicMaterial color={light} toneMapped={false} transparent opacity={glow} />
    </mesh>
  </group>
);

const Trucks: React.FC<{ws: WorldState; sec: number}> = ({ws, sec}) => {
  if (ws.trucksIn <= 0.001) return null;
  const blink = 0.55 + 0.45 * Math.sin(sec * 5);
  return (
    <group>
      {TRUCK_START.map((a, i) => {
        const t = clamp01(ws.truckMove * 1.3 - i * 0.15);
        const b = TRUCK_END[i];
        // kleine boog zodat ze echt "rijden"
        const x = a[0] + (b[0] - a[0]) * t;
        const z = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 1.5;
        const charging = ws.truckMove >= 0.98;
        const light = charging ? C.grid : C.congestion;
        const glow = charging ? 1 : ws.pills.trucks * blink;
        return <Truck key={i} pos={[x, z]} scale={easeOutBack(clamp01(ws.trucksIn * 1.5 - i * 0.2))} light={light} glow={glow} />;
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ warmtenet */

const PLUME = new THREE.IcosahedronGeometry(1, 1);

/** Opstijgende restwarmte die verloren gaat. */
const Plume: React.FC<{x: number; y: number; z: number; amt: number; sec: number; seed: number}> = ({x, y, z, amt, sec, seed}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 18;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const u = fract(i / N + sec * 0.35 + seed * 0.13);
      const r = 0.6 + u * 2.4;
      v.set(x + Math.sin(i * 2.3 + sec) * r * 0.6, y + u * 9, z + Math.cos(i * 1.7 + sec * 0.8) * r * 0.6);
      sc.setScalar(Math.max(0.0001, (0.5 + u * 1.3) * amt));
      m.compose(v, q, sc);
      ref.current!.setMatrixAt(i, m);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[PLUME, undefined, N]} frustumCulled={false} visible={amt > 0.001}>
      <meshBasicMaterial color={HEAT} toneMapped={false} transparent opacity={0.28 * amt} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
};

const HeatNetwork: React.FC<{ws: WorldState; sec: number}> = ({ws, sec}) => {
  const sources = useMemo(() => HEAT_SOURCES.map(polyCurve), []);
  const sinks = useMemo(() => HEAT_SINKS.map(polyCurve), []);
  const step = ws.energyStep ?? pitchStep(ws.heatRecovered);
  const fill = ws.thermalCapacity > 0 ? step.bufferKwh / ws.thermalCapacity : 0;
  const cold = useMemo(() => polyCurve([[-5, 0.50, 11.8], [-5, 0.50, 17], [-12, 0.50, 17], [-12, 0.50, 11.8]]), []);
  const power = useMemo(() => polyCurve([[0, 0.55, 2], [-5, 0.55, 2], [-5, 0.55, 11.8]]), []);
  const net = ws.heatNet;
  const st = ws.heatStation;
  return (
    <group>
      {/* Doorsnede: blauw koelcircuit; geel elektrisch ingangsvermogen. Zelfde materialen en deeltjes. */}
      <Cable curve={cold} radius={0.24} color="#357eaf" emissive="#65baff" glow={0.9} reveal={ws.coldNet} segments={60} />
      <Flow curve={cold} count={12} speed={0.35} sec={sec} amount={ws.coldNet} color="#65baff" size={0.38} />
      <Cable curve={power} radius={0.16} color={C.solar} emissive={C.solar} glow={0.7} reveal={ws.coldNet} segments={60} />
      <Flow curve={power} count={8} speed={0.35} sec={sec} amount={ws.coldNet} color={C.solar} size={0.3} />
      {/* restwarmte die verloren gaat (vóór het warmtenet) */}
      {SOURCE_BUILDINGS.map((bi, k) => {
        const b = BUILDINGS[bi];
        return <Plume key={bi} x={b.x} y={b.h + 1} z={b.z} amt={Math.max(ws.heatWaste, 0)} sec={sec} seed={k * 3} />;
      })}
      {/* bronnen gloeien zacht oranje zodra ze leveren */}
      {SOURCE_BUILDINGS.map((bi) => {
        const b = BUILDINGS[bi];
        const g = Math.max(ws.heatWaste, ws.heatFlow);
        if (g <= 0.01) return null;
        return <Clay key={`s${bi}`} pos={[b.x, b.h * 0.6, b.z + b.d / 2 + 0.06]} size={[b.w * 0.8, 0.9, 0.06]} color={HEAT} emissive={HEAT} glow={1.2 * g} shadow={false} />;
      })}
      {/* afnemers worden warm */}
      {SINK_BUILDINGS.map((bi) => {
        const b = BUILDINGS[bi];
        if (ws.heatSinks <= 0.01) return null;
        return <Clay key={`k${bi}`} pos={[b.x, b.h * 0.6, b.z + b.d / 2 + 0.06]} size={[b.w * 0.8, 0.9, 0.06]} color={HEAT_SUPPLY} emissive={HEAT_SUPPLY} glow={0.9 * ws.heatSinks} shadow={false} />;
      })}
      {/* leidingen: donkere sleuf + gloeiende buis */}
      {[...sources, ...sinks].map((cv, i) => {
        const r = clamp01(net * 1.6 - (i < sources.length ? 0 : 0.6) - i * 0.04);
        return (
          <group key={i}>
            <Cable curve={cv} radius={0.42} color="#4a3a30" reveal={r} segments={60} />
            <Cable curve={cv} radius={0.24} color="#a65d1a" emissive={HEAT} glow={0.9} reveal={r} segments={60} />
          </group>
        );
      })}
      {sources.map((cv, i) => (
        <Flow key={`fs${i}`} curve={cv} count={12} speed={0.35} sec={sec} amount={ws.heatFlow} color={HEAT} size={0.42} phase={i * 0.3} />
      ))}
      {sinks.map((cv, i) => (
        <Flow key={`fk${i}`} curve={cv} count={8} speed={0.45} sec={sec} amount={ws.heatFlow} color={HEAT_SUPPLY} size={0.38} phase={i * 0.2} />
      ))}
      {/* Uitgaande bufferstroom, alleen als het gedeelde rekenmodel daadwerkelijk ontlaadt. */}
      <Flow curve={sinks[0]} count={7} speed={0.55} sec={sec} amount={step.bufferDischarge > 0.1 ? ws.heatFlow : 0} color="#ffc06b" size={0.52} />
      {/* warmtestation: warmtepomp + warmtebuffer */}
      {st > 0.001 ? (
        <group position={[HEAT_STATION.x, 0, HEAT_STATION.z]} scale={[st, st, st]}>
          <Clay pos={[0, 0.3, 0]} size={[3.4, 0.3, 6.2]} color="#c9ccce" shadow={false} />
          <Clay pos={[0.2, 1.4, 1.6]} size={[2.4, 2.0, 2.4]} color="#eef1f2" />
          <Clay pos={[0.2, 2.45, 1.6]} size={[2.5, 0.18, 2.5]} color={HEAT} emissive={HEAT} glow={0.8} shadow={false} />
          <mesh position={[0.2, 2.6, 1.6]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.75, 0.75, 0.12, 16]} />
            <meshStandardMaterial color="#5e6b75" roughness={0.6} />
          </mesh>
          <mesh position={[0, 3.2, -1.4]} castShadow>
            <cylinderGeometry args={[1.25, 1.25, 6, 18]} />
            <meshStandardMaterial color="#f2efe9" roughness={0.8} />
          </mesh>
          {/* vulling buffer */}
          <mesh position={[0, 0.3 + 2.8 * fill, -1.4 + 0.0]} scale={[1, fill, 1]}>
            <cylinderGeometry args={[1.28, 1.28, 5.6, 18, 1, true]} />
            <meshBasicMaterial color={HEAT} toneMapped={false} transparent opacity={0.45} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};

/* ------------------------------------------------------------------ laadplein */

const CAR_COLORS = ['#5c6b7a', '#c9ced3', '#8b9dad', '#3e4a55', '#d8d2c6', '#7a8794'];

const Laadplein: React.FC<{ws: WorldState; sec: number}> = ({ws}) => {
  const a = ws.laadplein;
  if (a <= 0.001) return null;
  const L = LAADPLEIN;
  const cx = (L.minX + L.maxX) / 2;
  const cz = (L.minZ + L.maxZ) / 2;
  const w = L.maxX - L.minX;
  const d = L.maxZ - L.minZ;
  const rows = [-2.0, 1.4, 4.8];
  const solar = ws.laadSolar;
  return (
    <group>
      <group position={[cx, 0, cz]} scale={[a, 1, a]}>
        <Clay pos={[0, 0.2, 0]} size={[w, 0.24, d]} color="#a4aaaf" shadow={false} />
        {/* groene randen en wadi */}
        <Clay pos={[0, 0.36, -d / 2 + 0.4]} size={[w, 0.12, 0.8]} color="#7fb35a" shadow={false} />
        <Clay pos={[-w / 2 + 0.4, 0.36, 0]} size={[0.8, 0.12, d]} color="#7fb35a" shadow={false} />
        <Clay pos={[w / 2 - 0.9, 0.36, -0.5]} size={[1.8, 0.12, d - 3]} color="#7fb35a" shadow={false} />
        <mesh position={[w / 2 - 0.9, 0.44, -0.5]} scale={[0.75, 1, 4.6]}>
          <cylinderGeometry args={[1, 1, 0.08, 20]} />
          <meshStandardMaterial color={C.water} roughness={0.2} emissive={C.water} emissiveIntensity={0.15} />
        </mesh>
        {/* bomenrij tussen auto's en vrachtwagens */}
        {[-4.2, -2.4, -0.6, 1.2, 3.0].map((x, i) => (
          <mesh key={i} position={[x, 2.1, 6.55 - cz + 0.1]} castShadow>
            <icosahedronGeometry args={[0.9, 0]} />
            <meshStandardMaterial color="#5f9a48" flatShading roughness={0.95} />
          </mesh>
        ))}
      </group>
      {/* carports met zonnepanelen en auto's */}
      {rows.map((z, r) => (
        <group key={r} position={[L.minX + 5.1, 0, z]}>
          {[-4.2, -1.4, 1.4, 4.2].map((x) => (
            <Clay key={x} pos={[x, 1.25 * a, -0.85]} size={[0.16, 2.3 * a, 0.16]} color="#8d969e" shadow={false} />
          ))}
          <group position={[0, 2.45 * a, 0]} rotation={[0.14 * solar, 0, 0]} scale={[solar, 1, 1]}>
            <Clay pos={[0, 0, 0]} size={[9.2, 0.14, 2.1]} color="#2c4470" emissive={C.solar} glow={0.18 * solar} />
          </group>
          {[-3.8, -2.3, -0.8, 0.7, 2.2, 3.7].map((x, i) => {
            const show = clamp01(a * 2 - 0.6 - ((i + r) % 3) * 0.15);
            if (show <= 0.01 || rand(r * 9 + i) < 0.25) return null;
            return <Clay key={i} pos={[x, 0.62, 0.1]} size={[0.75 * show, 0.55, 1.25]} color={CAR_COLORS[(i + r * 2) % CAR_COLORS.length]} />;
          })}
          {/* laadpalen */}
          {[-3.05, -0.05, 2.95].map((x) => (
            <group key={x} position={[x, 0, -0.95]}>
              <Clay pos={[0, 0.55, 0]} size={[0.18, 0.8, 0.18]} color="#e9eef1" shadow={false} />
              <mesh position={[0, 1.02, 0]}>
                <sphereGeometry args={[0.13, 8, 6]} />
                <meshBasicMaterial color={C.grid} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* vrachtwagenplaatsen met snelladers */}
      {TRUCK_END.map(([x, z], i) => (
        <group key={i} position={[x, 0, z - 1.2]}>
          <Clay pos={[0, 0.7, 0]} size={[0.3, 1.1, 0.3]} color="#e9eef1" shadow={false} />
          <mesh position={[0, 1.35, 0]}>
            <sphereGeometry args={[0.18, 8, 6]} />
            <meshBasicMaterial color={C.grid} toneMapped={false} />
          </mesh>
          <Clay pos={[0, 0.34, 1.2]} size={[3.8, 0.02, 1.4]} color="#8e959b" shadow={false} />
        </group>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ groenstroken */

const STRIPS: [number, number, number, number][] = [
  // x, z, breedte, diepte — langs de toegangsweg
  [-31, -3.95, 30, 0.7],
  [-37, -8.05, 18, 0.7],
];

const GreenStrips: React.FC<{amt: number}> = ({amt}) =>
  amt <= 0.001 ? null : (
    <group>
      {STRIPS.map(([x, z, w, d], i) => (
        <Clay key={i} pos={[x, 0.43, z]} size={[w * amt, 0.1, d]} color="#86bb5c" shadow={false} />
      ))}
      {STRIPS.flatMap(([x, z, w], i) =>
        Array.from({length: Math.floor(w / 4)}, (_, k) => {
          const tx = x - w / 2 + 2 + k * 4;
          const g = easeOutBack(clamp01(amt * 1.5 - k * 0.04));
          return (
            <mesh key={`${i}-${k}`} position={[tx, 1.6 * g, z]} scale={[g, g, g]} castShadow>
              <icosahedronGeometry args={[1.0, 0]} />
              <meshStandardMaterial color="#5f9a48" flatShading roughness={0.95} />
            </mesh>
          );
        }),
      )}
    </group>
  );

/* ------------------------------------------------------------------ coöperatie */

export const COOP_NODE: [number, number, number] = [0, 21, 0];

const Coop: React.FC<{amt: number; sec: number}> = ({amt, sec}) => {
  const curves = useMemo(
    () =>
      BUILDINGS.map((b) => {
        const a = new THREE.Vector3(b.x, b.h + 1.2, b.z);
        const n = new THREE.Vector3(...COOP_NODE);
        const mid = a.clone().lerp(n, 0.5);
        mid.y += 4;
        return new THREE.QuadraticBezierCurve3(a, mid, n);
      }),
    [],
  );
  if (amt <= 0.001) return null;
  const pulse = 1 + 0.08 * Math.sin(sec * 3);
  return (
    <group>
      {curves.map((cv, i) => {
        const r = clamp01(amt * 1.6 - i * 0.07);
        return (
          <group key={i}>
            <Cable curve={cv} radius={0.14} color="#d9ffe6" emissive={C.gridGreen} glow={0.8} reveal={r} segments={40} />
            <Flow curve={cv} count={4} speed={0.4} sec={sec} amount={r > 0.98 ? 1 : 0} color="#e9fff1" size={0.3} phase={i * 0.17} />
            <mesh position={[BUILDINGS[i].x, BUILDINGS[i].h + 1.3, BUILDINGS[i].z]} scale={[r, r, r]}>
              <sphereGeometry args={[0.8, 12, 8]} />
              <meshBasicMaterial color={C.gridGreen} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      <group position={COOP_NODE} scale={[amt * pulse, amt * pulse, amt * pulse]}>
        <mesh>
          <sphereGeometry args={[1.3, 20, 14]} />
          <meshBasicMaterial color="#f4fff8" toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, sec * 0.6]}>
          <torusGeometry args={[2.6, 0.18, 8, 40]} />
          <meshBasicMaterial color={C.gridGreen} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[3.4, 20, 14]} />
          <meshBasicMaterial color={C.gridGreen} toneMapped={false} transparent opacity={0.15} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ alles samen */

export const Future: React.FC<{ws: WorldState; sec: number}> = ({ws, sec}) => (
  <group visible={ws.localFade < 0.999}>
    <Puddles amt={ws.puddles} />
    <Trucks ws={ws} sec={sec} />
    <HeatNetwork ws={ws} sec={sec} />
    <Laadplein ws={ws} sec={sec} />
    <GreenStrips amt={ws.green} />
    <Coop amt={ws.coop} sec={sec} />
  </group>
);

export const _unused = mixColor;
