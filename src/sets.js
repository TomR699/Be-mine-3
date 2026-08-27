import * as THREE from 'three';

/**
 * Dressed sets — the scenery around each memory.
 *
 * The prop from props.js is the hero object; this is the place it sits in. Each
 * set is built around its own floor (decking, paving, a rug, a court) because
 * that's what makes it read as somewhere lifted out of your life rather than
 * furniture abandoned on a hillside.
 *
 * Sets face +Z, which is turned toward the path she walks in on. Keep them
 * inside roughly 15 x 12 units — that's the flat pad the terrain generator
 * levels underneath each one.
 */

function b(w, h, d, color, x = 0, y = 0, z = 0, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({ color });
  if (opts.emissive) mat.emissive = new THREE.Color(opts.emissive);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  if (opts.rot) m.rotation.y = opts.rot;
  m.castShadow = !opts.flat;
  m.receiveShadow = true;
  return m;
}

/** A floor slab, slightly proud of the ground so it never z-fights. */
function floor(w, d, color, y = 0.02, x = 0, z = 0) {
  return b(w, 0.08, d, color, x, y - 0.08, z, { flat: true });
}

/** A chair: seat, back, four legs. Used often enough to be worth a helper. */
function chair(g, x, z, color, facing = 0) {
  const s = Math.sin(facing), c = Math.cos(facing);
  g.add(b(0.44, 0.07, 0.44, color, x, 0.44, z));
  g.add(b(0.46, 0.5, 0.07, color, x - s * 0.2, 0.5, z - c * 0.2, { rot: facing }));
  for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) {
    g.add(b(0.06, 0.44, 0.06, color, x + dx, 0, z + dz));
  }
}

const WOOD = 0x7a5638, DARK = 0x4a3628, WHITE = 0xf1ece2, PINK = 0xd45a7a;
const METAL = 0x6e6684, GOLD = 0xe8b65e, GREEN = 0x4c8a53, STEEL = 0x555a63;
const PAVING = 0x9a9689, DECK = 0x8a6a45, RUG = 0x7d4a55, CLAY = 0xb5613f;
const LIME = 0xd6dc8e, CREAM = 0xd8d2bc;

// Labyrinth, 13-15 Bridge Street, from the photo.
const LAB = {
  fascia: 0x141216,
  copper: 0xb5652f,
  door: 0xc08a3e,
  glass: 0x27303a,
  marble: 0x4a4750,
  marbleLt: 0x5a5760,
  column: 0x232a26,
  tileA: 0xd8d2bc,
  tileB: 0x3d3a42,
  brick: 0x8a4a38,
  bulb: 0xfff4d0,
  tube: 0xdff0ff,
  rail: 0x2a2e33,
};

const BUILDERS = {
  // ---------------------------------------------------------------- 1
  // The work canteen. The shuttlecock on the table is the whole memory.
  'first-chat'(g) {
    g.add(floor(9, 7, DECK));
    g.add(b(9.1, 0.14, 0.3, 0x6f5238, 0, 0, 3.45, { flat: true }));  // decking edge

    chair(g, 0, 1.05, DARK, 0);            // her side of the hero table
    chair(g, 0, -1.05, DARK, Math.PI);
    g.add(b(0.62, 0.05, 0.44, 0xb9b3a6, 0.44, 0.81, 0.12));          // tray
    g.add(b(0.11, 0.3, 0.11, 0x5f8f6a, -0.48, 0.81, -0.22));         // bottle
    g.add(b(0.11, 0.09, 0.11, 0xd8c9a0, 0, 0.81, 0.02));             // the shuttlecock
    g.add(b(0.16, 0.18, 0.16, WHITE, 0, 0.9, 0.02));

    // a second table, so it reads as a canteen and not a picnic
    g.add(b(0.12, 0.74, 0.12, DARK, -2.9, 0, 1.6));
    g.add(b(1.0, 0.09, 1.0, WOOD, -2.9, 0.74, 1.6));
    chair(g, -2.9, 2.55, DARK, 0);
    chair(g, -2.9, 0.65, DARK, Math.PI);
    g.add(b(0.16, 0.2, 0.16, WHITE, -2.7, 0.83, 1.5));

    // the serving counter along the back
    g.add(b(5.2, 1.0, 0.8, 0xb0a89a, 1.4, 0, -2.6));
    g.add(b(5.3, 0.09, 0.9, 0x8d8a97, 1.4, 1.0, -2.6));
    g.add(b(0.5, 0.4, 0.4, STEEL, -0.4, 1.09, -2.6));                // urn
    g.add(b(0.16, 0.24, 0.16, STEEL, -0.4, 1.49, -2.6));
    for (let i = 0; i < 4; i++) {
      g.add(b(0.15, 0.17, 0.15, WHITE, 1.2 + i * 0.24, 1.09, -2.5)); // stacked cups
    }
    g.add(b(1.5, 1.0, 0.1, 0x2b2f36, 3.4, 1.4, -2.2));               // menu board
    g.add(b(1.3, 0.1, 0.03, LIME, 3.4, 2.1, -2.14));

    g.add(b(0.7, 0.55, 0.7, 0xa9614a, -3.7, 0, -1.4));               // planter
    g.add(b(0.5, 0.9, 0.5, GREEN, -3.7, 0.55, -1.4));
    g.add(b(0.44, 0.75, 0.44, 0x3c3a44, 4.0, 0, 1.6));               // bin
  },

  // ---------------------------------------------------------------- 2
  // Labyrinth, 13-15 Bridge Street. Built from the photo of the front.
  'outside-the-club'(g) {
    // pavement, kerb, and a strip of road
    g.add(floor(13, 4.6, 0xa8a49a, 0.02, 0, 1.1));
    g.add(b(13, 0.16, 0.34, 0x8e8a80, 0, 0, 3.3, { flat: true }));
    g.add(b(13, 0.06, 1.8, 0x3a3a3e, 0, 0, 4.4, { flat: true }));
    for (const x of [-4.8, -2.4, 0.0, 2.4, 4.8]) {                   // double yellows
      g.add(b(1.9, 0.02, 0.1, 0xd9b036, x, 0.07, 4.05, { flat: true }));
      g.add(b(1.9, 0.02, 0.1, 0xd9b036, x, 0.07, 4.25, { flat: true }));
    }

    // the building: brick above, dark marble at street level
    g.add(b(12.6, 3.4, 0.7, LAB.marble, 0, 0, -3.4));
    g.add(b(12.6, 2.6, 0.7, LAB.brick, 0, 3.4, -3.4));
    for (const x of [-4.6, -1.4, 1.8, 5.0]) {                        // marble panel joints
      g.add(b(0.08, 3.3, 0.04, LAB.marbleLt, x, 0, -3.06));
    }

    // the chequerboard recess floor
    for (let ix = 0; ix < 10; ix++) {
      for (let iz = 0; iz < 3; iz++) {
        const c = (ix + iz) % 2 ? LAB.tileA : LAB.tileB;
        g.add(b(0.8, 0.06, 0.8, c, -3.6 + ix * 0.8, 0.03, -2.6 + iz * 0.8, { flat: true }));
      }
    }

    // two pairs of copper-framed doors with the maze logo on the glass
    const doorPair = (cx) => {
      for (const dx of [-0.62, 0.62]) {
        g.add(b(1.18, 2.6, 0.12, LAB.door, cx + dx, 0, -3.02));
        g.add(b(0.86, 2.1, 0.06, LAB.glass, cx + dx, 0.32, -2.96));
        g.add(b(0.34, 0.42, 0.02, WHITE, cx + dx, 1.5, -2.92));       // the L logo
        g.add(b(0.06, 1.1, 0.06, 0xd8b070, cx + dx + (dx > 0 ? -0.5 : 0.5), 0.7, -2.9));
      }
    };
    doorPair(1.4);
    doorPair(-2.4);

    // the big maze panel between the door sets
    g.add(b(1.5, 1.5, 0.05, WHITE, -0.5, 1.1, -2.98));
    for (const [w, h, x, y] of [[1.1, 0.09, -0.5, 1.95], [0.09, 0.9, -1.0, 1.35],
                                [0.8, 0.09, -0.35, 1.5], [0.09, 0.6, -0.1, 1.5]]) {
      g.add(b(w, h, 0.02, LAB.tileB, x, y, -2.94));
    }
    g.add(b(1.2, 0.14, 0.02, LAB.copper, -0.5, 0.85, -2.94));        // orange wordmark

    // black fascia with LABYRINTH in copper
    g.add(b(11.5, 1.05, 0.34, LAB.fascia, 0, 2.75, -2.55));
    const letters = [0.34, 0.3, 0.32, 0.3, 0.28, 0.3, 0.3, 0.28, 0.3];
    let lx = -1.72;
    for (const w of letters) {
      g.add(b(w, 0.4, 0.06, LAB.copper, lx, 3.05, -2.37));
      lx += w + 0.09;
    }

    // canopy, its fluorescent tubes, and the festoon bulbs along the front
    g.add(b(12.4, 0.34, 2.9, 0x1c1a20, 0, 4.3, -2.1));
    for (const x of [-3.4, 2.4]) {
      g.add(b(5.2, 0.16, 0.16, LAB.tube, x, 4.12, -1.0, { emissive: 0x5f7488 }));
    }
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const sag = Math.sin(t * Math.PI) * 0.16;
      g.add(b(0.16, 0.2, 0.16, LAB.bulb, -6.4 + t * 12.8, 4.66 - sag, -0.72,
        { emissive: 0x7a6a3a }));
    }

    // cast iron columns either side of the recess
    for (const x of [-5.1, 5.1]) {
      g.add(b(0.42, 4.4, 0.42, LAB.column, x, 0, -0.85));
      g.add(b(0.56, 0.2, 0.56, LAB.column, x, 4.4, -0.85));
      g.add(b(0.2, 3.4, 0.2, 0x1a1f1c, x + 0.3, 0, -1.15));           // drainpipe
    }

    // the smoking area: the railed pen off to the side
    for (let i = 0; i <= 6; i++) {
      g.add(b(0.09, 1.0, 0.09, LAB.rail, 5.2 + i * 0.58, 0, 1.9));
    }
    g.add(b(3.6, 0.08, 0.08, LAB.rail, 6.95, 0.92, 1.9));
    g.add(b(0.09, 1.0, 0.09, LAB.rail, 8.7, 0, 0.5));
    g.add(b(0.08, 0.08, 2.9, LAB.rail, 8.7, 0.92, 0.45));

    for (const [x, z] of [[6.1, 0.6], [7.9, 0.9]]) {                  // high tables
      g.add(b(0.16, 1.05, 0.16, LAB.rail, x, 0, z));
      g.add(b(0.62, 0.07, 0.62, 0x2b2f36, x, 1.05, z));
      g.add(b(0.18, 0.05, 0.18, 0x6a6a72, x + 0.14, 1.12, z));        // ashtray
    }
    g.add(b(0.24, 2.1, 0.24, LAB.rail, 6.9, 0, -0.6));                // patio heater
    g.add(b(0.68, 0.34, 0.68, 0xffb257, 6.9, 2.1, -0.6, { emissive: 0x7a4a10 }));
    g.add(b(0.46, 0.8, 0.46, 0x3c3a44, 8.9, 0, 1.2));                 // bin
  },

  // ---------------------------------------------------------------- 3
  // A fragment of her kitchen. The window is what makes it 5am.
  'kitchen-5am'(g) {
    g.add(floor(8, 6.5, RUG));
    g.add(b(8.1, 0.05, 6.6, 0x6d3f49, 0, 0.02, 0, { flat: true }));

    g.add(b(4.4, 0.95, 0.75, 0xb8ad9c, -0.6, 0, -1.6));               // counter run
    g.add(b(4.6, 0.09, 0.85, WHITE, -0.6, 0.95, -1.6));
    for (const x of [-2.2, -0.6, 1.0]) {
      g.add(b(0.06, 0.9, 0.04, 0xa39887, x, 0.02, -1.24));            // cupboard doors
      g.add(b(0.2, 0.04, 0.04, STEEL, x + 0.4, 0.72, -1.22));
    }
    g.add(b(4.2, 0.75, 0.45, 0xc4baa9, -0.6, 2.0, -1.9));             // wall units
    g.add(b(0.36, 0.44, 0.3, 0xd8d4cc, -2.0, 1.04, -1.6));            // kettle
    g.add(b(0.9, 0.1, 0.55, STEEL, 0.9, 1.0, -1.6));                  // sink
    g.add(b(0.06, 0.34, 0.06, STEEL, 0.9, 1.05, -1.85));
    g.add(b(0.8, 1.8, 0.7, 0xd9dbdc, -3.4, 0, -1.7));                 // fridge
    g.add(b(0.05, 0.5, 0.05, STEEL, -3.02, 1.0, -1.7));

    for (const x of [-0.7, 0.35]) {                                    // two stools, close
      g.add(b(0.38, 0.72, 0.38, WOOD, x, 0, 0.5));
      g.add(b(0.46, 0.08, 0.46, DARK, x, 0.72, 0.5));
      g.add(b(0.4, 0.04, 0.4, 0x6a4a34, x, 0.32, 0.5));
    }
    g.add(b(0.16, 0.2, 0.16, WHITE, 0.9, 1.04, -1.3));                // a second mug

    // the window, with dawn behind it
    g.add(b(0.16, 2.6, 0.16, WHITE, 3.1, 0, -2.6));
    g.add(b(0.16, 2.6, 0.16, WHITE, 3.1, 0, -0.2));
    g.add(b(0.16, 0.16, 2.56, WHITE, 3.1, 2.6, -1.4));
    g.add(b(0.16, 0.16, 2.56, WHITE, 3.1, 0.9, -1.4));
    g.add(b(0.05, 2.5, 2.3, 0xffd9b0, 3.1, 0.15, -1.4, { emissive: 0x6e4a2a }));

    g.add(b(0.16, 0.8, 0.16, 0x2b2f36, -0.2, 3.1, 0.2));              // hanging light
    g.add(b(0.5, 0.28, 0.5, 0xffe6b8, -0.2, 2.82, 0.2, { emissive: 0x6e5320 }));
    g.add(b(0.5, 0.5, 0.06, WHITE, 1.9, 2.4, -1.85));                 // clock, at five
    g.add(b(0.05, 0.2, 0.02, DARK, 1.9, 2.62, -1.81));
    g.add(b(0.16, 0.04, 0.02, DARK, 1.99, 2.63, -1.81));
  },

  // ---------------------------------------------------------------- 4
  // Tennis, with everyone. Four rackets, not two.
  tennis(g) {
    g.add(floor(13, 9.5, CLAY));
    for (const z of [-4.4, 4.4]) g.add(b(12.4, 0.03, 0.1, WHITE, 0, 0.03, z, { flat: true }));
    for (const x of [-6.1, 6.1]) g.add(b(0.1, 0.03, 9.0, WHITE, x, 0.03, 0, { flat: true }));
    g.add(b(0.1, 0.03, 9.0, WHITE, 0, 0.03, 0, { flat: true }));
    for (const x of [-3.1, 3.1]) g.add(b(0.08, 0.03, 9.0, WHITE, x, 0.03, 0, { flat: true }));

    g.add(b(0.16, 1.2, 0.16, DARK, 0, 0, -4.6));                      // net
    g.add(b(0.16, 1.2, 0.16, DARK, 0, 0, 4.6));
    g.add(b(0.06, 0.9, 9.2, 0x2c2c33, 0, 0.12, 0));
    g.add(b(0.09, 0.11, 9.2, WHITE, 0, 1.02, 0));

    // fence posts around the back of the court
    for (let i = -3; i <= 3; i++) {
      g.add(b(0.1, 2.6, 0.1, 0x4b5157, i * 2.1, 0, -5.4));
      g.add(b(0.1, 2.6, 0.1, 0x4b5157, i * 2.1, 0, 5.4));
    }
    g.add(b(13, 0.07, 0.07, 0x4b5157, 0, 2.6, -5.4));
    g.add(b(13, 0.07, 0.07, 0x4b5157, 0, 2.6, 5.4));

    g.add(b(0.55, 0.5, 0.45, 0x2f6f4f, 4.4, 0, 3.3));                 // ball basket
    for (let i = 0; i < 5; i++) {
      g.add(b(0.16, 0.16, 0.16, 0xd6e04a, 4.3 + (i % 3) * 0.14, 0.5, 3.2 + ((i / 3) | 0) * 0.15));
    }
    for (const [x, z] of [[1.9, -2.6], [-3.0, 1.6], [3.8, -0.9], [-1.2, 3.4]]) {
      g.add(b(0.18, 0.18, 0.18, 0xd6e04a, x, 0.03, z));               // loose balls
    }

    g.add(b(2.2, 0.11, 0.45, WOOD, -4.7, 0.5, 4.1));                  // spectators' bench
    g.add(b(2.2, 0.55, 0.1, WOOD, -4.7, 0.6, 3.86));
    for (const x of [-5.6, -3.8]) g.add(b(0.13, 0.5, 0.4, DARK, x, 0, 4.1));
    for (const [x, c] of [[-5.5, 0x8c2f3f], [-4.4, 0x2f4f8c]]) {      // two spare rackets
      g.add(b(0.32, 0.44, 0.05, c, x, 0.62, 3.84));
      g.add(b(0.09, 0.44, 0.09, DARK, x, 0.18, 3.84));
    }
    g.add(b(0.7, 0.3, 0.34, 0x2b3138, -3.4, 0.5, 4.15));              // a kit bag
    g.add(b(0.13, 0.34, 0.13, LIME, -2.7, 0.5, 4.1));                 // water bottles
    g.add(b(0.13, 0.34, 0.13, 0x4a9ad6, -2.5, 0.5, 4.25));
    g.add(b(1.1, 0.75, 0.09, 0x2b2f36, 5.6, 1.1, -4.2));              // scoreboard
    g.add(b(0.9, 0.12, 0.03, LIME, 5.6, 1.55, -4.14));
  },

  // ---------------------------------------------------------------- 5
  // The gym. Both of you far too competitive about it.
  'the-gym'(g) {
    g.add(floor(9.5, 8, 0x3a3d44));
    for (let ix = 0; ix < 4; ix++) {                                   // rubber mat seams
      g.add(b(0.05, 0.03, 7.9, 0x32353b, -3.6 + ix * 2.4, 0.04, 0, { flat: true }));
    }

    // squat rack with a loaded bar
    for (const x of [-1.0, 1.0]) {
      g.add(b(0.18, 2.4, 0.18, 0x9c3a3a, x, 0, -1.9));
      g.add(b(0.18, 2.4, 0.18, 0x9c3a3a, x, 0, -1.0));
      g.add(b(0.18, 0.18, 1.08, 0x9c3a3a, x, 2.4, -1.45));
      g.add(b(0.5, 0.1, 0.5, 0x7a2c2c, x, 0, -1.45, { flat: true }));
      for (let i = 0; i < 4; i++) {
        g.add(b(0.24, 0.06, 0.1, 0x7a2c2c, x, 0.5 + i * 0.45, -1.86));  // rack holes
      }
    }
    g.add(b(3.0, 0.12, 0.12, STEEL, 0, 1.6, -1.9));
    for (const x of [-1.35, 1.35]) {
      g.add(b(0.16, 0.58, 0.58, 0x24222a, x, 1.37, -1.9));
      g.add(b(0.14, 0.44, 0.44, 0x2f2d36, x + (x > 0 ? 0.16 : -0.16), 1.44, -1.9));
    }

    // flat bench
    g.add(b(0.6, 0.14, 1.9, 0x2a2830, 3.0, 0.5, 0.4));
    g.add(b(0.4, 0.5, 0.4, STEEL, 3.0, 0, -0.3));
    g.add(b(0.4, 0.5, 0.4, STEEL, 3.0, 0, 1.1));
    g.add(b(0.5, 0.05, 0.4, WHITE, 3.0, 0.64, 1.0));                   // towel

    // dumbbell rack
    g.add(b(3.2, 0.16, 0.6, 0x2b2f36, -2.8, 0.55, 2.3));
    g.add(b(3.2, 0.16, 0.6, 0x2b2f36, -2.8, 0.15, 2.6));
    for (let i = 0; i < 5; i++) {
      const x = -4.1 + i * 0.66, s = 0.2 + i * 0.02;
      g.add(b(0.42, 0.07, 0.07, STEEL, x, 0.72, 2.3));
      g.add(b(0.12, s * 2, s * 2, 0x24222a, x - 0.19, 0.72 - s + 0.035, 2.3));
      g.add(b(0.12, s * 2, s * 2, 0x24222a, x + 0.19, 0.72 - s + 0.035, 2.3));
    }
    // one pair left out on the floor, as ever
    for (const [x, z] of [[-1.1, 1.4], [-0.55, 1.75]]) {
      g.add(b(0.72, 0.08, 0.08, STEEL, x, 0.2, z));
      g.add(b(0.14, 0.32, 0.32, 0x24222a, x - 0.32, 0.06, z));
      g.add(b(0.14, 0.32, 0.32, 0x24222a, x + 0.32, 0.06, z));
    }

    // plate tree, mirror wall, and her bottle
    g.add(b(0.5, 0.1, 0.5, 0x2b2f36, 4.3, 0, -1.8, { flat: true }));
    g.add(b(0.14, 1.5, 0.14, 0x2b2f36, 4.3, 0, -1.8));
    for (let i = 0; i < 3; i++) {
      g.add(b(0.5, 0.5, 0.14, 0x24222a, 4.3, 0.15 + i * 0.45, -1.55));
    }
    g.add(b(0.08, 2.4, 5.4, 0xa9bcc9, -4.5, 0.1, -0.6));
    g.add(b(0.05, 0.14, 5.4, STEEL, -4.44, 2.5, -0.6));
    g.add(b(0.14, 0.36, 0.14, LIME, 2.4, 0, 1.9));
    g.add(b(0.5, 0.5, 0.06, WHITE, -1.6, 2.7, -2.15));                 // wall clock
  },

  // ---------------------------------------------------------------- 6
  // Nando's, and the shopping after. In the order the day happened.
  nandos(g) {
    g.add(floor(9, 7.5, PAVING));
    for (let ix = 0; ix < 6; ix++) {
      g.add(b(0.05, 0.03, 7.4, 0x8b8880, -3.8 + ix * 1.5, 0.04, 0, { flat: true }));
    }

    g.add(b(0.14, 0.76, 0.14, DARK, 0, 0, 0));                         // hero table
    g.add(b(1.1, 0.1, 1.1, WOOD, 0, 0.76, 0));
    g.add(b(0.5, 0.06, 0.5, DARK, 0, 0.06, 0));
    chair(g, 0, 0.95, 0x6b3f3a, 0);
    chair(g, 0, -0.95, 0x6b3f3a, Math.PI);
    g.add(b(0.1, 0.28, 0.1, 0xc23a3a, 0.36, 0.86, 0.32));              // peri sauce
    g.add(b(0.05, 0.08, 0.05, 0x2a2334, 0.36, 1.14, 0.32));
    g.add(b(0.1, 0.26, 0.1, 0x2f6f4f, 0.36, 0.86, 0.1));               // and the green one

    // a second table, so it's a restaurant
    g.add(b(0.14, 0.76, 0.14, DARK, -3.0, 0, -1.4));
    g.add(b(1.1, 0.1, 1.1, WOOD, -3.0, 0.76, -1.4));
    chair(g, -3.0, -0.45, 0x6b3f3a, 0);
    chair(g, -3.0, -2.35, 0x6b3f3a, Math.PI);

    // the shopping, leaning where you dropped it
    for (const [x, c] of [[1.8, 0xd8d2c4], [2.2, 0xc0a6b8], [2.55, 0xb8c8d0]]) {
      g.add(b(0.4, 0.5, 0.26, c, x, 0, -0.7));
      g.add(b(0.03, 0.18, 0.03, DARK, x - 0.12, 0.5, -0.7));
      g.add(b(0.03, 0.18, 0.03, DARK, x + 0.12, 0.5, -0.7));
    }

    // frontage: a low wall, planters, a board, and string lights over the tables
    g.add(b(9, 0.5, 0.3, 0xb0705a, 0, 0, -3.4));
    for (const x of [-3.6, 0, 3.6]) {
      g.add(b(0.8, 0.6, 0.8, 0x8c5343, x, 0, 2.9));
      g.add(b(0.62, 0.7, 0.62, GREEN, x, 0.6, 2.9));
    }
    g.add(b(1.4, 1.6, 0.12, 0x2b2f36, 3.6, 0, -3.0));                  // menu board
    g.add(b(1.2, 0.14, 0.03, 0xc23a3a, 3.6, 1.15, -2.93));
    g.add(b(1.0, 0.09, 0.03, WHITE, 3.6, 0.85, -2.93));
    for (const x of [-4.2, 4.2]) g.add(b(0.12, 3.0, 0.12, DARK, x, 0, 1.2));
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, sag = Math.sin(t * Math.PI) * 0.4;
      g.add(b(0.13, 0.15, 0.13, 0xfff0c0, -4.2 + t * 8.4, 2.95 - sag, 1.2,
        { emissive: 0x7a6420 }));
    }
  },

  // ---------------------------------------------------------------- 7
  // The meteor shower. Deliberately bare — the sky is the set.
  meteors(g) {
    g.add(floor(5, 4, 0x51506b));
    g.add(b(5.1, 0.05, 4.1, 0x6a688a, 0, 0.03, 0, { flat: true }));
    g.add(b(4.4, 0.03, 0.12, 0x8480a8, 0, 0.06, 0, { flat: true }));   // a fold in it

    g.add(b(0.7, 0.18, 0.5, 0xd9d3e2, -0.9, 0.05, -1.0));              // two cushions
    g.add(b(0.7, 0.18, 0.5, 0xc8bdd6, 0.3, 0.05, -1.0));
    g.add(b(0.18, 0.36, 0.18, 0x3f5f6f, 1.7, 0.05, 0.8));              // thermos
    g.add(b(0.06, 0.05, 0.06, METAL, 1.7, 0.41, 0.8));
    g.add(b(0.16, 0.18, 0.16, WHITE, 1.35, 0.05, 0.55));               // two cups poured
    g.add(b(0.16, 0.18, 0.16, WHITE, 1.35, 0.05, 0.9));
    g.add(b(0.5, 0.16, 0.38, 0x4a4e55, -1.6, 0.05, 0.95));             // her hoodie, folded
    g.add(b(0.44, 0.34, 0.28, 0x2b3138, -2.0, 0.05, -0.5));            // a rucksack

    // a lantern turned right down, so it doesn't compete with the sky
    g.add(b(0.16, 0.34, 0.16, METAL, 2.0, 0.05, -0.9));
    g.add(b(0.26, 0.26, 0.26, 0xffdca8, 2.0, 0.39, -0.9, { emissive: 0x4a3a12 }));

    // a few stones ringing the spot, and nothing else
    for (const [x, z] of [[-2.6, -1.6], [2.7, -1.9], [-2.9, 1.7], [2.9, 1.6], [0.2, 2.4]]) {
      g.add(b(0.4, 0.24, 0.36, 0x8d8a97, x, 0, z));
    }
  },

  // ---------------------------------------------------------------- 8
  // Badminton on the sand. One shuttlecock frozen mid-rally.
  badminton(g) {
    g.add(floor(11, 7.5, 0xd6c391));
    for (const z of [-3.2, 3.2]) g.add(b(10.4, 0.03, 0.09, 0xe8e0cc, 0, 0.03, z, { flat: true }));
    for (const x of [-5.1, 5.1]) g.add(b(0.09, 0.03, 6.5, 0xe8e0cc, x, 0.03, 0, { flat: true }));
    for (const x of [-2.2, 2.2]) g.add(b(0.07, 0.03, 6.5, 0xe8e0cc, x, 0.03, 0, { flat: true }));

    g.add(b(0.14, 1.75, 0.14, METAL, 0, 0, -3.4));
    g.add(b(0.14, 1.75, 0.14, METAL, 0, 0, 3.4));
    g.add(b(0.05, 0.8, 6.8, 0xe8e4dc, 0, 0.78, 0));
    g.add(b(0.08, 0.1, 6.8, WHITE, 0, 1.58, 0));
    for (const z of [-3.4, 3.4]) {                                      // guy ropes
      g.add(b(0.04, 0.04, 1.1, 0xbdb6a4, 0, 1.3, z + (z < 0 ? -0.5 : 0.5)));
    }

    for (const [x, c] of [[-2.0, 0x8c2f3f], [2.0, 0x2f4f8c]]) {         // one racket each side
      g.add(b(0.1, 0.5, 0.1, c, x, 0, 2.3));
      g.add(b(0.34, 0.46, 0.05, c, x, 0.5, 2.3));
      g.add(b(0.26, 0.36, 0.02, WHITE, x, 0.54, 2.3));
    }
    // mid-rally, nobody losing
    g.add(b(0.15, 0.13, 0.15, 0xd8c9a0, 0.4, 2.35, -0.5));
    g.add(b(0.22, 0.26, 0.22, WHITE, 0.4, 2.48, -0.5));
    for (const [x, z] of [[-3.0, -1.9], [3.4, 1.2], [-1.4, 2.7], [4.1, -2.2]]) {
      g.add(b(0.14, 0.11, 0.14, 0xd8c9a0, x, 0.03, z));
      g.add(b(0.19, 0.22, 0.19, WHITE, x, 0.14, z));
    }

    g.add(b(1.9, 0.11, 0.42, WOOD, -4.3, 0.45, 3.1));                   // bench and kit
    for (const x of [-5.1, -3.5]) g.add(b(0.12, 0.45, 0.36, DARK, x, 0, 3.1));
    g.add(b(0.75, 0.32, 0.34, 0x2b3138, -4.3, 0.56, 3.05));
    g.add(b(0.14, 0.36, 0.14, LIME, -3.2, 0.56, 3.1));
    g.add(b(0.5, 0.05, 0.4, WHITE, -5.0, 0.56, 3.05));
    g.add(b(1.0, 0.7, 0.08, 0x2b2f36, 4.6, 1.0, -3.0));                 // a silly scoreboard
    g.add(b(0.8, 0.1, 0.03, LIME, 4.6, 1.4, -2.95));
  },

  // ---------------------------------------------------------------- 9
  // The bench above the town — a rehearsal of the ending, an hour early.
  'the-bench'(g) {
    g.add(floor(9, 5.5, PAVING));
    for (let ix = 0; ix < 6; ix++) {
      g.add(b(0.05, 0.03, 5.4, 0x8b8880, -3.8 + ix * 1.5, 0.04, 0, { flat: true }));
    }
    g.add(b(9, 0.16, 0.32, 0x8e8a80, 0, 0, 2.6, { flat: true }));       // the edge

    for (let i = -4; i <= 4; i++) {                                      // railing along the drop
      g.add(b(0.1, 1.0, 0.1, METAL, i * 1.05, 0, 2.2));
    }
    g.add(b(8.6, 0.09, 0.09, METAL, 0, 0.95, 2.2));
    g.add(b(8.6, 0.07, 0.07, METAL, 0, 0.55, 2.2));

    for (const x of [-3.3, 3.3]) {                                       // two lamps
      g.add(b(0.18, 2.8, 0.18, METAL, x, 0, -0.9));
      g.add(b(0.34, 0.12, 0.34, METAL, x, 2.8, -0.9));
      g.add(b(0.46, 0.5, 0.46, 0xffe0a0, x, 2.9, -0.9, { emissive: 0x6b5216 }));
    }
    g.add(b(0.16, 0.2, 0.16, WHITE, -0.6, 0.56, 0.06));                  // two cups on the arm
    g.add(b(0.16, 0.2, 0.16, WHITE, -0.32, 0.56, 0.06));
    g.add(b(0.5, 0.08, 0.16, 0xb08a3a, 0, 0.62, -0.22));                 // a plaque on the back

    g.add(b(0.46, 0.85, 0.46, 0x3c3a44, 2.3, 0, 0.5));                   // bin
    g.add(b(0.9, 0.7, 0.9, 0x8c5343, -2.4, 0, 1.2));                     // planters
    g.add(b(0.72, 0.8, 0.72, GREEN, -2.4, 0.7, 1.2));
    g.add(b(0.9, 0.7, 0.9, 0x8c5343, 2.5, 0, -2.0));
    g.add(b(0.72, 0.8, 0.72, GREEN, 2.5, 0.7, -2.0));
    g.add(b(0.12, 1.9, 0.12, DARK, -3.9, 0, 1.5));                       // a signpost
    g.add(b(0.8, 0.22, 0.05, WOOD, -3.6, 1.6, 1.5));
  },

  // ---------------------------------------------------------------- 10
  // No plans, no rush. Fairy lights, and the snacks on the floor.
  'first-nights'(g) {
    g.add(floor(8, 7, RUG));
    g.add(b(8.1, 0.05, 7.1, 0x6d3f49, 0, 0.02, 0, { flat: true }));
    g.add(b(6.4, 0.04, 5.4, 0x8a5560, 0, 0.05, 0.3, { flat: true }));

    for (const x of [-1.7, 1.7]) {                                        // two bedside tables
      g.add(b(0.55, 0.6, 0.5, WOOD, x, 0, -0.5));
      g.add(b(0.6, 0.06, 0.55, DARK, x, 0.6, -0.5));
      g.add(b(0.04, 0.05, 0.04, STEEL, x, 0.35, -0.24));
    }
    g.add(b(0.16, 0.3, 0.16, METAL, -1.7, 0.66, -0.5));                   // the lamp
    g.add(b(0.46, 0.34, 0.46, 0xffe6b8, -1.7, 0.96, -0.5, { emissive: 0x6e5320 }));
    g.add(b(0.18, 0.2, 0.18, WHITE, 1.7, 0.66, -0.5));                    // a mug
    g.add(b(0.3, 0.06, 0.22, 0x2b2f36, 1.62, 0.66, -0.66));               // a book

    g.add(b(0.22, 0.03, 0.4, 0x1c1a24, -0.3, 0.06, 2.0, { flat: true }));  // phone, face-up
    g.add(b(0.17, 0.01, 0.33, 0xbcd8ff, -0.3, 0.09, 2.0, { emissive: 0x2a3a52, flat: true }));
    for (const [x, z, c] of [[1.1, 1.8, PINK], [1.7, 1.3, GOLD], [0.5, 2.2, 0xd8d2c4],
                             [-1.2, 1.9, 0x9fd0a0], [2.2, 2.0, 0xe8a06a]]) {
      g.add(b(0.2, 0.05, 0.15, c, x, 0.06, z, { flat: true }));            // wrappers
    }
    g.add(b(0.5, 0.28, 0.4, 0xc7452f, 2.6, 0.06, 1.4));                    // the snack tub
    for (const [x, z] of [[-2.4, 2.4], [-2.15, 2.55]]) {                   // slippers
      g.add(b(0.22, 0.12, 0.34, 0xd9c3cc, x, 0.06, z));
    }

    // a chair with yesterday's clothes on it
    chair(g, 3.0, -1.6, WOOD, -0.5);
    g.add(b(0.5, 0.3, 0.4, 0x596069, 3.0, 0.5, -1.6));
    g.add(b(0.3, 0.14, 0.3, 0x1e2129, 3.05, 0.8, -1.5));

    // fairy lights, strung overhead
    for (const post of [[-3.0, -2.4], [3.0, -2.4], [3.0, 2.6], [-3.0, 2.6]]) {
      g.add(b(0.1, 2.9, 0.1, WOOD, post[0], 0, post[1]));
    }
    for (let i = 0; i <= 13; i++) {
      const t = i / 13, sag = Math.sin(t * Math.PI) * 0.42;
      g.add(b(0.12, 0.13, 0.12, 0xfff0c0, -3.0 + t * 6.0, 2.85 - sag, -2.4,
        { emissive: 0x7a6420 }));
      g.add(b(0.12, 0.13, 0.12, 0xfff0c0, -3.0 + t * 6.0, 2.85 - sag, 2.6,
        { emissive: 0x7a6420 }));
    }
  },
};

/**
 * Where the hero prop sits inside its set, in set-local space. Without this the
 * plate ends up under the table and the rackets end up inside the net.
 */
export const HERO_OFFSET = {
  'outside-the-club': [6.4, 0, 1.05],  // the lantern belongs in the smoking pen
  'kitchen-5am': [0.2, 1.04, -1.6],    // the mug goes on the worktop
  tennis: [-2.6, 0, 2.6],              // racket at the side, not through the net
  nandos: [0, 0.86, 0],                // the plate goes on the table
  badminton: [-3.4, 0, 1.3],           // racket and shuttle off court
  meteors: [0, 0.4, 0.6],              // the star hangs over the blanket
};

/**
 * Roughly how much flat ground each set needs, in blocks. The terrain
 * generator uses this to cut a terrace of the right size — a set that
 * overhangs its terrace ends up half-buried at one end.
 */
export const SET_RADIUS = {
  'first-chat': 9,
  'outside-the-club': 12,
  'kitchen-5am': 9,
  tennis: 11,
  'the-gym': 10,
  nandos: 10,
  meteors: 7,
  badminton: 10,
  'the-bench': 9,
  'first-nights': 9,
};

/** Build the set for a memory id, or null if it has no dressing. */
export function makeSet(id) {
  const build = BUILDERS[id];
  if (!build) return null;
  const g = new THREE.Group();
  build(g);
  return g;
}
