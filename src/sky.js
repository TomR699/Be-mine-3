import * as THREE from 'three';

/**
 * The sky dome.
 *
 * A shader rather than vertex colours, so it can carry a sun, a horizon band,
 * and a field of stars that comes out as the world turns to night. The dome is
 * drawn with no fog and no depth write, and it follows the camera.
 *
 * Colour is written in linear space and tone-mapped by the composer's
 * OutputPass, the same as everything else in the scene.
 */

const VERT = `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uNight;
uniform float uTime;
varying vec3 vDir;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 d = normalize(vDir);

  // vertical gradient, weighted so most of the sky is the upper colour
  float h = clamp(d.y * 1.15 + 0.14, 0.0, 1.0);
  vec3 col = mix(uBottom, uTop, pow(h, 0.72));

  // a band of light sitting on the horizon
  float band = exp(-abs(d.y) * 8.0);
  col = mix(col, uHorizon, band * 0.5);

  // the sun: a hard disc inside a soft bloom
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * pow(sd, 260.0) * 4.0;
  col += uSunColor * pow(sd, 9.0) * 0.30;
  col += uSunColor * pow(sd, 2.0) * 0.06;

  // stars, only once it's dark and only above the horizon
  if (uNight > 0.002 && d.y > -0.03) {
    vec3 sp = d * 200.0;
    vec3 cell = floor(sp);
    float r = hash13(cell);
    float s = 0.0;
    if (r > 0.979) {
      vec3 c = cell + vec3(hash13(cell + 11.0), hash13(cell + 23.0), hash13(cell + 37.0));
      float dist = length(sp - c);
      // brighter stars are rarer, and each twinkles on its own clock
      float mag = (r - 0.979) / 0.021;
      float tw = 0.6 + 0.4 * sin(uTime * 1.9 + r * 120.0);
      s = smoothstep(0.85, 0.0, dist) * tw * mag;
    }
    float lift = smoothstep(-0.03, 0.18, d.y);
    col += vec3(0.86, 0.90, 1.0) * s * uNight * lift * 1.6;
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

const TOP_DAY = new THREE.Color(0x4f9ed6);
const BOT_DAY = new THREE.Color(0xbfe0f0);
const HOR_DAY = new THREE.Color(0xdcecf4);

const TOP_NIGHT = new THREE.Color(0x0a0a1e);
const BOT_NIGHT = new THREE.Color(0x1d1b3a);
const HOR_SUNSET = new THREE.Color(0xe8875a);  // the last of the sun going down
const HOR_NIGHT = new THREE.Color(0x121a33);   // and then properly dark

const SUN_DAY = new THREE.Color(0xfff4d8);
const SUN_DUSK = new THREE.Color(0xff9a4e);

export function makeSky(radius = 320) {
  const uniforms = {
    uTop: { value: TOP_DAY.clone() },
    uBottom: { value: BOT_DAY.clone() },
    uHorizon: { value: HOR_DAY.clone() },
    uSunColor: { value: SUN_DAY.clone() },
    uSunDir: { value: new THREE.Vector3(1, 0.4, 0.3) },
    uNight: { value: 0 },
    uTime: { value: 0 },
  };

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 20),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
  );
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;

  // The horizon colour is also what the scene's fog should be.
  const horizon = new THREE.Color();

  return {
    mesh,
    horizon,
    /** dusk 0..1, sunDir a world-space direction toward the sun. */
    update(dusk, sunDir, time) {
      uniforms.uTime.value = time;
      uniforms.uNight.value = Math.max(0, (dusk - 0.35) / 0.65);
      uniforms.uSunDir.value.copy(sunDir).normalize();

      uniforms.uTop.value.copy(TOP_DAY).lerp(TOP_NIGHT, dusk);
      uniforms.uBottom.value.copy(BOT_DAY).lerp(BOT_NIGHT, dusk);
      // The horizon goes warm before it goes dark — sunset, then night.
      // Two stages: day burns down to sunset, then sunset gives way to night.
      // A single lerp leaves the horizon glowing orange at midnight.
      const warm = Math.min(1, dusk * 2.0);
      const late = Math.max(0, (dusk - 0.6) / 0.4);
      uniforms.uHorizon.value
        .copy(HOR_DAY).lerp(HOR_SUNSET, warm).lerp(HOR_NIGHT, late)
        .multiplyScalar(1 - dusk * 0.3);
      uniforms.uSunColor.value.copy(SUN_DAY).lerp(SUN_DUSK, Math.min(1, dusk * 1.3))
        .multiplyScalar(1 - dusk * 0.7);

      horizon.copy(uniforms.uHorizon.value);
    },
  };
}
