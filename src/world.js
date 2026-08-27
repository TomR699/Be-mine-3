import { B, Grid } from './voxel.js';
import { MEMORIES } from './memories.js';
import { SET_RADIUS } from './sets.js';

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

  // Where the gate goes. Needed early, because the checkpoints are placed
  // relative to it and the terrain is cut for them before columns are filled.
  let gateIndex = path.length - 1;
  for (let i = 0; i < path.length; i++) {
    if (Math.hypot(path[i][0] - LOOKOUT.x, path[i][1] - LOOKOUT.z) < 17.5) {
      gateIndex = i;
      break;
    }
  }

  const usable = gateIndex - 6;
  const anchorIndex = (i) =>
    Math.max(4, Math.round(8 + i * ((usable - 8) / MEMORIES.length)));

  // How uneven is the ground here? Sites are chosen by looking for somewhere
  // the island is already flattish, rather than bulldozing wherever we land.
  function roughness(cx, cz, r) {
    let lo = Infinity, hi = -Infinity;
    for (let dz = -r; dz <= r; dz += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        const x = cx + dx, z = cz + dz;
        if (x < 0 || z < 0 || x >= SX || z >= SZ) return 99;
        const h = height[x + z * SX];
        if (h < lo) lo = h;
        if (h > hi) hi = h;
      }
    }
    return hi - lo;
  }

  /**
   * Pick a site for each checkpoint: out to one side of the path, on the
   * flattest ground within reach, not on top of another site and not in the
   * sea. The facing is then simply "back toward the path", so every set opens
   * to the direction she arrives from.
   */
  const sites = [];
  for (let i = 0; i < MEMORIES.length; i++) {
    const pi = anchorIndex(i);
    const [px, pz] = path[pi];
    const [ax, az] = path[Math.min(path.length - 1, pi + 5)];
    const tx = ax - px, tz = az - pz;
    const tl = Math.hypot(tx, tz) || 1;
    const perpX = -tz / tl, perpZ = tx / tl;      // across the path

    const radius = SET_RADIUS[MEMORIES[i].id] ?? 9;
    let best = null;
    const clear = [];       // candidates with no path inside the footprint
    const compromised = []; // everything else, in case nothing is clear

    // Sweep a fan either side of the path rather than just straight out from
    // it. Where the path loops back on itself the two perpendiculars can both
    // be blocked, and a wider search finds the shoulder that isn't.
    for (const side of [1, -1]) {
      for (let sweep = -50; sweep <= 50; sweep += 12.5) {
        const a = (sweep * Math.PI) / 180;
        const dirX = perpX * side * Math.cos(a) + (tx / tl) * Math.sin(a);
        const dirZ = perpZ * side * Math.cos(a) + (tz / tl) * Math.sin(a);

        for (let d = radius * 0.95; d <= radius * 1.45; d += 1.2) {
          const cx = Math.round(px + dirX * d);
          const cz = Math.round(pz + dirZ * d);
          if (cx - radius < 1 || cz - radius < 1) continue;
          if (cx + radius >= SX - 1 || cz + radius >= SZ - 1) continue;

          const h = height[cx + cz * SX];
          if (h <= SEA + 1) continue;               // not in the water
          if (h > 24) continue;                     // not up the mesa

          const rp = Math.round(radius);   // the whole footprint must be clear
          let onPath = 0;
          for (let dz = -rp; dz <= rp; dz += 2) {
            for (let dx = -rp; dx <= rp; dx += 2) {
              if (Math.hypot(dx, dz) > rp) continue;
              const qx = cx + dx, qz = cz + dz;
              if (qx < 0 || qz < 0 || qx >= SX || qz >= SZ) continue;
              if (pathMask[qx + qz * SX]) onPath++;
            }
          }

          let score = -roughness(cx, cz, Math.round(radius * 0.6)) * 3;
          score -= Math.abs(d - radius * 1.15) * 0.6;   // sit about a radius out
          score -= Math.abs(sweep) * 0.02;              // prefer square to the path
          for (const other of sites) {
            const gap = Math.hypot(cx - other.x, cz - other.z);
            const want = radius + other.radius + 6;
            if (gap < want) score -= (want - gap) * 8;
          }

          // Two sets close enough to overlap read as one confused place, so
          // separation is a requirement rather than a preference.
          const crowded = sites.some((o) =>
            Math.hypot(cx - o.x, cz - o.z) < radius + o.radius + 5);

          const cand = { x: cx, z: cz, radius, score };
          if (onPath === 0 && !crowded) clear.push(cand);
          else {
            cand.score -= onPath * 10 + (crowded ? 60 : 0);
            compromised.push(cand);
          }
        }
      }
    }

    const pool = clear.length ? clear : compromised;
    for (const c of pool) if (!best || c.score > best.score) best = c;

    // If nowhere scored (edge of the map, all sea), fall back to the old
    // fixed offset rather than dropping a memory entirely.
    if (!best) {
      best = { x: Math.round(px) - 3, z: Math.round(pz) - 3, radius, score: 0 };
    }
    best.facing = Math.atan2(px - best.x, pz - best.z);
    sites.push(best);
  }

  // Cut a terrace for each. The rim is eased rather than linear and its radius
  // wobbles with angle, so it reads as a natural shoulder in the hillside
  // instead of a circular plateau stamped on top of one.
  const setMask = new Uint8Array(SX * SZ);
  const RIM = 6;              // how far the terrace eases back into the slope
  for (const site of sites) {
    const target = height[site.x + site.z * SX];
    const R = site.radius;
    const reach = Math.ceil(R * 1.24 + RIM);
    for (let dz = -reach; dz <= reach; dz++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = site.x + dx, z = site.z + dz;
        if (x < 0 || z < 0 || x >= SX || z >= SZ) continue;

        const dist = Math.hypot(dx, dz);
        if (dist < 0.001) { height[x + z * SX] = target; continue; }

        // The whole declared radius is levelled, then the ground eases back
        // into the hillside beyond it. Flattening only part of the radius is
        // what left the floor slabs hanging out over the drop.
        const ang = Math.atan2(dz, dx);
        const wobble = 1.0 + 0.24 * noise2(Math.cos(ang) * 1.7 + 8,
                                           Math.sin(ang) * 1.7 + 8, 606);
        const flat = R * wobble;
        if (dist > flat + RIM) continue;

        const w = dist <= flat ? 1 : smooth(1 - (dist - flat) / RIM);
        const k = x + z * SX;
        // Leave the path exactly as carved — it is the only way to the gate.
        if (pathMask[k]) continue;
        height[k] = Math.round(height[k] * (1 - w) + target * w);
        if (dist <= flat) setMask[k] = 1;
      }
    }
  }

  // A worn track from the path to each set. Without one they read as things
  // dropped on the island rather than places anyone ever walked to.
  const spurMask = new Uint8Array(SX * SZ);
  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    const pi = anchorIndex(i);
    const [px, pz] = path[pi];
    const fromH = Math.round(pathH[pi]);
    const toH = height[site.x + site.z * SX];

    const outer = Math.hypot(site.x - px, site.z - pz);
    const steps = Math.ceil(outer * 2);
    for (let sIdx = 0; sIdx <= steps; sIdx++) {
      const t = sIdx / steps;
      const cx = Math.round(px + (site.x - px) * t);
      const cz = Math.round(pz + (site.z - pz) * t);

      // Climb between the path and the lip of the terrace, then run level.
      // Easing all the way to the centre instead drags the ramp across the
      // flat ground the set is standing on.
      const ds = Math.hypot(cx - site.x, cz - site.z);
      let h;
      if (ds <= site.radius) h = toH;
      else {
        const u = Math.max(0, Math.min(1,
          (outer - ds) / Math.max(1, outer - site.radius)));
        h = Math.round(fromH + (toH - fromH) * smooth(u));
      }
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const x = cx + dx, z = cz + dz;
          if (x < 0 || z < 0 || x >= SX || z >= SZ) continue;
          const d = Math.hypot(dx, dz);
          if (d > 2) continue;
          const k = x + z * SX;
          if (pathMask[k]) continue;
          if (d <= 1.3) { height[k] = h; spurMask[k] = 1; }
          else height[k] = Math.round(height[k] * 0.45 + h * 0.55);
        }
      }
    }
  }

  // Where a terrace runs up against the path, ease between the two rather than
  // leaving a step. The path can't be re-levelled — it's the route to the gate
  // — so the terrace has to be the one that gives way at the join.
  for (let z = 1; z < SZ - 1; z++) {
    for (let x = 1; x < SX - 1; x++) {
      const k = x + z * SX;
      if (!setMask[k] || pathMask[k]) continue;

      let nearest = -1, nearestH = 0;
      for (let dz = -3; dz <= 3; dz++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx, nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= SX || nz >= SZ) continue;
          if (!pathMask[nx + nz * SX]) continue;
          const d = Math.hypot(dx, dz);
          if (nearest < 0 || d < nearest) { nearest = d; nearestH = height[nx + nz * SX]; }
        }
      }
      if (nearest < 0) continue;

      const w = Math.max(0, 1 - nearest / 3.5) * 0.85;
      height[k] = Math.round(height[k] * (1 - w) + nearestH * w);
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
        else id = (pathMask[i] || spurMask[i]) ? B.PATH : B.GRASS;
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
      if (h <= SEA + 1 || h > 26 || pathMask[i] || setMask[i] || spurMask[i]) continue;
      if (sites.some((st) => Math.hypot(x - st.x, z - st.z) < st.radius + 1)) continue;
      // Keep the camera's first view clear — a tree at spawn fills the screen.
      const nearSpawn = Math.hypot(x - SPAWN.x, z - SPAWN.z) < 9;
      const r = hash2(x, z, 4242);
      const density = fbm(x / 28, z / 28, 777, 2);
      if (r > 0.9755 - density * 0.02) {
        if (nearSpawn || nearPath(pathMask, x, z, 4)) continue;
        const seed = hash2(x, z, 99);
        tree(grid, x, h + 1, z, seed);
        trees.push({ x: x + 0.5, y: h + 1, z: z + 0.5, seed });
      } else if (r < 0.014) {
        flowers.push({ x: x + 0.5, y: h + 1, z: z + 0.5, tint: hash2(x, z, 8) });
      }
    }
  }

  // Dress the rim of each terrace: boulders, bushes and grass along the lip
  // where the cut meets the hillside. This is what stops a set reading as an
  // object placed on the island rather than a part of it.
  const decor = [];
  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    const R = site.radius;
    const count = Math.round(R * 7);
    for (let n = 0; n < count; n++) {
      const r1 = hash2(i * 977 + n, n * 31 + 7, 5150);
      const r2 = hash2(n * 53 + 3, i * 611 + n, 8801);
      const r3 = hash2(i + n * 17, n * 7 + i * 3, 2027);

      const ang = r1 * Math.PI * 2;
      // an annulus hugging the lip, mostly just outside the level ground
      const dist = R * (0.86 + r2 * 0.55);
      const x = Math.round(site.x + Math.cos(ang) * dist);
      const z = Math.round(site.z + Math.sin(ang) * dist);
      if (x < 1 || z < 1 || x >= SX - 1 || z >= SZ - 1) continue;

      const k = x + z * SX;
      if (pathMask[k] || spurMask[k]) continue;      // not on anything walked
      const h = height[k];
      if (h <= SEA + 1) continue;

      // rocks cluster on the cut edge, greenery spreads further out
      const onLip = dist < R * 1.06;
      const kind = r3 < (onLip ? 0.42 : 0.12) ? 'rock' : (r3 < 0.62 ? 'bush' : 'tuft');
      decor.push({
        x: x + 0.5, y: h + 1, z: z + 0.5, kind,
        scale: 0.6 + r2 * 0.9, seed: r3,
      });
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

  // Anchor each memory to the terrace cut for it.
  const nodes = MEMORIES.map((m, i) => {
    const { x, z, facing } = sites[i];
    const h = grid.columnTop(x, z);
    const y = Math.max(h + 1, SEA + 1);
    // A small plinth so the object never looks like it is floating.
    grid.set(x, y - 1, z, B.PLANK);
    return { ...m, x: x + 0.5, y, z: z + 0.5, facing, found: false };
  });

  return { grid, height, pathMask, spurMask, lamps, nodes, flowers, trees, decor, gate, spawn: SPAWN, lookout: LOOKOUT };
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
