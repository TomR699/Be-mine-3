import * as THREE from 'three';
import { makeText } from './text3d.js';

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


// --- shared pieces for the surroundings ----------------------------------

/** A building shell with a parapet and lit-at-random upstairs windows. */
function building(g, { x, z, w, d, h, brick, rot = 0, ground = null, lit = 3 }) {
  g.add(b(w, h, d, brick, x, 0, z, { rot }));
  g.add(b(w + 0.3, 0.4, d + 0.3, 0x6f4335, x, h, z, { rot }));
  const front = z + d / 2 + 0.02;
  if (ground) g.add(b(w - 0.8, 2.4, 0.12, ground, x, 0, front, { rot }));
  const floors = Math.max(0, Math.floor((h - 3.2) / 1.7));
  for (let f = 0; f < floors; f++) {
    for (const dx of [-w / 4, w / 4]) {
      const on = (((x + dx) * 3 + f * 7) | 0) % lit === 0;
      g.add(b(0.85, 1.15, 0.1, on ? 0xffe1a6 : 0x2a2430, x + dx, 3.4 + f * 1.7, front,
        on ? { emissive: 0x6b5320, rot } : { rot }));
      g.add(b(1.0, 0.1, 0.16, 0xcfc6bb, x + dx, 4.55 + f * 1.7, front, { rot }));
    }
  }
}

/** A run of posts and rails between two points. */
function fenceRun(g, x0, z0, x1, z1, { h = 1.6, color = 0x5b6169, step = 2.2 } = {}) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    g.add(b(0.1, h, 0.1, color, x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t));
  }
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  const ang = Math.atan2(x1 - x0, z1 - z0);
  for (const y of [h * 0.55, h - 0.08]) {
    g.add(b(0.06, 0.06, len, color, mx, y, mz, { rot: ang }));
  }
}

/** Two walls and a floor — a room with its fourth wall taken away. */
/**
 * The roundel over the office door — a white and blue quartered disc in a dark
 * ring, which is what you look up at every morning on the way in.
 *
 * Built from boxes on the front of the wall rather than a texture, like every
 * other sign here. The quarters are two pale and two blue, laid out so the
 * pale ones are opposite each other.
 */
function roundel(g, x, y, z, size = 1.4) {
  const RING = 0x1c1f24, PALE = 0xf2f4f6, BLUE = 0x2f6fb5;
  const r = size / 2;

  // the dark ring, as a band of blocks around the circle
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    g.add(b(size * 0.24, size * 0.24, 0.1, RING,
      x + Math.cos(a) * r, y + Math.sin(a) * r - size * 0.12, z));
  }

  // the quarters, drawn as stepped rows so each one reads as a wedge
  const cells = 6;
  const step = (size * 0.78) / cells;
  for (let iy = 0; iy < cells; iy++) {
    for (let ix = 0; ix < cells; ix++) {
      const dx = (ix - (cells - 1) / 2) * step;
      const dy = (iy - (cells - 1) / 2) * step;
      if (Math.hypot(dx, dy) > size * 0.39) continue;
      const pale = (dx < 0) === (dy < 0);
      g.add(b(step * 1.05, step * 1.05, 0.07, pale ? PALE : BLUE,
        x + dx, y + dy - step * 0.52, z + 0.02));
    }
  }
}

function roomShell(g, { w, d, h = 3.0, wall = 0xd6cec2, floorCol = 0x8a6a45, x = 0, z = 0 }) {
  g.add(floor(w, d, floorCol, 0.03, x, z));
  g.add(b(w, h, 0.3, wall, x, 0, z - d / 2));                 // back wall
  g.add(b(0.3, h, d, wall, x - w / 2, 0, z));                 // side wall
  g.add(b(w + 0.4, 0.28, d + 0.4, 0x6f5a4c, x, h, z));        // roof lip
}

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
  // Labyrinth, 13-15 Bridge Street — and the street it stands on. A club on
  // its own in a field reads as a prop; a club in a terrace reads as a place.
  'outside-the-club'(g) {
    // --- the street surface ---------------------------------------------
    g.add(floor(52, 7, 0xa8a49a, 0.02, 0, 1.4));                  // pavement
    g.add(b(52, 0.17, 0.34, 0x8e8a80, 0, 0, 4.5, { flat: true })); // kerb
    g.add(b(52, 0.06, 6.5, 0x3a3a3e, 0, 0, 7.9, { flat: true }));  // road
    g.add(b(52, 0.17, 0.34, 0x8e8a80, 0, 0, 11.3, { flat: true }));
    g.add(floor(52, 3.4, 0xa8a49a, 0.02, 0, 13.1));                // far kerbside

    for (let i = -10; i <= 10; i++) {                                // centre line
      g.add(b(1.6, 0.02, 0.12, 0xd8d4c8, i * 2.5, 0.07, 7.9, { flat: true }));
    }
    for (const x of [-16, -12.8, -9.6, -6.4, -3.2, 0, 3.2, 6.4, 9.6, 12.8, 16]) {  // double yellows
      g.add(b(2.6, 0.02, 0.1, 0xd9b036, x, 0.07, 5.0, { flat: true }));
      g.add(b(2.6, 0.02, 0.1, 0xd9b036, x, 0.07, 5.25, { flat: true }));
    }
    for (let i = 0; i < 7; i++) {                                   // zebra crossing
      g.add(b(0.55, 0.02, 6.3, 0xe4e0d4, -11.6 + i * 0.95, 0.08, 7.9, { flat: true }));
    }

    // --- the club itself -------------------------------------------------
    g.add(b(13, 3.4, 0.8, LAB.marble, 0, 0, -3.4));
    g.add(b(13, 3.0, 0.8, LAB.brick, 0, 3.4, -3.4));
    g.add(b(13.4, 0.4, 1.0, 0x6f4335, 0, 6.4, -3.4));               // parapet
    for (const x of [-4.6, -1.4, 1.8, 5.0]) {
      g.add(b(0.08, 3.3, 0.04, LAB.marbleLt, x, 0, -3.0));
    }
    for (const [x, y] of [[-4.4, 4.1], [-1.5, 4.1], [1.5, 4.1], [4.4, 4.1]]) {
      g.add(b(0.9, 1.3, 0.1, 0x2a2430, x, y, -3.02));               // upstairs windows
      g.add(b(1.05, 0.12, 0.16, 0xcfc6bb, x, y + 1.3, -3.04));
    }

    for (let ix = 0; ix < 12; ix++) {                                // chequer recess
      for (let iz = 0; iz < 3; iz++) {
        const c = (ix + iz) % 2 ? LAB.tileA : LAB.tileB;
        g.add(b(0.8, 0.06, 0.8, c, -4.4 + ix * 0.8, 0.03, -2.6 + iz * 0.8, { flat: true }));
      }
    }

    const doorPair = (cx) => {
      for (const dx of [-0.62, 0.62]) {
        g.add(b(1.18, 2.6, 0.12, LAB.door, cx + dx, 0, -3.02));
        g.add(b(0.86, 2.1, 0.06, LAB.glass, cx + dx, 0.32, -2.96));
        g.add(b(0.34, 0.42, 0.02, WHITE, cx + dx, 1.5, -2.92));
        g.add(b(0.06, 1.1, 0.06, 0xd8b070, cx + dx + (dx > 0 ? -0.5 : 0.5), 0.7, -2.9));
      }
    };
    doorPair(1.6);
    doorPair(-2.6);

    g.add(b(1.5, 1.5, 0.05, WHITE, -0.5, 1.1, -2.98));              // maze panel
    for (const [w, h, x, y] of [[1.1, 0.09, -0.5, 1.95], [0.09, 0.9, -1.0, 1.35],
                                [0.8, 0.09, -0.35, 1.5], [0.09, 0.6, -0.1, 1.5]]) {
      g.add(b(w, h, 0.02, LAB.tileB, x, y, -2.94));
    }

    // the name, spelled out
    g.add(b(11.6, 1.15, 0.34, LAB.fascia, 0, 2.7, -2.55));
    const name = makeText('LABYRINTH', { cell: 0.115, depth: 0.08, color: LAB.copper });
    name.position.set(0, 3.05, -2.36);
    g.add(name);
    const sub = makeText('NIGHTCLUB', { cell: 0.045, depth: 0.03, color: 0xd8cdbe });
    sub.position.set(-0.5, 0.72, -2.93);
    g.add(sub);
    const num = makeText('13-15', { cell: 0.04, depth: 0.02, color: WHITE });
    num.position.set(-4.6, 1.5, -2.95);
    g.add(num);

    // canopy, tubes, festoon bulbs
    g.add(b(13.6, 0.34, 2.9, 0x1c1a20, 0, 4.35, -2.1));
    for (const x of [-3.4, 2.6]) {
      g.add(b(5.2, 0.16, 0.16, LAB.tube, x, 4.16, -1.0, { emissive: 0x5f7488 }));
    }
    for (let i = 0; i <= 18; i++) {
      const t = i / 18, sag = Math.sin(t * Math.PI) * 0.16;
      g.add(b(0.16, 0.2, 0.16, LAB.bulb, -6.6 + t * 13.2, 4.72 - sag, -0.72,
        { emissive: 0x7a6a3a }));
    }
    for (const x of [-5.4, 5.4]) {                                   // cast iron columns
      g.add(b(0.42, 4.45, 0.42, LAB.column, x, 0, -0.85));
      g.add(b(0.56, 0.2, 0.56, LAB.column, x, 4.45, -0.85));
      g.add(b(0.2, 3.4, 0.2, 0x1a1f1c, x + 0.3, 0, -1.15));
    }

    // --- neighbours, so it sits in a terrace ------------------------------
    // Each is a shopfront under two or three storeys, in its own brick.
    const SHOP = [
      { x: -10.4, w: 6.2, h: 7.2, brick: 0x8f5a44, shop: 0x2f4a3c },
      { x: 10.4, w: 6.2, h: 6.4, brick: 0x7a6152, shop: 0x5a3a44 },
      { x: -16.4, w: 5.0, h: 5.8, brick: 0x9a6a4e, shop: 0x35435c },
      { x: 16.4, w: 5.0, h: 6.8, brick: 0x6f5a52, shop: 0x4a3a2c },
      { x: -22.0, w: 5.4, h: 6.6, brick: 0x74584a, shop: 0x46383f },
      { x: 22.0, w: 5.4, h: 5.4, brick: 0x8a6250, shop: 0x2f3f4a },
    ];
    for (const sh of SHOP) {
      g.add(b(sh.w, sh.h, 0.9, sh.brick, sh.x, 0, -3.45));
      g.add(b(sh.w + 0.3, 0.4, 1.1, 0x6f4335, sh.x, sh.h, -3.45));   // parapet
      g.add(b(sh.w - 0.5, 2.5, 0.14, sh.shop, sh.x, 0, -2.98));      // shopfront
      g.add(b(sh.w - 1.1, 1.5, 0.06, LAB.glass, sh.x, 0.5, -2.9));
      g.add(b(sh.w - 0.5, 0.42, 0.2, 0x241f26, sh.x, 2.5, -2.96));   // fascia
      g.add(b(0.8, 2.1, 0.1, 0x2b2028, sh.x + sh.w / 2 - 0.7, 0, -2.94)); // door

      // windows up the storeys, a few of them lit
      const floors = Math.floor((sh.h - 3.2) / 1.7);
      for (let f = 0; f < floors; f++) {
        for (const dx of [-sh.w / 4, sh.w / 4]) {
          const lit = ((sh.x + f + dx) | 0) % 3 === 0;
          g.add(b(0.85, 1.15, 0.1, lit ? 0xffe1a6 : 0x2a2430, sh.x + dx, 3.4 + f * 1.7, -3.0,
            lit ? { emissive: 0x6b5320 } : {}));
          g.add(b(1.0, 0.1, 0.16, 0xcfc6bb, sh.x + dx, 4.55 + f * 1.7, -3.02));
        }
      }
    }

    // --- street furniture -------------------------------------------------
    for (const x of [-19.5, -13.5, -7.5, 7.5, 13.5, 19.5]) {          // streetlights
      g.add(b(0.22, 4.6, 0.22, 0x3a3f45, x, 0, 3.6));
      g.add(b(0.22, 0.22, 1.1, 0x3a3f45, x, 4.6, 3.1));
      g.add(b(0.7, 0.24, 0.5, 0xffe6b0, x, 4.5, 2.7, { emissive: 0x6e5320 }));
    }
    g.add(b(2.6, 2.4, 1.3, 0x2f3a44, -8.6, 0, 3.2));                 // bus shelter
    g.add(b(2.9, 0.14, 1.6, 0x1f272e, -8.6, 2.4, 3.2));
    g.add(b(2.2, 0.5, 0.1, 0xd8cdbe, -8.6, 0.5, 2.6));
    g.add(b(0.12, 2.6, 0.12, 0x3a3f45, -6.9, 0, 3.9));
    g.add(b(0.5, 0.7, 0.06, 0xc23a3a, -6.9, 2.6, 3.9));              // bus stop flag

    for (const [x, c] of [[-4.5, 0x8c3b3b], [3.5, 0x2f4a6b], [11.5, 0xd8d4cc]]) {
      g.add(b(1.9, 0.7, 0.9, c, x, 0.28, 6.4));                      // parked cars
      g.add(b(1.2, 0.55, 0.85, c, x - 0.1, 0.98, 6.4));
      g.add(b(1.0, 0.42, 0.88, 0x2a3038, x - 0.1, 1.02, 6.4));
      for (const [wx, wz] of [[-0.65, -0.45], [-0.65, 0.45], [0.65, -0.45], [0.65, 0.45]]) {
        g.add(b(0.3, 0.32, 0.16, 0x1a1a1e, x + wx, 0.12, 6.4 + wz));
      }
    }
    g.add(b(0.46, 0.9, 0.46, 0x3c3a44, 6.2, 0, 3.4));                // bin
    g.add(b(0.5, 1.1, 0.5, 0x2d4a3a, -1.2, 0, 3.6));                 // postbox-ish
    g.add(b(0.12, 2.2, 0.12, 0x3a3f45, 5.0, 0, 3.9));                // street sign
    const st = makeText('BRIDGE ST', { cell: 0.055, depth: 0.02, color: 0x2b2f36 });
    g.add(b(1.9, 0.4, 0.06, 0xe8e4dc, 5.0, 2.2, 3.9));
    st.position.set(5.0, 2.34, 3.85);
    g.add(st);

    // --- the smoking pen, where the conversation actually happened --------
    for (let i = 0; i <= 6; i++) {
      g.add(b(0.09, 1.0, 0.09, LAB.rail, 5.9 + i * 0.6, 0, 1.9));
    }
    g.add(b(3.7, 0.08, 0.08, LAB.rail, 7.7, 0.92, 1.9));
    g.add(b(0.09, 1.0, 0.09, LAB.rail, 9.5, 0, 0.5));
    g.add(b(0.08, 0.08, 2.9, LAB.rail, 9.5, 0.92, 0.45));
    for (const [x, z] of [[6.6, 0.6], [8.5, 0.9]]) {
      g.add(b(0.16, 1.05, 0.16, LAB.rail, x, 0, z));
      g.add(b(0.62, 0.07, 0.62, 0x2b2f36, x, 1.05, z));
      g.add(b(0.18, 0.05, 0.18, 0x6a6a72, x + 0.14, 1.12, z));
    }
    g.add(b(0.24, 2.1, 0.24, LAB.rail, 7.4, 0, -0.6));
    g.add(b(0.68, 0.34, 0.68, 0xffb257, 7.4, 2.1, -0.6, { emissive: 0x7a4a10 }));
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
    // The drop is on the far side from the path. It used to be on the near
    // side, so she arrived at the railing with her back to the view — a
    // viewpoint you have to climb over to look out of.
    g.add(b(9, 0.16, 0.32, 0x8e8a80, 0, 0, -2.6, { flat: true }));      // the edge

    for (let i = -4; i <= 4; i++) {                                      // railing along the drop
      g.add(b(0.1, 1.0, 0.1, METAL, i * 1.05, 0, -2.2));
    }
    g.add(b(8.6, 0.09, 0.09, METAL, 0, 0.95, -2.2));
    g.add(b(8.6, 0.07, 0.07, METAL, 0, 0.55, -2.2));

    for (const x of [-3.3, 3.3]) {                                       // two lamps
      g.add(b(0.18, 2.8, 0.18, METAL, x, 0, 0.9));
      g.add(b(0.34, 0.12, 0.34, METAL, x, 2.8, 0.9));
      g.add(b(0.46, 0.5, 0.46, 0xffe0a0, x, 2.9, 0.9, { emissive: 0x6b5216 }));
    }
    g.add(b(0.16, 0.2, 0.16, WHITE, -0.6, 0.56, 0.06));                  // two cups on the arm
    g.add(b(0.16, 0.2, 0.16, WHITE, -0.32, 0.56, 0.06));
    g.add(b(0.5, 0.08, 0.16, 0xb08a3a, 0, 0.62, -0.22));                 // a plaque on the back

    g.add(b(0.46, 0.85, 0.46, 0x3c3a44, 2.3, 0, 0.5));                   // bin
    g.add(b(0.9, 0.7, 0.9, 0x8c5343, -2.4, 0, -1.2));                    // planters
    g.add(b(0.72, 0.8, 0.72, GREEN, -2.4, 0.7, -1.2));
    g.add(b(0.9, 0.7, 0.9, 0x8c5343, 2.5, 0, 2.0));
    g.add(b(0.72, 0.8, 0.72, GREEN, 2.5, 0.7, 2.0));
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
 * The world around each set.
 *
 * The sets themselves say what the memory was; this says where on the island it
 * is. Kept separate from BUILDERS so the working sets stay untouched — and so a
 * memory with no entry here simply gets no surroundings rather than breaking.
 */
const CONTEXT = {
  // The office it was a canteen for, and the yard outside it.
  'first-chat'(g) {
    building(g, { x: -1, z: -8.6, w: 16, d: 4.5, h: 8.5, brick: 0x7f8a92, ground: 0x35485c });
    for (const dx of [-5.5, -1.5, 2.5, 6.5]) {                  // glazed ground floor
      g.add(b(3.0, 2.6, 0.12, 0x35485c, dx - 1, 0.2, -6.28));
      g.add(b(2.4, 2.0, 0.06, 0x9fc4d8, dx - 1, 0.45, -6.2));
    }
    g.add(b(2.4, 0.3, 1.6, 0x9aa2a8, -1, 2.9, -5.6));           // entrance canopy
    roundel(g, -1, 4.4, -6.32, 1.5);                            // the badge on the wall

    g.add(floor(20, 5, 0x9a9689, 0.02, -1, -4.2));               // forecourt
    for (const x of [7.5, 9.0, 10.5]) {                          // bike racks
      g.add(b(0.1, 0.9, 0.1, 0x6e747a, x, 0, -3.2));
      g.add(b(0.1, 0.9, 0.1, 0x6e747a, x, 0, -2.2));
      g.add(b(0.08, 0.08, 1.1, 0x6e747a, x, 0.85, -2.7));
    }
    for (const x of [-8, 5]) {                                    // planters
      g.add(b(2.6, 0.7, 1.0, 0x8c7f70, x, 0, -1.6));
      g.add(b(2.3, 0.6, 0.8, GREEN, x, 0.7, -1.6));
    }
    fenceRun(g, -10.5, 3.4, 9.5, 3.4, { h: 1.1, color: 0x6e747a });
  },

  // Her house, with the kitchen wall taken off.
  'kitchen-5am'(g) {
    roomShell(g, { w: 9.5, d: 7.5, h: 3.1, wall: 0xd9d0c2, floorCol: 0x8a6a45, x: -0.6, z: -0.8 });
    g.add(b(1.1, 2.2, 0.16, 0x6b4a34, 3.6, 0, -4.5));            // a door through
    g.add(b(0.12, 0.12, 0.12, GOLD, 3.2, 1.1, -4.38));
    building(g, { x: -0.6, z: -6.2, w: 10, d: 2.4, h: 6.4, brick: 0xb4a08c });
    g.add(b(10.6, 0.4, 3.4, 0x8c5a48, -0.6, 6.4, -5.8));         // roof over

    g.add(floor(12, 5, 0x6d8a52, 0.02, -0.6, 5.4));              // back garden
    fenceRun(g, -6.6, 7.6, 5.4, 7.6, { h: 1.5, color: 0x7a5638, step: 1.6 });
    fenceRun(g, -6.6, 2.9, -6.6, 7.6, { h: 1.5, color: 0x7a5638, step: 1.6 });
    fenceRun(g, 5.4, 2.9, 5.4, 7.6, { h: 1.5, color: 0x7a5638, step: 1.6 });
    for (const [x, z] of [[-4.5, 6.2], [3.4, 6.6]]) {
      g.add(b(0.7, 0.6, 0.7, 0xa9614a, x, 0, z));                // pots
      g.add(b(0.55, 0.7, 0.55, GREEN, x, 0.6, z));
    }
    g.add(b(0.7, 1.0, 0.6, 0x39424c, 4.4, 0, 3.6));              // wheelie bin
    g.add(b(1.9, 0.1, 0.5, WOOD, -3.2, 0.45, 4.6));              // garden bench
    for (const x of [-4.0, -2.4]) g.add(b(0.12, 0.45, 0.4, DARK, x, 0, 4.6));
  },

  // A small sports ground: pavilion, fencing, floodlights, a second court.
  tennis(g) {
    fenceRun(g, -7.5, -6.5, 7.5, -6.5, { h: 3.0, color: 0x4b5157, step: 2.5 });
    fenceRun(g, -7.5, 6.5, 7.5, 6.5, { h: 3.0, color: 0x4b5157, step: 2.5 });
    fenceRun(g, -7.5, -6.5, -7.5, 6.5, { h: 3.0, color: 0x4b5157, step: 2.5 });
    fenceRun(g, 7.5, -6.5, 7.5, 6.5, { h: 3.0, color: 0x4b5157, step: 2.5 });

    // pavilion
    g.add(b(7.5, 3.0, 4.2, 0xcfc3ae, -0.5, 0, 10.2));
    g.add(b(8.2, 0.5, 5.0, 0x7a4a3c, -0.5, 3.0, 10.2));
    g.add(b(7.6, 0.3, 1.8, 0x7a4a3c, -0.5, 2.6, 7.9));           // veranda roof
    for (const x of [-3.6, 2.6]) g.add(b(0.16, 2.6, 0.16, 0xcfc3ae, x, 0, 8.2));
    for (const dx of [-2.4, 0.6]) {
      g.add(b(1.5, 1.2, 0.12, 0x9fc4d8, dx, 1.2, 8.12));
      g.add(b(1.6, 0.12, 0.18, WHITE, dx, 2.4, 8.1));
    }
    g.add(b(1.0, 2.2, 0.14, 0x4a3628, 2.6, 0, 8.12));
    const nm = makeText('TENNIS CLUB', { cell: 0.06, depth: 0.03, color: 0x3c4a3f });
    nm.position.set(-0.5, 3.15, 8.05); g.add(nm);

    // a second court, marked but empty
    g.add(floor(11, 8, CLAY, 0.02, -13.5, 1.0));
    for (const z of [-2.6, 4.6]) g.add(b(10.4, 0.03, 0.09, WHITE, -13.5, 0.03, z, { flat: true }));
    for (const x of [-18.6, -8.4]) g.add(b(0.09, 0.03, 7.4, WHITE, x, 0.03, 1.0, { flat: true }));
    g.add(b(0.12, 1.1, 0.12, DARK, -13.5, 0, -2.8));
    g.add(b(0.12, 1.1, 0.12, DARK, -13.5, 0, 4.8));
    g.add(b(0.05, 0.85, 7.6, 0x2c2c33, -13.5, 0.12, 1.0));

    for (const [x, z] of [[-9.5, -7.5], [9.5, -7.5], [-9.5, 7.5], [9.5, 7.5]]) {
      g.add(b(0.3, 7.0, 0.3, 0x5b6169, x, 0, z));                // floodlights
      g.add(b(1.5, 0.5, 0.4, 0xf2efe4, x, 7.0, z, { emissive: 0x54503f }));
    }
  },

  // An industrial unit on a small parade, with its car park.
  'the-gym'(g) {
    g.add(b(13, 5.2, 9.5, 0xb9bcc0, 0, 0, -1.2));                // the shed
    g.add(b(13.6, 0.5, 10.1, 0x6f747a, 0, 5.2, -1.2));
    g.add(b(13, 0.35, 0.35, 0x8c9096, 0, 3.0, 3.6));             // cladding line
    g.add(b(4.6, 3.4, 0.2, 0x4a4f55, -3.2, 0, 3.62));            // roller door
    for (let i = 0; i < 7; i++) g.add(b(4.4, 0.12, 0.06, 0x5f656b, -3.2, 0.4 + i * 0.45, 3.7));
    g.add(b(1.2, 2.3, 0.16, 0x2b3138, 2.4, 0, 3.62));            // personnel door
    for (const dx of [1.0, 3.0, 5.0]) {
      g.add(b(1.4, 1.0, 0.1, 0x35485c, dx, 3.2, 3.62));
      g.add(b(1.2, 0.8, 0.06, 0x9fc4d8, dx, 3.3, 3.56));
    }
    g.add(b(6.0, 1.0, 0.24, 0x1f242a, 0, 4.0, 3.7));             // signage band
    const nm = makeText('IRONWORKS GYM', { cell: 0.062, depth: 0.04, color: 0xd6dc8e, emissive: 0x3a3d1c });
    nm.position.set(0, 4.35, 3.86); g.add(nm);

    g.add(floor(17, 8, 0x4a4d52, 0.02, 0, 8.6));                 // car park
    for (let i = 0; i < 6; i++) {
      g.add(b(0.1, 0.02, 4.6, 0xd8d4c8, -6.5 + i * 2.6, 0.06, 8.4, { flat: true }));
    }
    for (const [x, c] of [[-5.2, 0x8c3b3b], [0.2, 0x2f4a6b]]) {
      g.add(b(1.9, 0.7, 0.9, c, x, 0.28, 8.2, { rot: Math.PI / 2 }));
      g.add(b(1.2, 0.55, 0.85, c, x, 0.98, 8.3, { rot: Math.PI / 2 }));
    }
    fenceRun(g, -8.6, 12.8, 8.6, 12.8, { h: 1.8, color: 0x5b6169 });
    for (const x of [-7.5, 7.5]) {
      g.add(b(0.22, 5.0, 0.22, 0x3a3f45, x, 0, 9.5));
      g.add(b(0.7, 0.24, 0.5, 0xffe6b0, x, 4.9, 9.1, { emissive: 0x6e5320 }));
    }
  },

  // A stretch of high street.
  nandos(g) {
    building(g, { x: 0, z: -6.0, w: 9.5, d: 4.0, h: 7.0, brick: 0x9c4a52, ground: 0x5a1f24 });
    g.add(b(8.6, 1.1, 0.3, 0x38151a, 0, 3.0, -3.85));            // fascia
    const nm = makeText("NANDO'S", { cell: 0.1, depth: 0.05, color: 0xe8c98a });
    nm.position.set(0, 3.3, -3.66); g.add(nm);
    g.add(b(9.0, 0.35, 1.7, 0x38151a, 0, 4.2, -3.2));            // awning
    for (const dx of [-2.6, 2.6]) {
      g.add(b(2.2, 2.2, 0.12, 0x8a6a3a, dx, 0.3, -3.9));
      g.add(b(1.8, 1.8, 0.06, 0xc9a86a, dx, 0.5, -3.82));
    }

    building(g, { x: -10.5, z: -6.2, w: 8, d: 4.0, h: 6.0, brick: 0x7d6154, ground: 0x35485c });
    building(g, { x: 10.5, z: -6.2, w: 8, d: 4.0, h: 6.6, brick: 0x8f7a5f, ground: 0x46383f });

    g.add(floor(30, 4.5, 0x9a9689, 0.02, 0, -0.8));              // pavement
    g.add(b(30, 0.17, 0.34, 0x8e8a80, 0, 0, 1.5, { flat: true }));
    g.add(b(30, 0.06, 5.5, 0x3a3a3e, 0, 0, 4.4, { flat: true })); // road
    for (let i = -6; i <= 6; i++) {
      g.add(b(1.4, 0.02, 0.12, 0xd8d4c8, i * 2.3, 0.07, 4.4, { flat: true }));
    }
    for (const x of [-9, -3, 3, 9]) {
      g.add(b(0.2, 4.2, 0.2, 0x3a3f45, x, 0, 0.6));              // streetlights
      g.add(b(0.6, 0.22, 0.45, 0xffe6b0, x, 4.1, 0.2, { emissive: 0x6e5320 }));
    }
    g.add(b(0.46, 0.9, 0.46, 0x3c3a44, 5.8, 0, 0.2));
  },

  // A hilltop field, and nothing else. The sky is the set.
  meteors(g) {
    for (let i = 0; i < 26; i++) {                                // drystone wall
      const t = i / 25, x = -11 + t * 22, z = -7.5 + Math.sin(t * 3.2) * 0.8;
      g.add(b(0.9, 0.75, 0.7, 0x9a978d, x, 0, z));
      if (i % 2) g.add(b(0.7, 0.3, 0.6, 0x8a877d, x, 0.75, z));
    }
    g.add(b(0.16, 1.3, 0.16, WOOD, -1.4, 0, -7.4));               // a field gate
    g.add(b(0.16, 1.3, 0.16, WOOD, 1.4, 0, -7.4));
    for (const y of [0.45, 0.95]) g.add(b(2.9, 0.12, 0.08, WOOD, 0, y, -7.4));
    for (const [x, z] of [[-8.5, 5.5], [7.5, 4.5], [-6, -3.5]]) {
      g.add(b(1.1, 0.6, 0.9, 0x8d8a97, x, 0, z));                 // boulders
    }
  },

  // A beachside court with a hut and floodlights.
  badminton(g) {
    fenceRun(g, -6.5, -4.8, 6.5, -4.8, { h: 2.6, color: 0x5b6169, step: 2.4 });
    fenceRun(g, -6.5, 4.8, 6.5, 4.8, { h: 2.6, color: 0x5b6169, step: 2.4 });
    fenceRun(g, -6.5, -4.8, -6.5, 4.8, { h: 2.6, color: 0x5b6169, step: 2.4 });

    g.add(b(4.6, 2.6, 3.2, 0xd8c9a8, 8.6, 0, 1.0));               // changing hut
    g.add(b(5.2, 0.4, 3.8, 0x7a4a3c, 8.6, 2.6, 1.0));
    g.add(b(1.0, 2.1, 0.14, 0x4a3628, 7.4, 0, -0.65));
    g.add(b(1.4, 1.0, 0.12, 0x9fc4d8, 9.8, 1.2, -0.65));
    const nm = makeText('COURTS', { cell: 0.055, depth: 0.03, color: 0x3c4a3f });
    nm.position.set(8.6, 2.75, -0.7); g.add(nm);

    for (const [x, z] of [[-7.5, -5.8], [7.5, -5.8]]) {
      g.add(b(0.28, 6.0, 0.28, 0x5b6169, x, 0, z));
      g.add(b(1.3, 0.45, 0.4, 0xf2efe4, x, 6.0, z, { emissive: 0x54503f }));
    }
    for (const x of [-3, 1]) {                                     // beach huts behind
      g.add(b(2.2, 2.4, 2.0, x < 0 ? 0x8fb8c4 : 0xd8a9a0, x, 0, -8.4));
      g.add(b(2.5, 0.35, 2.3, WHITE, x, 2.4, -8.4));
    }
  },

  // The overlook: steps, a wall, a viewpoint.
  'the-bench'(g) {
    for (let i = 0; i < 5; i++) {                                  // steps up from the path
      g.add(b(4.0, 0.22, 0.7, PAVING, 0, -1.1 + i * 0.22, 3.4 + i * 0.7, { flat: true }));
    }
    for (let i = 0; i < 22; i++) {                                 // low stone wall at the drop
      const t = i / 21, x = -5.5 + t * 11;
      g.add(b(0.55, 0.8, 0.7, 0x9a978d, x, 0, -2.75));
      g.add(b(0.6, 0.18, 0.8, 0x8a877d, x, 0.8, -2.75));
    }
    g.add(b(0.22, 1.3, 0.22, 0x3a3f45, 3.4, 0, -1.9));             // telescope
    g.add(b(0.6, 0.22, 0.22, 0x2b2f36, 3.4, 1.35, -1.75));
    g.add(b(1.3, 0.7, 0.1, 0x6b5a3a, -3.6, 1.0, -2.4, { rot: 0.3 })); // viewpoint plaque
    for (const [x, z] of [[-6.6, 0.5], [6.6, -0.5]]) {
      g.add(b(0.9, 0.7, 0.9, 0x8c5343, x, 0, z));
      g.add(b(0.75, 0.9, 0.75, GREEN, x, 0.7, z));
    }
  },

  // Her room, with the wall taken off, inside the rest of the house.
  'first-nights'(g) {
    roomShell(g, { w: 9.0, d: 7.5, h: 3.0, wall: 0xc9b8bf, floorCol: 0x7d4a55, x: 0, z: -0.6 });
    g.add(b(1.8, 1.5, 0.14, 0x2b3138, 2.6, 1.1, -4.25));           // window
    g.add(b(2.0, 0.14, 0.2, WHITE, 2.6, 2.6, -4.28));
    for (const dx of [-0.75, 0.75]) {                              // curtains
      g.add(b(0.5, 1.9, 0.1, 0x8a5a66, 2.6 + dx, 0.9, -4.16));
    }
    g.add(b(1.0, 2.2, 0.16, 0x6b4a34, -3.4, 0, -4.25));            // door
    g.add(b(0.12, 0.12, 0.12, GOLD, -2.95, 1.1, -4.12));
    g.add(b(1.6, 2.3, 0.7, 0x6b4a34, -3.6, 0, 1.2));               // wardrobe
    g.add(b(0.08, 0.5, 0.08, GOLD, -3.1, 1.3, 1.56));

    // The rest of the house. This was two flat slabs behind the room, which is
    // why it looked like scenery flats rather than somewhere anyone lived. It
    // is a house now: brick, an upper storey over the cutaway, a pitched roof
    // with eaves and a chimney, a side extension to break the box, and a front
    // garden with a wall and a gate. The ground floor is opened up like a
    // doll's house — that is the whole idea of the set — so the storey above
    // carries the front elevation and short returns hold up its corners.
    const BRICK = 0xa4796a, BRICK_D = 0x8b6152, RENDER = 0xd8cec4;
    const ROOF = 0x6a4b46, ROOF_D = 0x573c38, TRIM = 0xefe9e0, GLASS = 0x2f3a44;

    const HW = 5.2, FRONT = 3.5, BACK = -5.2;      // half-width, front, back
    const GF = 3.0, TOP = 5.9;                     // ground-floor and eaves height

    // ground floor: an outer skin around the room, open at the front
    g.add(b(HW * 2 + 0.5, GF, 0.4, BRICK, 0, 0, BACK));
    for (const sx of [-1, 1]) {
      g.add(b(0.4, GF, FRONT - BACK, BRICK, sx * (HW + 0.05), 0, (FRONT + BACK) / 2));
      // the cut edge of the front wall, left standing at the corners
      g.add(b(1.1, GF, 0.4, BRICK, sx * (HW - 0.45), 0, FRONT));
      g.add(b(1.2, 0.16, 0.5, BRICK_D, sx * (HW - 0.45), GF - 0.16, FRONT));
    }
    // a course of lighter brick where the two storeys meet
    g.add(b(HW * 2 + 0.9, 0.28, FRONT - BACK + 0.6, BRICK_D, 0, GF, (FRONT + BACK) / 2));

    // upper storey, full walls, with windows
    const UH = TOP - GF - 0.28;
    g.add(b(HW * 2 + 0.5, UH, 0.4, BRICK, 0, GF + 0.28, BACK));
    g.add(b(HW * 2 + 0.5, UH, 0.4, BRICK, 0, GF + 0.28, FRONT));
    for (const sx of [-1, 1]) {
      g.add(b(0.4, UH, FRONT - BACK, BRICK, sx * (HW + 0.05), GF + 0.28, (FRONT + BACK) / 2));
    }
    for (const wx of [-2.6, 0, 2.6]) {
      g.add(b(1.3, 1.5, 0.12, GLASS, wx, GF + 0.9, FRONT + 0.19));
      g.add(b(1.5, 0.14, 0.24, TRIM, wx, GF + 0.78, FRONT + 0.2));   // sill
      g.add(b(1.5, 0.14, 0.24, TRIM, wx, GF + 2.4, FRONT + 0.2));    // lintel
      g.add(b(0.1, 1.5, 0.14, TRIM, wx, GF + 0.9, FRONT + 0.2));     // glazing bar
    }
    // one window lit, because somebody is in
    g.add(b(1.24, 1.44, 0.06, 0xffdca0, -2.6, GF + 0.93, FRONT + 0.24,
      { emissive: 0x6e5320, flat: true }));

    // a pitched roof: two slopes to a ridge, overhanging at the eaves
    const RUN = HW + 0.55, RISE = 1.9;
    const slope = Math.atan2(RISE, RUN);
    const len = Math.hypot(RUN, RISE);
    for (const sz of [-1, 1]) {
      const pitch = b(HW * 2 + 1.5, 0.3, len * 2, ROOF, 0, 0, 0, { flat: true });
      pitch.rotation.x = sz * slope;
      pitch.position.set(0, TOP + RISE / 2, (FRONT + BACK) / 2 + sz * (RUN + 0.55) / 2);
      g.add(pitch);
    }
    g.add(b(HW * 2 + 1.7, 0.3, 0.42, ROOF_D, 0, TOP + RISE - 0.1, (FRONT + BACK) / 2));  // ridge
    // gable ends, so the roof closes off rather than showing its underside
    for (const sx of [-1, 1]) {
      for (let t = 0; t < 5; t++) {
        const f = t / 5;
        g.add(b(0.42, RISE / 5 + 0.02, (RUN + 0.55) * 2 * (1 - f), BRICK,
          sx * (HW + 0.2), TOP + f * RISE, (FRONT + BACK) / 2));
      }
    }
    // chimney
    g.add(b(1.0, 2.5, 0.9, BRICK_D, -3.2, TOP - 0.4, (FRONT + BACK) / 2 - 0.6));
    g.add(b(1.2, 0.22, 1.1, ROOF_D, -3.2, TOP + 2.1, (FRONT + BACK) / 2 - 0.6));
    for (const cx of [-3.45, -3.0]) {
      g.add(b(0.24, 0.4, 0.24, 0x8a8078, cx, TOP + 2.32, (FRONT + BACK) / 2 - 0.6));
    }

    // a single-storey extension, so the house isn't one clean box
    const EX = HW + 0.2;
    g.add(b(3.4, 2.6, 5.4, RENDER, EX + 1.7, 0, -1.4));
    g.add(b(3.9, 0.28, 5.9, ROOF_D, EX + 1.7, 2.6, -1.4));
    g.add(b(1.0, 2.1, 0.14, 0x5c4030, EX + 1.7, 0, 1.35));          // its back door
    g.add(b(0.11, 0.11, 0.11, GOLD, EX + 2.05, 1.05, 1.45));
    g.add(b(1.2, 1.1, 0.12, GLASS, EX + 1.7, 1.2, -4.15));

    // the garden it stands in
    g.add(floor(17, 6.5, 0x6f9455, 0.02, 0, 7.2));
    g.add(b(4.0, 0.06, 4.6, PAVING, 0, 0.03, 6.2, { flat: true }));   // path to the door
    g.add(b(8.4, 0.7, 0.5, BRICK_D, 0, 0, 10.1));                     // low front wall
    g.add(b(8.6, 0.16, 0.66, TRIM, 0, 0.7, 10.1));
    for (const sx of [-1, 1]) {                                       // gate piers
      g.add(b(0.6, 1.3, 0.6, BRICK_D, sx * 2.1, 0, 10.1));
      g.add(b(0.74, 0.14, 0.74, TRIM, sx * 2.1, 1.3, 10.1));
    }
    fenceRun(g, -8.4, 10.1, -2.6, 10.1, { h: 1.1, color: 0x5f7a4a, step: 1.2 });
    fenceRun(g, 2.6, 10.1, 8.4, 10.1, { h: 1.1, color: 0x5f7a4a, step: 1.2 });
    for (let i = 0; i < 9; i++) {                                     // hedge along the side
      g.add(b(1.0, 1.2, 1.0, 0x3f6f45, -8.2, 0, 9.4 - i * 1.05));
    }
    for (const [tx, tz] of [[6.6, 8.0], [-6.8, 5.6]]) {               // a tree either side
      g.add(b(0.5, 2.2, 0.5, WOOD, tx, 0, tz));
      g.add(b(2.6, 1.8, 2.6, 0x3f7a44, tx, 2.0, tz));
      g.add(b(1.8, 1.2, 1.8, 0x4c8a53, tx, 3.4, tz));
    }
    for (const [fx2, fz2, c] of [[3.4, 8.6, PINK], [-3.6, 8.2, GOLD], [4.2, 6.4, 0xd8b0e0],
                                 [-4.4, 7.4, WHITE], [2.9, 9.6, PINK]]) {
      g.add(b(0.14, 0.4, 0.14, GREEN, fx2, 0, fz2));
      g.add(b(0.3, 0.24, 0.3, c, fx2, 0.4, fz2));
    }
  },

};

/**
 * Where the hero prop sits inside its set, in set-local space. Without this the
 * plate ends up under the table and the rackets end up inside the net.
 */
export const HERO_OFFSET = {
  'outside-the-club': [7.0, 0, 1.05],  // the lantern belongs in the smoking pen
  'kitchen-5am': [0.2, 1.04, -1.6],    // the mug goes on the worktop
  tennis: [-2.6, 0, 2.6],              // racket at the side, not through the net
  nandos: [0, 0.86, 0],                // the plate goes on the table
  badminton: [-3.4, 0, 1.3],           // racket and shuttle off court
  meteors: [0, 0.4, 0.6],              // the star hangs over the blanket
};

/**
 * How much flat ground each set needs — measured from the geometry, not
 * declared by hand. Hand-written radii go stale the moment a set grows: every
 * context added here pushed its set out past the terrace cut for it, and the
 * sets ended up standing on the slope they were supposed to be cut into.
 *
 * The footprint is a half-extent in the set's own space, so a street gets a
 * long terrace and a bedroom gets a small one instead of both getting a circle
 * big enough for the longer side.
 *
 * Padding: a couple of blocks of level ground beyond the geometry, so a set
 * ends at a verge rather than at a drop.
 */
const PAD = 2.5;
const _footprints = new Map();

export function setFootprint(id) {
  if (_footprints.has(id)) return _footprints.get(id);
  const g = makeSet(id);
  let fp = { halfX: 6, halfZ: 6 };
  if (g) {
    const box = new THREE.Box3().setFromObject(g);
    if (isFinite(box.min.x)) {
      fp = {
        halfX: Math.max(Math.abs(box.min.x), Math.abs(box.max.x)) + PAD,
        halfZ: Math.max(Math.abs(box.min.z), Math.abs(box.max.z)) + PAD,
      };
    }
    disposeDeep(g);
  }
  _footprints.set(id, fp);
  return fp;
}

function disposeDeep(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
}

// --- merging -------------------------------------------------------------

/**
 * Collapse a finished set into one mesh per colour.
 *
 * The sets are built a box at a time, which is the right way to write them and
 * the wrong way to draw them: eleven dressed sets came to about 1250 separate
 * meshes, and a draw call each is what a browser spends its frame on. Nothing
 * in a set moves or changes colour, so they can all be baked into a handful of
 * merged geometries. Boxes are bucketed by colour, emissive and whether they
 * cast a shadow, so the result looks identical.
 */
export function mergeFlat(root) {
  root.updateMatrixWorld(true);

  const buckets = new Map();
  const keep = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry, m = o.material;
    // Anything unusual — no index, several materials, a texture — is left as
    // it is rather than quietly mangled.
    if (!g.index || Array.isArray(m) || !m.color || m.map || m.transparent) {
      keep.push(o);
      return;
    }
    const key = `${m.color.getHex()}|${m.emissive ? m.emissive.getHex() : 0}` +
                `|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { proto: o, parts: [] };
      buckets.set(key, bucket);
    }
    bucket.parts.push(o);
  });
  if (buckets.size === 0) return root;

  const out = new THREE.Group();
  for (const o of keep) out.add(o);

  const normal = new THREE.Matrix3();
  const v = new THREE.Vector3();
  for (const { proto, parts } of buckets.values()) {
    let nVerts = 0, nIndex = 0;
    for (const o of parts) {
      nVerts += o.geometry.attributes.position.count;
      nIndex += o.geometry.index.count;
    }
    const pos = new Float32Array(nVerts * 3);
    const nor = new Float32Array(nVerts * 3);
    const idx = new Uint32Array(nIndex);
    let vo = 0, io = 0;

    for (const o of parts) {
      const g = o.geometry;
      const P = g.attributes.position, N = g.attributes.normal;
      normal.getNormalMatrix(o.matrixWorld);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld);
        pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
        v.fromBufferAttribute(N, i).applyMatrix3(normal).normalize();
        nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z;
      }
      const I = g.index;
      for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo;
      vo += P.count;
      io += I.count;
      g.dispose();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();

    const mesh = new THREE.Mesh(geo, proto.material);
    mesh.castShadow = proto.castShadow;
    mesh.receiveShadow = proto.receiveShadow;
    out.add(mesh);
  }
  return out;
}

/** Build the set for a memory id, or null if it has no dressing. */
export function makeSet(id) {
  const build = BUILDERS[id];
  const around = CONTEXT[id];
  if (!build && !around) return null;
  const g = new THREE.Group();
  if (around) around(g);     // the world it stands in, drawn first
  if (build) build(g);       // then the set itself
  return mergeFlat(g);
}
