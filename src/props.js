import * as THREE from 'three';

/**
 * The objects a memory can look like. Each returns a small group built from
 * boxes so it sits in the same visual world as the terrain.
 */

function b(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const WOOD = 0x7a5638, DARK = 0x4a3628, WHITE = 0xf1ece2, PINK = 0xd45a7a;
const METAL = 0x6e6684, GOLD = 0xe8b65e, GREEN = 0x4c8a53, BLUE = 0x3f7fa8;

const BUILDERS = {
  table(g) {
    g.add(b(0.9, 0.09, 0.9, WOOD, 0, 0.72));
    g.add(b(0.12, 0.72, 0.12, DARK, 0, 0, 0));
    g.add(b(0.5, 0.06, 0.5, DARK, 0, 0));
    g.add(b(0.18, 0.16, 0.18, WHITE, -0.2, 0.81, 0.1));
    g.add(b(0.18, 0.16, 0.18, WHITE, 0.2, 0.81, -0.1));
  },
  bench(g) {
    g.add(b(1.5, 0.1, 0.45, WOOD, 0, 0.45));
    g.add(b(1.5, 0.5, 0.1, WOOD, 0, 0.55, -0.2));
    g.add(b(0.12, 0.45, 0.4, DARK, -0.6, 0));
    g.add(b(0.12, 0.45, 0.4, DARK, 0.6, 0));
  },
  sign(g) {
    g.add(b(0.14, 1.2, 0.14, DARK, 0, 0));
    g.add(b(1.0, 0.45, 0.08, WOOD, 0.1, 0.9));
  },
  radio(g) {
    g.add(b(0.8, 0.5, 0.3, DARK, 0, 0));
    g.add(b(0.2, 0.2, 0.05, METAL, -0.18, 0.15, 0.16));
    g.add(b(0.2, 0.2, 0.05, METAL, 0.18, 0.15, 0.16));
    g.add(b(0.5, 0.05, 0.05, METAL, 0.25, 0.62, 0));
  },
  cake(g) {
    g.add(b(0.7, 0.28, 0.7, WHITE, 0, 0));
    g.add(b(0.5, 0.22, 0.5, PINK, 0, 0.28));
    g.add(b(0.06, 0.22, 0.06, WHITE, 0, 0.5));
    g.add(b(0.09, 0.12, 0.09, GOLD, 0, 0.72));
  },
  book(g) {
    g.add(b(0.14, 0.9, 0.14, DARK, 0, 0));
    g.add(b(0.7, 0.08, 0.5, WOOD, 0, 0.9));
    g.add(b(0.32, 0.05, 0.44, WHITE, -0.16, 0.98));
    g.add(b(0.32, 0.05, 0.44, WHITE, 0.16, 0.98));
  },
  lantern(g) {
    g.add(b(0.16, 1.4, 0.16, METAL, 0, 0));
    g.add(b(0.42, 0.42, 0.42, GOLD, 0, 1.4));
    g.add(b(0.5, 0.08, 0.5, METAL, 0, 1.82));
  },
  flowers(g) {
    g.add(b(0.5, 0.4, 0.5, 0xa9614a, 0, 0));
    g.add(b(0.06, 0.4, 0.06, GREEN, -0.1, 0.4));
    g.add(b(0.06, 0.5, 0.06, GREEN, 0.1, 0.4));
    g.add(b(0.2, 0.2, 0.2, PINK, -0.1, 0.8));
    g.add(b(0.2, 0.2, 0.2, GOLD, 0.1, 0.9));
  },
  gift(g) {
    g.add(b(0.7, 0.6, 0.7, PINK, 0, 0));
    g.add(b(0.14, 0.62, 0.72, GOLD, 0, 0));
    g.add(b(0.72, 0.62, 0.14, GOLD, 0, 0));
    g.add(b(0.3, 0.2, 0.3, GOLD, 0, 0.6));
  },
  cup(g) {
    g.add(b(0.5, 0.06, 0.5, WOOD, 0, 0));
    g.add(b(0.3, 0.32, 0.3, WHITE, 0, 0.06));
    g.add(b(0.08, 0.16, 0.08, WHITE, 0.19, 0.14));
  },
  boat(g) {
    g.add(b(1.4, 0.28, 0.6, WOOD, 0, 0));
    g.add(b(1.1, 0.12, 0.4, DARK, 0, 0.28));
    g.add(b(0.08, 0.9, 0.08, DARK, -0.4, 0.35));
  },
  racket(g) {
    // tennis racket, leaning, with a ball
    g.add(b(0.1, 0.5, 0.1, DARK, -0.25, 0));
    g.add(b(0.34, 0.44, 0.05, 0x2f6f4f, -0.25, 0.5));
    g.add(b(0.26, 0.36, 0.02, WHITE, -0.25, 0.54));
    g.add(b(0.22, 0.22, 0.22, 0xd6e04a, 0.25, 0));
  },
  shuttle(g) {
    // badminton: racket flat on the ground and a shuttlecock stood on its cork
    g.add(b(0.09, 0.46, 0.09, 0x8c2f3f, -0.28, 0));
    g.add(b(0.32, 0.42, 0.05, 0x8c2f3f, -0.28, 0.46));
    g.add(b(0.24, 0.34, 0.02, WHITE, -0.28, 0.5));
    g.add(b(0.16, 0.14, 0.16, 0xd8c9a0, 0.28, 0));      // cork
    g.add(b(0.22, 0.26, 0.22, WHITE, 0.28, 0.14));       // feathers
    g.add(b(0.3, 0.06, 0.3, WHITE, 0.28, 0.38));
  },
  plate(g) {
    g.add(b(0.8, 0.08, 0.8, WHITE, 0, 0));
    g.add(b(0.5, 0.09, 0.5, 0xb4472f, 0, 0.08));         // the chicken
    g.add(b(0.2, 0.06, 0.34, 0xe0b23c, 0.24, 0.08));     // chips
    g.add(b(0.1, 0.28, 0.1, 0xc23a3a, -0.42, 0.08));     // the bottle
    g.add(b(0.06, 0.08, 0.06, DARK, -0.42, 0.36));
  },
  bed(g) {
    g.add(b(1.5, 0.26, 1.0, WOOD, 0, 0));                // base
    g.add(b(1.42, 0.2, 0.94, 0xe8e2ea, 0, 0.26));        // mattress
    g.add(b(1.42, 0.16, 0.6, 0x6d7fae, 0.02, 0.46));     // duvet
    g.add(b(0.5, 0.14, 0.34, WHITE, -0.44, 0.46));       // pillows
    g.add(b(0.5, 0.14, 0.34, WHITE, 0.16, 0.46));
    g.add(b(1.5, 0.5, 0.12, WOOD, 0, 0.26, -0.56));      // headboard
    g.add(b(0.16, 0.16, 0.16, PINK, 0.55, 0.62));        // a snack, obviously
  },
  weights(g) {
    g.add(b(1.0, 0.09, 0.09, METAL, 0, 0.2));
    g.add(b(0.16, 0.42, 0.42, DARK, -0.42, 0.03));
    g.add(b(0.16, 0.42, 0.42, DARK, 0.42, 0.03));
  },
  star(g) {
    g.add(b(0.4, 0.4, 0.4, GOLD, 0, 1.1));
    g.add(b(0.62, 0.16, 0.16, GOLD, 0, 1.22));
    g.add(b(0.16, 0.62, 0.16, GOLD, 0, 1.0));
    g.add(b(0.16, 0.16, 0.62, GOLD, 0, 1.22));
  },
};

/** Build a prop group. Unknown names fall back to a lantern. */
export function makeProp(name) {
  const g = new THREE.Group();
  (BUILDERS[name] || BUILDERS.lantern)(g);
  return g;
}

/**
 * A soft halo that hovers over an unfound memory so it reads as interactive
 * from a distance. Turns warm and settles once she's opened it.
 */
export function makeHalo() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.055, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.85 })
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  g.userData.ring = ring;
  return g;
}

/**
 * A path lamp. Returns the group plus the head material, so lighting one is
 * a colour change rather than a rebuild of the world mesh.
 */
export function makeLamp() {
  const g = new THREE.Group();
  g.add(b(0.18, 2.6, 0.18, METAL, 0, 0));
  g.add(b(0.34, 0.12, 0.34, METAL, 0, 2.6));

  const headMat = new THREE.MeshLambertMaterial({ color: 0x6e6684 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.5, 0.44), headMat);
  head.position.y = 2.72 + 0.25;
  head.castShadow = true;
  g.add(head);
  g.add(b(0.56, 0.1, 0.56, METAL, 0, 3.22));

  return { group: g, headMat };
}

const FLOWER_TINTS = [0xd45a7a, 0xe8b65e, 0xe4e0ec, 0xc78ad0];

/**
 * All the wildflowers as two instanced meshes — one for stems, one for heads.
 * Thousands of them cost two draw calls instead of thousands.
 */
export function makeFlowerField(flowers) {
  const g = new THREE.Group();
  if (!flowers.length) return g;

  const stemGeo = new THREE.BoxGeometry(0.06, 0.34, 0.06);
  const headGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const stems = new THREE.InstancedMesh(
    stemGeo, new THREE.MeshLambertMaterial({ color: 0x4c8a53 }), flowers.length
  );
  const heads = new THREE.InstancedMesh(
    headGeo, new THREE.MeshLambertMaterial({ vertexColors: false }), flowers.length
  );
  heads.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(flowers.length * 3), 3
  );

  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  flowers.forEach((f, i) => {
    const jitterX = (f.tint - 0.5) * 0.5;
    const jitterZ = (((f.tint * 7) % 1) - 0.5) * 0.5;
    m.makeTranslation(f.x + jitterX, f.y + 0.17, f.z + jitterZ);
    stems.setMatrixAt(i, m);
    m.makeTranslation(f.x + jitterX, f.y + 0.42, f.z + jitterZ);
    heads.setMatrixAt(i, m);
    c.setHex(FLOWER_TINTS[Math.floor(f.tint * FLOWER_TINTS.length) % FLOWER_TINTS.length]);
    heads.setColorAt(i, c);
  });
  stems.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  stems.castShadow = heads.castShadow = true;

  g.add(stems, heads);
  return g;
}

export function makeGlow(color = 0xffd98a, size = 3.2, opacity = 0.22) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false,
    })
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

/**
 * A fingerpost at the mouth of a spur, pointing off the main path.
 *
 * The spurs are wide now, but a widened track still doesn't tell you there's
 * anywhere at the end of it — the complaint was not knowing where to go, and
 * the honest fix for that is a sign. It points the way the spur runs and
 * carries a small warm bead on top so it reads at dusk as well as at noon.
 *
 * Built along +Z, so setting rotation.y to the direction of the set points it
 * at the set.
 */
export function makeSignpost() {
  const g = new THREE.Group();
  const WOOD = 0x6b4f36, PLANK = 0x94714b;

  g.add(b(0.17, 2.3, 0.17, WOOD, 0, 0));
  // A board, not a stick with a bump on it. Pale against the grass and the
  // trees so it catches the eye from back down the path, with a wedge on the
  // end so it reads as pointing rather than just sticking out.
  g.add(b(0.1, 0.44, 1.9, PLANK, 0, 1.66, 0.95));
  const tip = b(0.1, 0.33, 0.33, PLANK, 0, 1.72, 1.95);
  tip.rotation.x = Math.PI / 4;
  g.add(tip);
  // A brace under the board, so it doesn't look glued on.
  const brace = b(0.09, 0.7, 0.09, WOOD, 0, 1.1, 0.42);
  brace.rotation.x = -0.62;
  g.add(brace);
  g.add(b(0.3, 0.15, 0.3, WOOD, 0, 2.3));

  const beadMat = new THREE.MeshLambertMaterial({
    color: 0xffe0a4, emissive: new THREE.Color(0x6b4d16),
  });
  const bead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), beadMat);
  bead.position.y = 2.54;
  g.add(bead);

  return g;
}

/**
 * The pool of light a lamp throws on the ground.
 *
 * This was a flat square plane of solid colour, which is exactly what it
 * looked like: a yellow square lying on the grass. Three things fix that.
 *
 * It's a **disc with a radial falloff**, so it has no edge — brightest under
 * the lamp, gone by the rim, with the curve biased so most of the light sits
 * in the middle rather than spreading evenly.
 *
 * It **drapes over the terrain**. Every vertex is dropped onto the real ground
 * height, so on a slope the pool follows the slope instead of slicing through
 * it. A flat quad on lumpy ground is half-buried on one side and floating on
 * the other, and that reads as a decal rather than as light.
 *
 * And it's **additive**, so it brightens what's under it rather than painting
 * over it — the grass and the path still read through the light, which is what
 * makes it look like light and not like paint.
 */
export function makeLightPool(cx, cz, groundAt, {
  radius = 4.2, color = 0xffce7a, rings = 7, spokes = 22,
} = {}) {
  const pos = [], alpha = [], idx = [];

  // A fan: centre vertex, then rings of vertices out to the rim.
  pos.push(0, groundAt(cx, cz) + 0.06, 0);
  alpha.push(1);
  for (let r = 1; r <= rings; r++) {
    const t = r / rings;
    const rad = radius * t;
    for (let sIdx = 0; sIdx < spokes; sIdx++) {
      const a = (sIdx / spokes) * Math.PI * 2;
      const dx = Math.cos(a) * rad, dz = Math.sin(a) * rad;
      pos.push(dx, groundAt(cx + dx, cz + dz) + 0.06, dz);
      // Squared falloff, so it fades the way light does rather than linearly.
      alpha.push(Math.pow(1 - t, 2.1));
    }
  }
  for (let sIdx = 0; sIdx < spokes; sIdx++) {
    idx.push(0, 1 + sIdx, 1 + ((sIdx + 1) % spokes));
  }
  for (let r = 1; r < rings; r++) {
    const a0 = 1 + (r - 1) * spokes, b0 = 1 + r * spokes;
    for (let sIdx = 0; sIdx < spokes; sIdx++) {
      const n = (sIdx + 1) % spokes;
      idx.push(a0 + sIdx, b0 + sIdx, b0 + n);
      idx.push(a0 + sIdx, b0 + n, a0 + n);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('alpha', new THREE.Float32BufferAttribute(alpha, 1));
  geo.setIndex(idx);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uStrength: { value: 0 },
    },
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uStrength;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor * vAlpha * uStrength, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    // The pool belongs to the ground it lies on; fogging it separately makes
    // it float free of the terrain in the distance.
    fog: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, 0, cz);
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  return { mesh, mat };
}

/**
 * The cone of light between a lit lamp head and its pool. Very faint — it is
 * the thing that connects the two so the pool reads as thrown by the lamp
 * rather than painted on the floor underneath it.
 */
export function makeLightCone(topY, bottomY, radius = 1.7, color = 0xffce7a) {
  const h = Math.max(0.5, topY - bottomY);
  const geo = new THREE.CylinderGeometry(0.16, radius, h, 18, 1, true);

  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: 0 } },
    vertexShader: `
      varying float vDown;
      void main() {
        // 0 at the lamp, 1 at the ground
        vDown = 0.5 - position.y / ${h.toFixed(4)};
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uStrength;
      varying float vDown;
      void main() {
        // Brightest just below the bulb, faded out well before the ground, so
        // the cone never draws a hard rim where it meets the pool.
        float a = smoothstep(1.0, 0.12, vDown) * 0.085;
        gl_FragColor = vec4(uColor * a * uStrength, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    fog: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = bottomY + h / 2;
  return { mesh, mat };
}
