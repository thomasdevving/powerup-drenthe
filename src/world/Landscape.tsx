import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {C, mixColor, rand} from '../util';
import type {WorldState} from './state';

/** Vlak Drents landschap: weilanden, akkers, bomenrijen, boerderijen, wegen. */

const FIELD_W = 64;
const FIELD_D = 44;
const EXTENT = 720;

const isReserved = (x: number, z: number) =>
  // terrein + zonnepark + trafo-zone vrijhouden
  x > -78 && x < 100 && z > -44 && z < 46;

type Field = {x: number; z: number; w: number; d: number; color: THREE.Color};

const FIELD_COLORS = ['#9cc06b', '#8fb862', '#a9c873', '#b7cf7c', '#86ad5a', '#c9cf86', '#a1bf6a'];

const makeFields = (): Field[] => {
  const out: Field[] = [];
  let k = 0;
  for (let x = -EXTENT; x < EXTENT; x += FIELD_W) {
    for (let z = -EXTENT; z < EXTENT; z += FIELD_D) {
      k++;
      const cx = x + FIELD_W / 2;
      const cz = z + FIELD_D / 2;
      if (isReserved(cx, cz)) continue;
      const col = FIELD_COLORS[Math.floor(rand(k) * FIELD_COLORS.length)];
      out.push({x: cx, z: cz, w: FIELD_W - 2.2, d: FIELD_D - 2.2, color: new THREE.Color(col)});
    }
  }
  return out;
};

type Tree = {x: number; z: number; s: number};

const makeTrees = (): Tree[] => {
  const out: Tree[] = [];
  let k = 0;
  // bomenrijen langs een deel van de perceelranden (noord-zuid) en wegen (oost-west)
  for (let x = -EXTENT; x <= EXTENT; x += FIELD_W) {
    k++;
    if (rand(k * 3.1) < 0.45) continue;
    for (let z = -EXTENT; z < EXTENT; z += 7) {
      if (isReserved(x, z)) continue;
      if (rand(x * 0.37 + z * 1.3) < 0.12) continue;
      out.push({x: x + (rand(z) - 0.5) * 1.2, z, s: 0.8 + rand(x + z) * 0.5});
    }
  }
  for (let z = -EXTENT; z <= EXTENT; z += FIELD_D * 3) {
    k++;
    if (rand(k * 5.7) < 0.4) continue;
    for (let x = -EXTENT; x < EXTENT; x += 7) {
      if (isReserved(x, z)) continue;
      out.push({x, z: z + (rand(x) - 0.5) * 1.2, s: 0.8 + rand(x * 2 + z) * 0.5});
    }
  }
  // groensingel rond het bedrijventerrein
  for (let x = -40; x <= 40; x += 6) {
    out.push({x, z: 31, s: 1});
  }
  for (let z = -30; z <= 30; z += 6) {
    if (z > -8 && z < 14) continue; // ruimte voor het gedeelde laadplein
    out.push({x: 40, z, s: 0.9});
  }
  return out;
};

const FARMS: [number, number, number][] = [
  [-180, -20, 0.2], [-260, 120, -0.3], [150, 120, 0.1], [220, -60, 0.4], [-120, 160, 0],
  [60, -170, 0.3], [-330, -60, 0.1], [300, 60, -0.2], [-40, 210, 0.2], [120, -260, 0],
];

const TREE_CROWN = new THREE.IcosahedronGeometry(2.4, 0);
const TREE_TRUNK = new THREE.CylinderGeometry(0.35, 0.45, 2.4, 5);
const FIELD_BOX = new THREE.BoxGeometry(1, 0.3, 1);

export const Landscape: React.FC<{ws: WorldState}> = ({ws}) => {
  const fields = useMemo(makeFields, []);
  const trees = useMemo(makeTrees, []);
  const fieldRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const f = fieldRef.current!;
    fields.forEach((fl, i) => {
      m.makeScale(fl.w, 1, fl.d);
      m.setPosition(fl.x, 0.15, fl.z);
      f.setMatrixAt(i, m);
      f.setColorAt(i, fl.color);
    });
    f.instanceMatrix.needsUpdate = true;
    if (f.instanceColor) f.instanceColor.needsUpdate = true;
    const cr = crownRef.current!;
    const tr = trunkRef.current!;
    const col = new THREE.Color();
    trees.forEach((t, i) => {
      m.makeScale(t.s, t.s * 1.15, t.s);
      m.setPosition(t.x, 3.6 * t.s, t.z);
      cr.setMatrixAt(i, m);
      col.set(rand(i * 1.7) > 0.5 ? '#5f8f4a' : '#6e9c50');
      cr.setColorAt(i, col);
      m.makeScale(t.s, t.s, t.s);
      m.setPosition(t.x, 1.2 * t.s, t.z);
      tr.setMatrixAt(i, m);
    });
    cr.instanceMatrix.needsUpdate = true;
    tr.instanceMatrix.needsUpdate = true;
    if (cr.instanceColor) cr.instanceColor.needsUpdate = true;
  }, [fields, trees]);

  // In scène 9 vervaagt het detail naar de kaartkleur.
  const ground = mixColor(mixColor(C.grass, '#5d6b78', ws.dusk * 0.2), '#9fb4c4', ws.map);
  const detail = ws.localFade < 0.999;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <circleGeometry args={[90000, 48]} />
        <meshStandardMaterial color={ground} roughness={1} />
      </mesh>
      <group visible={detail}>
        <instancedMesh ref={fieldRef} args={[FIELD_BOX, undefined, fields.length]} receiveShadow>
          <meshStandardMaterial roughness={1} />
        </instancedMesh>
        <instancedMesh ref={crownRef} args={[TREE_CROWN, undefined, trees.length]} castShadow>
          <meshStandardMaterial roughness={0.95} flatShading />
        </instancedMesh>
        <instancedMesh ref={trunkRef} args={[TREE_TRUNK, undefined, trees.length]}>
          <meshStandardMaterial color="#7a5c44" roughness={1} />
        </instancedMesh>
        {/* landwegen */}
        <mesh position={[0, 0.35, -40]} receiveShadow>
          <boxGeometry args={[EXTENT * 2, 0.2, 5]} />
          <meshStandardMaterial color="#9a9890" roughness={1} />
        </mesh>
        <mesh position={[-70, 0.36, 0]} receiveShadow>
          <boxGeometry args={[5, 0.2, EXTENT * 2]} />
          <meshStandardMaterial color="#9a9890" roughness={1} />
        </mesh>
        {/* boerderijen met zadeldak */}
        {FARMS.map(([x, z, r], i) => (
          <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
            <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[14, 4.4, 7]} />
              <meshStandardMaterial color="#e8dfcf" roughness={0.95} />
            </mesh>
            <mesh position={[0, 6.7, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[4.6, 4.6, 14.4, 3, 1, false, Math.PI / 2]} />
              <meshStandardMaterial color="#6f7a6a" roughness={0.95} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};
