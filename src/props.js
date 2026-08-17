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
