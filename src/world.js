import { B, Grid } from './voxel.js';
import { MEMORIES } from './memories.js';

export const SX = 128, SY = 40, SZ = 128;
export const SEA = 6;

// --- deterministic value noise -----------------------------------------
function hash2(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function smooth(t) { return t * t * (3 - 2 * t); }
function noise2(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash2(xi, yi, seed),     b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return (a * (1 - xf) + b * xf) * (1 - yf) + (c * (1 - xf) + d * xf) * yf;
}
function fbm(x, y, seed, octaves = 4) {
  let v = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += noise2(x * freq, y * freq, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5; freq *= 2;
  }
  return v / norm;
}

// --- the path she walks -------------------------------------------------
// Waypoints trace a loop through the zones and end at the lookout hill.
const WAYPOINTS = [
  [22, 96], [30, 78], [46, 74], [58, 84], [72, 80],
  [84, 66], [76, 52], [60, 46], [46, 50], [38, 38],
  [52, 28], [68, 24], [82, 30], [94, 40], [100, 54],
];
export const SPAWN = { x: 22, z: 96 };
export const LOOKOUT = { x: 100, z: 54 };

function pathPoints() {
  const pts = [];
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const [x0, z0] = WAYPOINTS[i], [x1, z1] = WAYPOINTS[i + 1];
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 2);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      pts.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]);
    }
  }
  pts.push(WAYPOINTS[WAYPOINTS.length - 1]);
  return pts;
}

export function generate() {
  const grid = new Grid(SX, SY, SZ);
  const cx = SX / 2, cz = SZ / 2;

  // Heightmap: rolling terrain, falling away to water at the edges so the
  // world reads as an island and she never walks into an invisible wall.
  const height = new Int16Array(SX * SZ);
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      const n = fbm(x / 42, z / 42, 1337, 4);
      const ridge = fbm(x / 15, z / 15, 99, 3) * 0.25;
      const d = Math.hypot(x - cx, z - cz) / (SX * 0.46);
      const falloff = Math.max(0, 1 - Math.pow(d, 3.2));
      let h = Math.round((n * 0.75 + ridge) * 22 * falloff + 3);

      // The lookout is a mesa, not a gentle hill. The sides rise several
      // blocks per step, which auto-step can't climb — so the carved path is
      // the only way up, which is what gives the gate something to guard.
      const dl = Math.hypot(x - LOOKOUT.x, z - LOOKOUT.z);
      if (dl < 17) h += Math.round(14 * Math.max(0, Math.min(1, (17 - dl) / 3.5)));

      height[x + z * SX] = Math.max(1, Math.min(SY - 8, h));
    }
  }

  // Flatten a corridor under the path so she never has to fight the terrain.
  const path = pathPoints();

  // Limit how fast the path may rise or fall. Without this the ramp up the
  // mesa would be a cliff and she'd simply be stuck at the bottom.
  const pathH = path.map(([px, pz]) => height[Math.round(px) + Math.round(pz) * SX]);
  for (let i = 1; i < pathH.length; i++) {
    pathH[i] = Math.min(pathH[i], pathH[i - 1] + 0.5);
  }
  for (let i = pathH.length - 2; i >= 0; i--) {
    pathH[i] = Math.min(pathH[i], pathH[i + 1] + 0.5);
  }

  const pathMask = new Uint8Array(SX * SZ);
  for (let pi = 0; pi < path.length; pi++) {
    const [px, pz] = path[pi];
    const h = Math.round(pathH[pi]);
    for (let dz = -4; dz <= 4; dz++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = Math.round(px) + dx, z = Math.round(pz) + dz;
        if (x < 0 || z < 0 || x >= SX || z >= SZ) continue;
        const dist = Math.hypot(dx, dz);
        if (dist > 4) continue;
        const i = x + z * SX;
        if (dist <= 2.2) {
          // The tread itself is flat — a partial blend here leaves steps the
          // slope limiter already ruled out.
          height[i] = h;
          pathMask[i] = 1;
        } else {
          const blend = Math.max(0, 1 - dist / 4);
          height[i] = Math.round(height[i] * (1 - blend * 0.85) + h * blend * 0.85);
        }
      }
    }
  }

  // Fill columns.
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      const i = x + z * SX;
      const h = height[i];
      for (let y = 0; y <= h; y++) {
        let id;
        if (y < h - 3) id = B.STONE;
        else if (y < h) id = B.DIRT;
        else if (h <= SEA) id = B.SAND;
        else if (h > 34) id = B.SNOW;
        else id = pathMask[i] ? B.PATH : B.GRASS;
        grid.set(x, y, z, id);
      }
      for (let y = h + 1; y <= SEA; y++) grid.set(x, y, z, B.WATER);
    }
  }

  // Scatter trees and flowers away from the path. Flowers come back as
  // positions, not blocks — a full-size cube flower looks like chewing gum.
  const flowers = [];
  // Trees go into the grid (which is what gives them collision) and are also
  // recorded, so the low-poly renderer can draw real trees at the same spots.
  const trees = [];
  for (let z = 2; z < SZ - 2; z++) {
    for (let x = 2; x < SX - 2; x++) {
      const i = x + z * SX;
      const h = height[i];
      if (h <= SEA + 1 || h > 26 || pathMask[i]) continue;
      // Keep the camera's first view clear — a tree at spawn fills the screen.
      const nearSpawn = Math.hypot(x - SPAWN.x, z - SPAWN.z) < 9;
      const r = hash2(x, z, 4242);
      const density = fbm(x / 28, z / 28, 777, 2);
      if (r > 0.985 - density * 0.02) {
        if (nearSpawn || nearPath(pathMask, x, z, 4)) continue;
        const seed = hash2(x, z, 99);
        tree(grid, x, h + 1, z, seed);
        trees.push({ x: x + 0.5, y: h + 1, z: z + 0.5, seed });
      } else if (r < 0.014) {
        flowers.push({ x: x + 0.5, y: h + 1, z: z + 0.5, tint: hash2(x, z, 8) });
      }
    }
  }

  // Lamp posts along the path. These are props rather than blocks: a
  // full-block post is a metre thick and reads as a slab, not a lamp.
  const lamps = [];
  for (let i = 12; i < path.length - 6; i += 26) {
    const [px, pz] = path[i];
    const x = Math.round(px) + 3, z = Math.round(pz) + 3;
    const h = grid.columnTop(x, z);
    if (h < SEA) continue;
    // Keep the top clear: a lamp near the bench stands right in the final shot.
    if (Math.hypot(x - LOOKOUT.x, z - LOOKOUT.z) < 22) continue;
    lamps.push({ x: x + 0.5, y: h + 1, z: z + 0.5 });
  }

  // The gate sits at the foot of the ramp, where the path starts climbing
  // toward the mesa. Everything either side of it is cliff.
  let gateIndex = path.length - 1;
  for (let i = 0; i < path.length; i++) {
    if (Math.hypot(path[i][0] - LOOKOUT.x, path[i][1] - LOOKOUT.z) < 17.5) {
      gateIndex = i;
      break;
    }
  }
  const [gxf, gzf] = path[gateIndex];
  const [axf, azf] = path[Math.min(path.length - 1, gateIndex + 6)];
  const gate = {
    x: Math.round(gxf) + 0.5,
    z: Math.round(gzf) + 0.5,
    y: Math.round(pathH[gateIndex]) + 1,
    facing: Math.atan2(axf - gxf, azf - gzf),
  };

  // A little pier at the spawn beach, so the start reads as a place.
  pier(grid, SPAWN.x - 6, SPAWN.z + 4);

  // Anchor each memory to real ground.
  const usable = gateIndex - 6;
  const nodes = MEMORIES.map((m, i) => {
    const anchor = path[Math.max(4, Math.round(8 + i * ((usable - 8) / MEMORIES.length)))];
    const x = Math.round(anchor[0]) - 3;
    const z = Math.round(anchor[1]) - 3;
    const h = grid.columnTop(x, z);
    const y = Math.max(h + 1, SEA + 1);
    // A small plinth so the object never looks like it is floating.
    grid.set(x, y - 1, z, B.PLANK);
    return { ...m, x: x + 0.5, y, z: z + 0.5, found: false };
  });

  return { grid, height, pathMask, lamps, nodes, flowers, trees, gate, spawn: SPAWN, lookout: LOOKOUT };
}

function nearPath(mask, x, z, r) {
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= SX || nz >= SZ) continue;
      if (mask[nx + nz * SX]) return true;
    }
  }
  return false;
}

function tree(grid, x, y, z, r) {
  const trunk = 3 + Math.floor(r * 3);
  for (let i = 0; i < trunk; i++) grid.set(x, y + i, z, B.WOOD);
  const top = y + trunk;
  const rad = r > 0.5 ? 2 : 1;
  for (let dy = -1; dy <= 1; dy++) {
    const rr = dy === 1 ? rad - 1 : rad;
    for (let dz = -rr; dz <= rr; dz++) {
      for (let dx = -rr; dx <= rr; dx++) {
        if (Math.abs(dx) === rr && Math.abs(dz) === rr && rr > 1) continue;
        if (dx === 0 && dz === 0 && dy < 1) continue;
        grid.set(x + dx, top + dy, z + dz, B.LEAF);
      }
    }
  }
  grid.set(x, top + 1, z, B.LEAF);
}

function pier(grid, x0, z0) {
  for (let i = 0; i < 10; i++) {
    for (let dz = 0; dz < 3; dz++) {
      grid.set(x0 - i, SEA + 1, z0 + dz, B.PLANK);
    }
    if (i % 3 === 0) {
      for (let y = 1; y <= SEA; y++) {
        grid.set(x0 - i, y, z0, B.POST);
        grid.set(x0 - i, y, z0 + 2, B.POST);
      }
    }
  }
}
