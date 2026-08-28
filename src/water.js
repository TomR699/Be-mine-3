import * as THREE from 'three';
import { SEA } from './world.js';

/**
 * The sea.
 *
 * A shader plane rather than a flat translucent slab: waves in the vertex
 * stage with normals derived from them, fresnel so it turns reflective at
 * grazing angles, a sun specular, and foam where it meets the land.
 *
 * The foam needs to know where the shore is, so each vertex carries the water
 * depth baked from the same heightmap the terrain is built from. That's much
 * cheaper and steadier than reading scene depth.
 */

const SURFACE = SEA + 0.9;

const VERT = `
uniform float uTime;
attribute float depth;
varying float vDepth;
varying vec3 vWorld;
varying vec3 vNormalW;

// Two crossing swells. Keeping the maths here means the normal can be
// derived from the same function rather than guessed at.
float waveH(vec2 p) {
  return sin(p.x * 0.42 + uTime * 0.9) * 0.055
       + sin(p.y * 0.31 - uTime * 0.7) * 0.045
       + sin((p.x + p.y) * 0.17 + uTime * 0.45) * 0.035;
}

void main() {
  vDepth = depth;
  vec3 pos = position;

  // Flatten the swell as it runs into the shallows, the way real water does.
  float shallow = clamp(depth / 2.5, 0.0, 1.0);
  float amp = 0.35 + 0.65 * shallow;

  float h = waveH(pos.xz) * amp;
  pos.y += h;

  float e = 0.6;
  float hx = waveH(pos.xz + vec2(e, 0.0)) * amp;
  float hz = waveH(pos.xz + vec2(0.0, e)) * amp;
  vNormalW = normalize(vec3(h - hx, e, h - hz));

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAG = `
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSkyColor;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTime;
uniform float uNight;
varying float vDepth;
varying vec3 vWorld;
varying vec3 vNormalW;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uSunDir);

  // Shallow water is lighter, and you can nearly see the bottom.
  float shallow = clamp(vDepth / 3.5, 0.0, 1.0);
  vec3 base = mix(uShallow, uDeep, shallow);

  // Fresnel: nearly transparent looking straight down, mirror at a glance.
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  fres = clamp(fres, 0.02, 0.9);
  vec3 col = mix(base, uSkyColor, fres * 0.85);

  // Sun on the water.
  vec3 R = reflect(-L, N);
  float spec = pow(max(dot(R, V), 0.0), 90.0);
  col += uSunColor * spec * 1.8 * (1.0 - uNight * 0.6);

  // Foam where it runs up the beach, moving with the swell.
  float edge = 1.0 - smoothstep(0.0, 1.4, vDepth);
  float ripple = sin(vWorld.x * 1.7 + vWorld.z * 1.3 + uTime * 1.6) * 0.5 + 0.5;
  float foam = edge * (0.45 + 0.55 * ripple);
  col = mix(col, vec3(0.92, 0.96, 0.98), foam * 0.55);

  float alpha = mix(0.55, 0.9, shallow);
  alpha = max(alpha, foam * 0.85);

  // Manual fog — a raw ShaderMaterial doesn't inherit the scene's.
  float dist = length(cameraPosition - vWorld);
  float f = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, f);

  gl_FragColor = vec4(col, alpha);
}
`;

/**
 * Build the sea. `height` is the terrain heightmap, used to bake how deep the
 * water is at every vertex so the shader knows where the shore is.
 */
export function makeWater(sx, sz, height, segments = 200) {
  // The sea runs well past the island. It used to stop exactly at the island's
  // bounds, so from anywhere high the water simply ended and the sky started —
  // and there was nowhere to put anything on the horizon.
  const SPREAD = 3;
  const geo = new THREE.PlaneGeometry(sx * SPREAD, sz * SPREAD, segments, segments);
  geo.rotateX(-Math.PI / 2);
  geo.translate(sx / 2, SURFACE, sz / 2);

  const pos = geo.attributes.position;
  const depth = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = Math.max(0, Math.min(sx - 1, Math.floor(pos.getX(i))));
    const z = Math.max(0, Math.min(sz - 1, Math.floor(pos.getZ(i))));
    // +1 because a column of height h has its surface at h + 1
    depth[i] = Math.max(0, SURFACE - (height[x + z * sx] + 1));
  }
  geo.setAttribute('depth', new THREE.BufferAttribute(depth, 1));

  const uniforms = {
    uTime: { value: 0 },
    uNight: { value: 0 },
    uDeep: { value: new THREE.Color(0x1d4f70) },
    uShallow: { value: new THREE.Color(0x59a8bd) },
    uSkyColor: { value: new THREE.Color(0xbfe0f0) },
    uSunColor: { value: new THREE.Color(0xfff4d8) },
    uSunDir: { value: new THREE.Vector3(1, 0.5, 0.3) },
    uFogColor: { value: new THREE.Color(0xdcecf4) },
    uFogNear: { value: 115 },
    uFogFar: { value: 340 },
  };

  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;

  return {
    mesh,
    update(time, dusk, sunDir, skyColor, sunColor, fogColor) {
      uniforms.uTime.value = time;
      uniforms.uNight.value = dusk;
      uniforms.uSunDir.value.copy(sunDir).normalize();
      uniforms.uSkyColor.value.copy(skyColor);
      uniforms.uSunColor.value.copy(sunColor);
      uniforms.uFogColor.value.copy(fogColor);
      // The sea darkens with the sky rather than staying daylight blue.
      uniforms.uDeep.value.setHex(0x1d4f70).multiplyScalar(1 - dusk * 0.72);
      uniforms.uShallow.value.setHex(0x59a8bd).multiplyScalar(1 - dusk * 0.62);
    },
  };
}
