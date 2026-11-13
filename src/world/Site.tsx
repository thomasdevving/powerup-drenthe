import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {C, clamp01, easeOutBack, mixColor, rand, seg} from '../util';
import type {WorldState} from './state';
import {BUILDINGS, DASH, HUB, RING, TERRAIN, TRAFO, TURBINE, WADIS, type Building} from './layout';
import {Cable, Clay, Flow, polyCurve, roundedRectCurve} from './primitives';

/** Het bedrijventerrein zelf: panden, wachtrij, Energy Hub, ringnet, vergroening. */

const RING_ROAD = {hx: 14, hz: 9.5, w: 3};
const ENTRY_Z = -6;

const insideBuilding = (x: number, z: number, margin: number) =>
  BUILDINGS.some(
    (b) => Math.abs(x - b.x) < b.w / 2 + margin && Math.abs(z - b.z) < b.d / 2 + margin,
  );

const onRoad = (x: number, z: number, margin: number) => {
  const ringBand =
    Math.abs(x) < RING_ROAD.hx + RING_ROAD.w / 2 + margin &&
    Math.abs(z) < RING_ROAD.hz + RING_ROAD.w / 2 + margin &&
    !(Math.abs(x) < RING_ROAD.hx - RING_ROAD.w / 2 - margin && Math.abs(z) < RING_ROAD.hz - RING_ROAD.w / 2 - margin);
  const entry = x < -12 && Math.abs(z - ENTRY_Z) < 1.5 + margin;
  return ringBand || entry;
};

/** Vrije plekken op het terrein (voor groen). */
const freeSpots = () => {
  const out: {x: number; z: number; r: number}[] = [];
  let k = 0;
  for (let x = TERRAIN.minX + 2.5; x <= TERRAIN.maxX - 2.5; x += 3.6) {
    for (let z = TERRAIN.minZ + 2.5; z <= TERRAIN.maxZ - 2.5; z += 3.6) {
      k++;
      if (insideBuilding(x, z, 1.2)) continue;
      if (onRoad(x, z, 0.8)) continue;
      if (Math.abs(x) < RING_ROAD.hx - 2 && Math.abs(z) < RING_ROAD.hz - 2) continue; // hub-plein
      out.push({x, z, r: rand(k * 1.31)});
    }
  }
  return out;
};

const roofPanelSpots = (b: Building) => {
  const out: [number, number][] = [];
  for (let x = -b.w / 2 + 1.6; x <= b.w / 2 - 1.6; x += 2.4) {
    for (let z = -b.d / 2 + 1.4; z <= b.d / 2 - 1.4; z += 2.2) out.push([x, z]);
  }
  return out;
};

const RoofSolar: React.FC<{b: Building; open: number}> = ({b, open}) => {
  const spots = useMemo(() => roofPanelSpots(b), [b]);
  if (open <= 0.001) return null;
  return (
    <group position={[b.x, b.h, b.z]}>
      {spots.map(([x, z], i) => {
        const o = clamp01(open * 1.6 - (i / spots.length) * 0.6);
        return (
          <mesh key={i} position={[x, 0.35 + 0.4 * o, z]} rotation={[0.45 * o, 0, 0]} scale={[o, 1, 1]} castShadow>
            <boxGeometry args={[2.1, 0.12, 1.7]} />
            <meshStandardMaterial color="#2c4470" emissive={C.solar} emissiveIntensity={0.18 * o} roughness={0.45} />
          </mesh>
        );
      })}
    </group>
  );
};

const nearestEdge = (b: Building): [number, number] => [
  Math.min(Math.max(HUB.x, b.x - b.w / 2), b.x + b.w / 2),
  Math.min(Math.max(HUB.z, b.z - b.d / 2), b.z + b.d / 2),
];
const ringPoint = (b: Building): [number, number] => {
  const [ex, ez] = nearestEdge(b);
  return [Math.min(Math.max(ex, -RING.hx), RING.hx), Math.min(Math.max(ez, -RING.hz), RING.hz)];
};

const BATTERIES = [-5.25, -1.75, 1.75, 5.25];

const Hub: React.FC<{ws: WorldState; sec: number}> = ({ws}) => {
  const rise = ws.hubRise;
  if (rise <= 0.001) return null;
  const y = -9 * (1 - rise);
  const level = ws.battery;
  return (
    <group position={[HUB.x, y, HUB.z]}>
      <Clay pos={[0, 0.35, 0]} size={[15, 0.6, 12]} color="#eef1f2" />
      {/* technisch gebouw met cyaan band */}
      <Clay pos={[0, 2.9, -3.2]} size={[8, 4.6, 3.6]} color="#f4f6f7" />
      <Clay pos={[0, 5.3, -3.2]} size={[8.2, 0.35, 3.8]} color={C.grid} emissive={C.grid} glow={1.2} />
      {/* batterijcontainers met vulniveau */}
      {BATTERIES.map((x, i) => (
        <group key={i} position={[x, 0, 2]}>
          <Clay pos={[0, 2.25, 0]} size={[2.9, 3.3, 5.2]} color="#dfe6ea" />
          {[0, 1, 2, 3, 4].map((k) => {
            const fill = clamp01(level * 5 - k);
            const col = mixColor('#3c4a55', C.battery, fill);
            return (
              <Clay
                key={k}
                pos={[0, 0.95 + k * 0.6, 2.65]}
                size={[2.2, 0.42, 0.12]}
                color={col}
                emissive={C.battery}
                glow={fill * 1.3}
                shadow={false}
              />
            );
          })}
        </group>
      ))}
    </group>
  );
};

const Turbine: React.FC<{amt: number; sec: number}> = ({amt, sec}) => {
  if (amt <= 0.001) return null;
  const H = 17;
  const angle = sec * 2.4 * amt;
  return (
    <group position={[TURBINE.x, 0, TURBINE.z]} scale={[1, amt, 1]}>
      <mesh position={[0, H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.55, H, 8]} />
        <meshStandardMaterial color="#f2f4f5" roughness={0.8} />
      </mesh>
      <Clay pos={[0, H, -0.3]} size={[1, 1, 2.2]} color="#f2f4f5" />
      <group position={[0, H, 0.9]} rotation={[0, 0, angle]}>
        {[0, 1, 2].map((k) => (
          <group key={k} rotation={[0, 0, (k * Math.PI * 2) / 3]}>
            <Clay pos={[0, 3.6, 0]} size={[0.7, 7.2, 0.18]} color="#ffffff" />
          </group>
        ))}
      </group>
    </group>
  );
};

export const Site: React.FC<{ws: WorldState; sec: number}> = ({ws, sec}) => {
  const spots = useMemo(freeSpots, []);
  const ringCurve = useMemo(() => roundedRectCurve(RING.hx, RING.hz, 3, 0.55), []);
  const spurs = useMemo(
    () =>
      BUILDINGS.map((b) => {
        const [rx, rz] = ringPoint(b);
        const [ex, ez] = nearestEdge(b);
        return polyCurve([[rx, 0.55, rz], [ex, 0.55, ez], [ex, Math.min(2, b.h), ez]]);
      }),
    [],
  );
  const roofFlows = useMemo(
    () =>
      BUILDINGS.map((b) => {
        const [rx, rz] = ringPoint(b);
        const [ex, ez] = nearestEdge(b);
        return polyCurve([[b.x, b.h + 0.8, b.z], [ex, b.h + 0.3, ez], [ex, 0.6, ez], [rx, 0.6, rz]]);
      }),
    [],
  );
  const supply = useMemo(
    () => polyCurve([[TRAFO.x + 4, 0.7, ENTRY_Z], [-14, 0.7, ENTRY_Z], [-7, 0.7, -1.5], [-3, 0.9, 0]]),
    [],
  );
  const parkLink = useMemo(
    () => polyCurve([[46, 0.6, -6], [18, 0.6, -6], [RING.hx + 0.5, 0.6, -5], [5, 0.9, 0.5]]),
    [],
  );
  const peakB = BUILDINGS[5];
  const discharge = useMemo(
    () => polyCurve([[0, 0.9, 1], [0, 0.6, RING.hz], [nearestEdge(peakB)[0], 0.6, nearestEdge(peakB)[1]], [peakB.x, peakB.h + 0.8, peakB.z]]),
    [peakB],
  );
  const community = useMemo(() => {
    const pairs: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [0, 5], [2, 6], [1, 4]];
    return pairs.map(([a, b]) => {
      const A = BUILDINGS[a];
      const B = BUILDINGS[b];
      const pa = new THREE.Vector3(A.x, A.h + 1.2, A.z);
      const pb = new THREE.Vector3(B.x, B.h + 1.2, B.z);
      const mid = pa.clone().lerp(pb, 0.5);
      mid.y += 6 + pa.distanceTo(pb) * 0.25;
      return new THREE.QuadraticBezierCurve3(pa, mid, pb);
    });
  }, []);

  const treeRef = useRef<THREE.InstancedMesh>(null);
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const treeSpots = useMemo(() => spots.filter((s) => s.r > 0.5), [spots]);
  const grassSpots = useMemo(() => spots.filter((s) => s.r <= 0.75), [spots]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    treeSpots.forEach((t, i) => {
      const g = easeOutBack(clamp01(ws.green * 1.5 - t.r * 0.5));
      sc.setScalar(Math.max(0.0001, g * (0.75 + t.r * 0.4)));
      m.compose(v.set(t.x, 3 * sc.y, t.z), q, sc);
      treeRef.current!.setMatrixAt(i, m);
    });
    treeRef.current!.instanceMatrix.needsUpdate = true;
    grassSpots.forEach((t, i) => {
      const g = clamp01(ws.green * 1.4 - t.r * 0.4);
      sc.set(Math.max(0.0001, 3.5 * g), 1, Math.max(0.0001, 3.5 * g));
      m.compose(v.set(t.x, 0.42, t.z), q, sc);
      grassRef.current!.setMatrixAt(i, m);
    });
    grassRef.current!.instanceMatrix.needsUpdate = true;
  });

  const ghostVis = Math.min(seg(ws.s, 1.0, 1.05), 1 - seg(ws.s, 3.2, 3.5));
  const fade = 1 - ws.localFade;

  return (
    <group visible={fade > 0.001}>
      {/* terrein: asfalt + wegen */}
      <Clay pos={[0, 0.2, 0]} size={[TERRAIN.maxX - TERRAIN.minX, 0.3, TERRAIN.maxZ - TERRAIN.minZ]} color={C.asphalt} shadow={false} />
      {/* ringweg */}
      {[
        [0, -RING_ROAD.hz, RING_ROAD.hx * 2 + RING_ROAD.w, RING_ROAD.w],
        [0, RING_ROAD.hz, RING_ROAD.hx * 2 + RING_ROAD.w, RING_ROAD.w],
        [-RING_ROAD.hx, 0, RING_ROAD.w, RING_ROAD.hz * 2],
        [RING_ROAD.hx, 0, RING_ROAD.w, RING_ROAD.hz * 2],
        [(TRAFO.x - 14) / 2 + 2, ENTRY_Z, -TRAFO.x - 14 + 4, 3],
      ].map(([x, z, w, d], i) => (
        <Clay key={i} pos={[x, 0.38, z]} size={[w, 0.06, d]} color="#6d7278" shadow={false} />
      ))}
      {/* plein waar de hub komt */}
      <Clay pos={[0, 0.355, 0]} size={[RING_ROAD.hx * 2 - 3, 0.03, RING_ROAD.hz * 2 - 3]} color="#a3a7aa" shadow={false} />

      {/* panden */}
      {BUILDINGS.map((b, i) => {
        const greenRoof = b.greenRoof ? ws.green : 0;
        const isPeak = i === 5;
        const peakGlow = isPeak ? ws.peak * (1 - clamp01(ws.discharge * 2.2)) : 0;
        return (
          <group key={i}>
            <Clay pos={[b.x, b.h / 2 + 0.35, b.z]} size={[b.w, b.h, b.d]} color={b.color} emissive={C.congestionSoft} glow={peakGlow * 0.35} />
            {/* raamband */}
            <Clay pos={[b.x, b.h * 0.6, b.z + b.d / 2 + 0.02]} size={[b.w * 0.8, 0.9, 0.08]} color="#7d8e9c" shadow={false} />
            <Clay pos={[b.x, b.h + 0.5, b.z]} size={[b.w + 0.3, 0.3, b.d + 0.3]} color={mixColor('#c9c4b9', '#7fb35a', greenRoof)} shadow={false} />
            {b.solarFromStart ? <RoofSolar b={b} open={1} /> : !b.greenRoof ? <RoofSolar b={b} open={ws.solarOpen} /> : null}
            {b.greenRoof && greenRoof > 0.01 ? (
              <Clay pos={[b.x, b.h + 0.8, b.z]} size={[(b.w - 0.6) * greenRoof, 0.5, (b.d - 0.6) * greenRoof]} color="#6fa84e" shadow={false} />
            ) : null}
          </group>
        );
      })}

      {/* Scène 2: pand 1 probeert een verdieping te groeien (spookvolume), stopt en kleurt rood */}
      {(() => {
        const b = BUILDINGS[0];
        const hFloor = 3;
        const tryRise = ghostVis * (ws.growTry * 0.75 - ws.growStop * 0.3);
        const okRise = ws.growOk;
        const rise = Math.max(tryRise, okRise);
        const red = ghostVis * ws.growStop * (1 - okRise);
        if (rise <= 0.001) return null;
        return (
          <group>
            <Clay
              pos={[b.x, b.h + 0.65 + hFloor * (rise - 0.5), b.z]}
              size={[b.w - 0.6, hFloor, b.d - 0.6]}
              color={mixColor(mixColor('#ffffff', C.congestion, red), b.color, okRise)}
              emissive={C.congestion}
              glow={red * 0.8}
              opacity={okRise > 0.5 ? 1 : 0.78}
            />
            {red > 0.05 ? (
              <mesh position={[b.x, b.h + 0.65 + hFloor * rise + 0.3, b.z]}>
                <boxGeometry args={[b.w + 0.4, 0.25, b.d + 0.4]} />
                <meshBasicMaterial color={C.congestion} toneMapped={false} transparent opacity={red} />
              </mesh>
            ) : null}
          </group>
        );
      })()}

      {/* Wachtrij aanvraag-blokjes bij de netaansluiting */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = clamp01(ws.queue * 1.8 - i * 0.12);
        if (a <= 0.001) return null;
        const x = TRAFO.x + 7 + i * 2.7 + (1 - a) * 30;
        return (
          <group key={i} position={[x, 0, ENTRY_Z - 0.2]} scale={[a, a, a]}>
            <Clay pos={[0, 1.15, 0]} size={[1.9, 1.9, 1.9]} color={C.congestionSoft} emissive={C.congestion} glow={0.45} />
            <Clay pos={[0, 2.15, 0]} size={[1.2, 0.12, 1.2]} color="#fff4ec" shadow={false} />
          </group>
        );
      })}
      {/* slagboom */}
      {ws.queue > 0.01 ? (
        <Clay pos={[TRAFO.x + 5.2, 1.6, ENTRY_Z]} size={[0.35, 0.35, 4]} color={C.congestion} emissive={C.congestion} glow={0.8 * ws.queue} />
      ) : null}

      {/* Energy Hub */}
      <Hub ws={ws} sec={sec} />
      <Cable curve={supply} radius={0.75} color={mixColor('#5b6470', '#2aa6c0', ws.supplyCable)} emissive={C.grid} glow={0.5 * ws.supplyCable} reveal={ws.supplyCable} segments={120} />
      <Flow curve={supply} count={22} speed={0.18} sec={sec} amount={ws.supplyCable * fade} color={C.grid} size={0.65} />

      {/* Ringnet + aftakkingen */}
      <Cable curve={ringCurve} radius={0.35} color="#1f8f8a" emissive={C.grid} glow={0.9} reveal={ws.ring} closed segments={200} />
      <Flow curve={ringCurve} count={40} speed={0.12} sec={sec} amount={ws.ring > 0.98 ? 1 : 0} color={C.grid} size={0.4} />
      {spurs.map((sp, i) => {
        const r = clamp01(ws.ring * 1.6 - 0.4 - i * 0.05);
        return (
          <group key={i}>
            <Cable curve={sp} radius={0.25} color="#1f8f8a" emissive={C.grid} glow={0.9} reveal={r} segments={30} />
            <Flow curve={sp} count={6} speed={0.5} sec={sec} amount={r > 0.98 ? 1 : 0} color={C.gridGreen} size={0.35} phase={i * 0.13} />
          </group>
        );
      })}
      {/* zonnestroom van de daken het net in (geel) */}
      {roofFlows.map((rf, i) => {
        const b = BUILDINGS[i];
        if (b.greenRoof) return null;
        const amt = b.solarFromStart ? Math.max(ws.solarOpen, ws.gridOn) : ws.solarOpen;
        return <Flow key={i} curve={rf} count={7} speed={0.45} sec={sec} amount={amt * ws.gridOn} color={C.solar} size={0.38} phase={i * 0.21} />;
      })}
      {/* zonnepark nu wél verbonden met de hub */}
      <Cable curve={parkLink} radius={0.45} color="#b39a2a" emissive={C.solar} glow={0.7} reveal={ws.parkLink} segments={80} />
      <Flow curve={parkLink} count={16} speed={0.25} sec={sec} amount={ws.parkLink > 0.98 ? fade : 0} color={C.solar} size={0.5} />
      {/* piek: batterij ontlaadt naar het piekende pand */}
      <Flow curve={discharge} count={12} speed={0.6} sec={sec} amount={ws.peak} color={C.grid} size={0.45} />
      {ws.peak > 0.01 ? (() => {
        const flat = clamp01(ws.discharge * 2.2);
        const h = 1 + 10 * (1 - 0.7 * flat);
        const col = mixColor(C.congestionSoft, C.grid, flat);
        return (
          <group position={[peakB.x + peakB.w / 2 - 1.8, peakB.h + 0.7, peakB.z + 1]}>
            <mesh position={[0, h / 2, 0]} scale={[ws.peak, 1, ws.peak]}>
              <boxGeometry args={[2.2, h, 2.2]} />
              <meshBasicMaterial color={col} toneMapped={false} />
            </mesh>
            <mesh position={[0, h / 2, 0]} scale={[ws.peak, 1, ws.peak]}>
              <boxGeometry args={[3.4, h + 0.8, 3.4]} />
              <meshBasicMaterial color={col} toneMapped={false} transparent opacity={0.25} depthWrite={false} />
            </mesh>
          </group>
        );
      })() : null}
      <Turbine amt={ws.turbine} sec={sec} />

      {/* Scène 7: groen, bomen, wadi's, hittewaas */}
      <instancedMesh ref={treeRef} args={[undefined, undefined, treeSpots.length]} castShadow>
        <icosahedronGeometry args={[1.9, 0]} />
        <meshStandardMaterial color="#5f9a48" roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={grassRef} args={[undefined, undefined, grassSpots.length]}>
        <boxGeometry args={[1, 0.12, 1]} />
        <meshStandardMaterial color="#8fbf62" roughness={1} />
      </instancedMesh>
      {WADIS.map(([x, z, s], i) => {
        const g = clamp01(ws.green * 1.4 - i * 0.12);
        if (g <= 0.001) return null;
        return (
          <group key={i} position={[x, 0.42, z]} scale={[g * s, 1, g * s]}>
            <mesh scale={[3.4, 1, 1.6]}>
              <cylinderGeometry args={[1.25, 1.25, 0.12, 20]} />
              <meshStandardMaterial color="#8fbf62" roughness={1} />
            </mesh>
            <mesh scale={[3.4, 1, 1.6]} position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.95, 0.95, 0.12, 20]} />
              <meshStandardMaterial color={C.water} roughness={0.3} emissive={C.water} emissiveIntensity={0.15} />
            </mesh>
          </group>
        );
      })}
      {ws.heat > 0.01
        ? [1.5, 4.5, 8, 12].map((y, i) => (
            <mesh key={i} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[46 - i * 4, 40]} />
              <meshBasicMaterial color={C.congestion} transparent opacity={ws.heat * (0.13 - i * 0.02)} depthWrite={false} toneMapped={false} />
            </mesh>
          ))
        : null}

      {/* community-lijnen tussen ondernemers */}
      {community.map((cv, i) => {
        const r = clamp01(ws.community * 1.5 - i * 0.045) * (1 - seg(ws.s, 7.0, 7.15));
        if (r <= 0.001) return null;
        return <Cable key={i} curve={cv} radius={0.16} color="#d9ffe6" emissive={C.gridGreen} glow={0.8} reveal={r} segments={40} />;
      })}
      {BUILDINGS.map((b, i) => {
        const r = clamp01(ws.community * 3 - i * 0.1) * (1 - seg(ws.s, 7.0, 7.15));
        if (r <= 0.001) return null;
        return (
          <mesh key={i} position={[b.x, b.h + 1.3, b.z]} scale={[r, r, r]}>
            <sphereGeometry args={[0.9, 12, 8]} />
            <meshBasicMaterial color={C.gridGreen} toneMapped={false} />
          </mesh>
        );
      })}

      {/* zwevend dashboardpaneel (inhoud wordt als 2D-overlay erop gelegd) */}
      {ws.dash > 0.001 ? (
        <group position={[DASH.x, DASH.y, DASH.z]} scale={[0.6 + 0.4 * ws.dash, 0.6 + 0.4 * ws.dash, 1]}>
          <mesh>
            <boxGeometry args={[DASH.w + 1.2, DASH.h + 1.2, 0.4]} />
            <meshBasicMaterial color={C.grid} transparent opacity={0.85 * ws.dash} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0.25]}>
            <boxGeometry args={[DASH.w, DASH.h, 0.3]} />
            <meshBasicMaterial color="#0d1b26" transparent opacity={0.94 * ws.dash} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};
