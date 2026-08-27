import * as THREE from 'three';

/**
 * Dressed sets — the scenery around each memory.
 *
 * The prop from props.js is the hero object; this is the place it sits in. Each
 * set is built around its own floor (decking, paving, a rug, a court) because
 * that's what makes it read as somewhere lifted out of your life rather than
 * furniture abandoned on a hillside.
 *
 * Sets are keyed by memory id. A memory with no entry here just gets its prop.
 */

function b(w, h, d, color, x = 0, y = 0, z = 0, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({ color });
  if (opts.emissive) mat.emissive = new THREE.Color(opts.emissive);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = !opts.flat;
  m.receiveShadow = true;
  return m;
}

/** A floor slab, slightly proud of the ground so it never z-fights. */
function floor(w, d, color, y = 0.02) {
  return b(w, 0.08, d, color, 0, y - 0.08, 0, { flat: true });
}

const WOOD = 0x7a5638, DARK = 0x4a3628, WHITE = 0xf1ece2, PINK = 0xd45a7a;
const METAL = 0x6e6684, GOLD = 0xe8b65e, GREEN = 0x4c8a53, GREY = 0x8d8a97;
const PAVING = 0x9a9689, DECK = 0x8a6a45, RUG = 0x7d4a55, CLAY = 0xb5613f;
const NIGHT = 0x2f2a3d, LIME = 0xd6dc8e;

const BUILDERS = {
  // 1. The work canteen. The shuttlecock on the table is the whole memory.
  'first-chat'(g) {
    g.add(floor(4.4, 3.6, DECK));
    g.add(b(0.42, 0.5, 0.42, DARK, 0, 0, 0.95));          // second chair
    g.add(b(0.46, 0.42, 0.06, DARK, 0, 0.5, 1.14));
    g.add(b(0.6, 0.05, 0.42, 0xb9b3a6, 0.42, 0.81, 0.1)); // lunch tray
    g.add(b(0.11, 0.3, 0.11, 0x5f8f6a, -0.46, 0.81, -0.2)); // bottle
    // the shuttlecock, sat between the two cups
    g.add(b(0.11, 0.09, 0.11, 0xd8c9a0, 0, 0.81, 0.02));
    g.add(b(0.16, 0.18, 0.16, WHITE, 0, 0.9, 0.02));
  },

  // 2. Labyrinth, 13-15 Bridge Street — the smoking area out the front.
  'outside-the-club'(g) {
    g.add(floor(5.6, 4.2, PAVING));
    g.add(b(5.6, 0.14, 0.3, 0x807c72, 0, 0, -2.0, { flat: true }));  // kerb

    // the doorway, with light coming out of it
    g.add(b(2.6, 3.2, 0.3, NIGHT, 0, 0, -2.3));
    g.add(b(1.2, 2.1, 0.12, 0x120f1a, 0, 0, -2.14));
    g.add(b(1.0, 1.9, 0.04, 0xffc98a, 0, 0.05, -2.06, { emissive: 0x6b4a12 }));
    g.add(b(2.2, 0.34, 0.1, 0x151021, 0, 2.5, -2.16));                // sign board
    g.add(b(1.7, 0.16, 0.04, 0x9d6bd8, 0, 2.6, -2.1, { emissive: 0x3d2159 }));
    g.add(b(0.34, 0.16, 0.04, WHITE, -1.0, 1.4, -2.1));               // 13-15 plate

    // the pen they stood in
    for (const x of [-2.2, -0.7, 0.8, 2.3]) {
      g.add(b(0.1, 0.95, 0.1, METAL, x, 0, 1.1));
    }
    g.add(b(4.7, 0.08, 0.08, METAL, 0.05, 0.85, 1.1));

    // patio heater, high tables, the bin
    g.add(b(0.22, 2.1, 0.22, METAL, 1.9, 0, -0.5));
    g.add(b(0.62, 0.3, 0.62, 0xffb257, 1.9, 2.1, -0.5, { emissive: 0x7a4a10 }));
    g.add(b(0.5, 0.06, 0.5, DARK, -1.5, 1.05, -0.3));
    g.add(b(0.12, 1.05, 0.12, METAL, -1.5, 0, -0.3));
    g.add(b(0.5, 0.06, 0.5, DARK, -0.1, 1.05, 0.4));
    g.add(b(0.12, 1.05, 0.12, METAL, -0.1, 0, 0.4));
    g.add(b(0.42, 0.7, 0.42, 0x3c3a44, 2.4, 0, -1.4));
  },

  // 3. A fragment of her kitchen. The window is what makes it 5am.
  'kitchen-5am'(g) {
    g.add(floor(4.2, 3.4, RUG));
    g.add(b(2.6, 0.9, 0.7, 0xb8ad9c, -0.3, 0, -0.9));    // counter
    g.add(b(2.7, 0.08, 0.78, WHITE, -0.3, 0.9, -0.9));   // worktop
    g.add(b(0.36, 0.42, 0.3, 0xd8d4cc, -1.2, 0.98, -0.9)); // kettle
    for (const x of [-0.1, 0.75]) {                       // two stools, close
      g.add(b(0.34, 0.68, 0.34, WOOD, x, 0, 0.1));
      g.add(b(0.42, 0.07, 0.42, DARK, x, 0.68, 0.1));
    }
    // the window, with dawn behind it
    g.add(b(0.14, 2.3, 0.14, WHITE, 1.9, 0, -1.5));
    g.add(b(0.14, 2.3, 0.14, WHITE, 1.9, 0, 0.1));
    g.add(b(0.14, 0.14, 1.74, WHITE, 1.9, 2.3, -0.7));
    g.add(b(0.05, 2.1, 1.5, 0xffd9b0, 1.9, 0.1, -0.7, { emissive: 0x6e4a2a }));
  },

  // 4. Tennis, with everyone. Four rackets, not two.
  tennis(g) {
    g.add(floor(9, 6.5, CLAY));
    for (const z of [-3.0, 3.0]) g.add(b(8.6, 0.03, 0.1, WHITE, 0, 0.03, z, { flat: true }));
    for (const x of [-4.2, 4.2]) g.add(b(0.1, 0.03, 6.1, WHITE, x, 0.03, 0, { flat: true }));
    g.add(b(0.1, 0.03, 6.1, WHITE, 0, 0.03, 0, { flat: true }));

    g.add(b(0.14, 1.1, 0.14, DARK, 0, 0, -3.2));          // net posts
    g.add(b(0.14, 1.1, 0.14, DARK, 0, 0, 3.2));
    g.add(b(0.06, 0.85, 6.4, 0x2c2c33, 0, 0.12, 0));      // net
    g.add(b(0.08, 0.1, 6.4, WHITE, 0, 0.97, 0));

    g.add(b(0.5, 0.45, 0.4, 0x2f6f4f, 3.2, 0, 2.3));      // ball basket
    for (const [x, z] of [[1.4, -1.9], [-2.2, 1.1], [2.8, -0.6]]) {
      g.add(b(0.18, 0.18, 0.18, 0xd6e04a, x, 0.03, z));
    }
    g.add(b(1.6, 0.1, 0.4, WOOD, -3.4, 0.45, 2.9));       // spectators' bench
    g.add(b(0.12, 0.45, 0.36, DARK, -4.0, 0, 2.9));
    g.add(b(0.12, 0.45, 0.36, DARK, -2.8, 0, 2.9));
    for (const [x, c] of [[-3.9, 0x8c2f3f], [-3.0, 0x2f4f8c]]) {  // two spare rackets
      g.add(b(0.3, 0.4, 0.05, c, x, 0.55, 2.66));
      g.add(b(0.08, 0.4, 0.08, DARK, x, 0.15, 2.66));
    }
  },

  // 5. The gym. Both of you far too competitive about it.
  'the-gym'(g) {
    g.add(floor(5.4, 4.4, 0x3a3d44));
    // squat rack
    for (const x of [-0.8, 0.8]) {
      g.add(b(0.16, 2.2, 0.16, 0x9c3a3a, x, 0, -1.2));
      g.add(b(0.16, 2.2, 0.16, 0x9c3a3a, x, 0, -0.5));
      g.add(b(0.16, 0.16, 0.86, 0x9c3a3a, x, 2.2, -0.85));
    }
    g.add(b(2.6, 0.11, 0.11, METAL, 0, 1.5, -1.2));       // bar on the rack
    for (const x of [-1.15, 1.15]) g.add(b(0.14, 0.5, 0.5, 0x24222a, x, 1.28, -1.2));

    // bench
    g.add(b(0.55, 0.12, 1.7, 0x2a2830, 1.9, 0.45, 0.6));
    g.add(b(0.35, 0.45, 0.35, METAL, 1.9, 0, 0.6));

    // dumbbells, one racked and one left out
    for (const [x, z] of [[-1.8, 1.0], [-1.3, 1.5]]) {
      g.add(b(0.7, 0.07, 0.07, METAL, x, 0.18, z));
      g.add(b(0.14, 0.3, 0.3, 0x24222a, x - 0.3, 0.06, z));
      g.add(b(0.14, 0.3, 0.3, 0x24222a, x + 0.3, 0.06, z));
    }
    g.add(b(0.13, 0.34, 0.13, LIME, 0.2, 0, 1.6));        // her water bottle
    g.add(b(0.06, 2.0, 2.6, 0xa9bcc9, -2.6, 0.1, 0));     // mirror panel
  },

  // 6. Nando's, and the shopping after. In the order the day happened.
  nandos(g) {
    g.add(floor(4.6, 3.8, PAVING));
    g.add(b(0.12, 0.74, 0.12, DARK, 0, 0, 0));            // table under the plate
    g.add(b(1.0, 0.09, 1.0, WOOD, 0, 0.74, 0));
    for (const z of [-0.85, 0.85]) {                       // two chairs
      g.add(b(0.42, 0.46, 0.42, 0x6b3f3a, 0, 0, z));
      g.add(b(0.46, 0.44, 0.06, 0x6b3f3a, 0, 0.46, z + (z < 0 ? -0.19 : 0.19)));
    }
    g.add(b(0.1, 0.26, 0.1, 0xc23a3a, 0.34, 0.83, 0.3));  // peri sauce
    g.add(b(0.05, 0.07, 0.05, 0x2a2334, 0.34, 1.09, 0.3));
    for (const [x, c] of [[-1.5, 0xd8d2c4], [-1.15, 0xc0a6b8]]) {  // shopping bags
      g.add(b(0.36, 0.44, 0.22, c, x, 0, -0.5));
      g.add(b(0.03, 0.16, 0.03, DARK, x - 0.1, 0.44, -0.5));
      g.add(b(0.03, 0.16, 0.03, DARK, x + 0.1, 0.44, -0.5));
    }
  },

  // 7. The meteor shower. Deliberately almost nothing — the sky is the set.
  meteors(g) {
    g.add(floor(3.6, 2.8, 0x51506b));                     // the blanket
    g.add(b(3.7, 0.05, 2.9, 0x6a688a, 0, 0.03, 0, { flat: true }));
    g.add(b(0.6, 0.16, 0.42, 0xd9d3e2, -0.7, 0.05, -0.7));  // two cushions
    g.add(b(0.6, 0.16, 0.42, 0xc8bdd6, 0.25, 0.05, -0.7));
    g.add(b(0.16, 0.34, 0.16, 0x3f5f6f, 1.3, 0.05, 0.6));   // thermos
    g.add(b(0.05, 0.05, 0.05, METAL, 1.3, 0.39, 0.6));
    g.add(b(0.44, 0.14, 0.34, 0x4a4e55, -1.2, 0.05, 0.75)); // a folded jacket
  },

  // 8. Badminton on the sand. One shuttlecock frozen mid-rally.
  badminton(g) {
    g.add(floor(7.5, 5, 0xd6c391));
    g.add(b(0.12, 1.6, 0.12, METAL, 0, 0, -2.4));
    g.add(b(0.12, 1.6, 0.12, METAL, 0, 0, 2.4));
    g.add(b(0.05, 0.75, 4.8, 0xe8e4dc, 0, 0.72, 0));       // net
    g.add(b(0.07, 0.09, 4.8, WHITE, 0, 1.47, 0));
    for (const [x, c] of [[-1.5, 0x8c2f3f], [1.5, 0x2f4f8c]]) {   // one racket each side
      g.add(b(0.09, 0.46, 0.09, c, x, 0, 1.6));
      g.add(b(0.32, 0.42, 0.05, c, x, 0.46, 1.6));
      g.add(b(0.24, 0.34, 0.02, WHITE, x, 0.5, 1.6));
    }
    // mid-rally, nobody losing
    g.add(b(0.14, 0.12, 0.14, 0xd8c9a0, 0.35, 2.15, -0.4));
    g.add(b(0.2, 0.24, 0.2, WHITE, 0.35, 2.27, -0.4));
    for (const [x, z] of [[-2.2, -1.4], [2.6, 0.9]]) {
      g.add(b(0.13, 0.1, 0.13, 0xd8c9a0, x, 0.03, z));
      g.add(b(0.18, 0.2, 0.18, WHITE, x, 0.13, z));
    }
  },

  // 9. The bench above the town — a rehearsal of the ending, an hour early.
  'the-bench'(g) {
    g.add(floor(4.6, 3.2, PAVING));
    for (const x of [-1.9, -0.6, 0.7, 2.0]) {              // railing along the drop
      g.add(b(0.1, 0.95, 0.1, METAL, x, 0, 1.3));
    }
    g.add(b(4.2, 0.09, 0.09, METAL, 0.05, 0.9, 1.3));
    g.add(b(4.2, 0.07, 0.07, METAL, 0.05, 0.5, 1.3));
    g.add(b(0.16, 2.6, 0.16, METAL, 2.0, 0, -0.9));        // lamp post
    g.add(b(0.42, 0.46, 0.42, 0xffe0a0, 2.0, 2.6, -0.9, { emissive: 0x6b5216 }));
    g.add(b(0.16, 0.2, 0.16, WHITE, -0.55, 0.55, 0.05));   // two cups on the arm
    g.add(b(0.16, 0.2, 0.16, WHITE, -0.3, 0.55, 0.05));
  },

  // 10. No plans, no rush. Fairy lights, and the snacks on the floor.
  'first-nights'(g) {
    g.add(floor(5, 4.2, RUG));
    g.add(b(0.5, 0.55, 0.45, WOOD, -1.4, 0, -0.4));        // bedside table
    g.add(b(0.16, 0.28, 0.16, METAL, -1.4, 0.55, -0.4));
    g.add(b(0.42, 0.3, 0.42, 0xffe6b8, -1.4, 0.83, -0.4, { emissive: 0x6e5320 }));
    g.add(b(0.2, 0.03, 0.36, 0x1c1a24, -0.2, 0.02, 1.5, { flat: true }));  // phone, face-up
    g.add(b(0.16, 0.01, 0.3, 0xbcd8ff, -0.2, 0.05, 1.5, { emissive: 0x2a3a52, flat: true }));
    for (const [x, z, c] of [[0.9, 1.4, PINK], [1.5, 1.0, GOLD], [0.4, 1.7, 0xd8d2c4]]) {
      g.add(b(0.18, 0.05, 0.13, c, x, 0.02, z, { flat: true }));   // wrappers
    }
    // fairy lights, strung overhead
    for (const post of [[-2.2, -1.7], [2.2, -1.7], [2.2, 1.7], [-2.2, 1.7]]) {
      g.add(b(0.09, 2.6, 0.09, WOOD, post[0], 0, post[1]));
    }
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const sag = Math.sin(t * Math.PI) * 0.35;
      g.add(b(0.11, 0.11, 0.11, 0xfff0c0, -2.2 + t * 4.4, 2.55 - sag, -1.7,
        { emissive: 0x7a6420 }));
      g.add(b(0.11, 0.11, 0.11, 0xfff0c0, -2.2 + t * 4.4, 2.55 - sag, 1.7,
        { emissive: 0x7a6420 }));
    }
  },
};

/**
 * Where the hero prop sits inside its set, in set-local space. Without this the
 * plate ends up under the table and the rackets end up inside the net.
 */
export const HERO_OFFSET = {
  'kitchen-5am': [0.45, 0.98, -0.9],   // the mug goes on the worktop
  tennis: [-2.0, 0, 1.9],              // racket at the side, not through the net
  nandos: [0, 0.83, 0],                // the plate goes on the table
  badminton: [-2.4, 0, -1.5],          // racket and shuttle off court
};

/** Build the set for a memory id, or null if it has no dressing. */
export function makeSet(id) {
  const build = BUILDERS[id];
  if (!build) return null;
  const g = new THREE.Group();
  build(g);
  return g;
}
