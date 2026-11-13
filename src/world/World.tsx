import React, {useLayoutEffect, useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import type {Story} from '../timeline';
import {mixColor} from '../util';
import {cameraAt} from './camera';
import type {WorldState} from './state';
import {Landscape} from './Landscape';
import {Grid} from './Grid';
import {Site} from './Site';
import {MapLayer} from './MapLayer';

const CameraRig: React.FC<{story: Story}> = ({story}) => {
  const {camera} = useThree();
  const pose = cameraAt(story);
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.copy(pose.position);
    cam.fov = pose.fov;
    cam.near = pose.near;
    cam.far = pose.far;
    cam.up.set(0, 1, 0);
    cam.lookAt(pose.target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  });
  return null;
};

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const skyFrag = /* glsl */ `
uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 col = h > 0.0 ? mix(horizon, top, pow(clamp(h * 2.2, 0.0, 1.0), 0.7)) : mix(horizon, bottom, clamp(-h * 4.0, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const Sky: React.FC<{dusk: number; radius: number}> = ({dusk, radius}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {top: {value: new THREE.Color()}, horizon: {value: new THREE.Color()}, bottom: {value: new THREE.Color()}},
      }),
    [],
  );
  mat.uniforms.top.value.set(mixColor('#9cc6ea', '#2a3062', dusk));
  mat.uniforms.horizon.value.set(mixColor('#eef4f2', '#f2a883', dusk));
  mat.uniforms.bottom.value.set(mixColor('#dfe9e6', '#7b6f84', dusk));
  return (
    <mesh
      material={mat}
      renderOrder={-1}
      frustumCulled={false}
      onBeforeRender={function (this: THREE.Mesh, _r, _s, cam) {
        // lucht volgt altijd de camera (ook bij vrij rondkijken); matrix direct bijwerken
        this.position.copy(cam.position);
        this.updateMatrixWorld();
      }}
    >
      <sphereGeometry args={[radius, 24, 16]} />
    </mesh>
  );
};

export const World: React.FC<{
  story: Story;
  ws: WorldState;
  /** Doorlopende tijd voor ambient-animatie (deeltjes, wieken). Standaard: story.sec. */
  ambientSec?: number;
  /** Vrije camera (interactieve wereld): geen camerarit, afstand voor mist/kaart. */
  free?: {dist: number};
}> = ({story, ws, ambientSec, free}) => {
  const {scene} = useThree();
  const guided = cameraAt(story);
  const pose = free ? {...guided, dist: free.dist, far: Math.max(6000, free.dist * 8)} : guided;
  const sec = ambientSec ?? story.sec;
  const dusk = ws.dusk;
  const fogColor = mixColor('#eef4f2', '#f2a883', dusk);
  // Mist schaalt mee met de cameraafstand (ook bij uitzoomen naar NL)
  const fogNear = pose.dist * 1.6 + 200;
  const fogFar = pose.dist * 5 + 1600;
  useLayoutEffect(() => {
    if (!(scene.fog instanceof THREE.Fog)) scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    const f = scene.fog as THREE.Fog;
    f.color.set(fogColor);
    f.near = fogNear;
    f.far = fogFar;
  });

  // Zon: lage warme schemerzon → hoge heldere middagzon
  const sunDir = new THREE.Vector3(
    THREE.MathUtils.lerp(-60, 140, dusk),
    THREE.MathUtils.lerp(160, 40, dusk),
    THREE.MathUtils.lerp(90, -60, dusk),
  );
  const sunColor = mixColor('#fff3df', '#ffb089', dusk);
  const sunI = THREE.MathUtils.lerp(2.3, 2.4, dusk) * (1 - 0.45 * ws.dim);
  const hemiI = THREE.MathUtils.lerp(1.3, 1.6, dusk) * (1 - 0.4 * ws.dim);

  const light = useMemo(() => {
    const l = new THREE.DirectionalLight();
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    const cam = l.shadow.camera as THREE.OrthographicCamera;
    cam.left = -95;
    cam.right = 95;
    cam.top = 95;
    cam.bottom = -95;
    cam.near = 1;
    cam.far = 600;
    l.shadow.bias = -0.0006;
    l.shadow.normalBias = 0.04;
    l.shadow.radius = 3;
    return l;
  }, []);
  light.position.copy(sunDir);
  light.target.position.set(0, 0, 0);
  light.color.set(sunColor);
  light.intensity = sunI;
  light.castShadow = ws.map < 0.5;

  return (
    <>
      {free ? null : <CameraRig story={story} />}
      <Sky dusk={dusk} radius={pose.far * 0.8} />
      <hemisphereLight color={mixColor('#e6f0ff', '#a9a6e0', dusk)} groundColor={mixColor('#b8b48e', '#7a6464', dusk)} intensity={hemiI} />
      <primitive object={light} />
      <primitive object={light.target} />
      <Landscape ws={ws} />
      {ws.localFade < 0.999 ? <Grid ws={ws} sec={sec} /> : null}
      <Site ws={ws} sec={sec} />
      <MapLayer ws={ws} camDist={pose.dist} />
    </>
  );
};
