import { B, Grid } from './voxel.js';
import { MEMORIES } from './memories.js';
import { setFootprint } from './sets.js';

export const SX = 224, SY = 40, SZ = 224;
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

// --- oriented set footprints --------------------------------------------
// A set is a rectangle, not a circle: the club is a street and the bedroom is
// a room. Terraces, spacing and tree clearance all work in the set's own
// space, so each one is cut to the shape it actually is.

/** World offset (dx, dz) expressed in the set's own axes. */
function toLocal(site, dx, dz) {
  const c = Math.cos(site.facing), sn = Math.sin(site.facing);
  return [dx * c - dz * sn, dx * sn + dz * c];
}

/** How far outside a site's footprint a world point falls; 0 means inside. */
function boxDist(site, x, z) {
  const [lx, lz] = toLocal(site, x - site.x, z - site.z);
  const qx = Math.max(Math.abs(lx) - site.halfX, 0);
  const qz = Math.max(Math.abs(lz) - site.halfZ, 0);
  return Math.hypot(qx, qz);
}

/**
 * Clearance between two footprints, by the separating-axis theorem on their
 * four edge normals. Positive is a real gap; negative means they overlap.
 *
 * Two boxes are apart as soon as *one* axis separates them, so this is the
 * widest gap over the four, not the narrowest. Taking the narrowest reports
 * every pair as deeply overlapping — including sets at opposite ends of the
 * island — which silently switches the whole spacing rule off.
 */
function boxGap(a, b) {
  let widest = -Infinity;
  for (const box of [a, b]) {
    const c = Math.cos(box.facing), sn = Math.sin(box.facing);
    for (const [ux, uz] of [[c, -sn], [sn, c]]) {
      const centre = Math.abs((b.x - a.x) * ux + (b.z - a.z) * uz);
      widest = Math.max(widest, centre - extentOn(a, ux, uz) - extentOn(b, ux, uz));
    }
  }
  return widest;
}

/** Half-width of a footprint projected onto a unit world axis. */
function extentOn(box, ux, uz) {
  const c = Math.cos(box.facing), sn = Math.sin(box.facing);
  return box.halfX * Math.abs(c * ux - sn * uz) +
         box.halfZ * Math.abs(sn * ux + c * uz);
}

/** Distance from a site's centre out to its footprint edge along an angle. */
function edgeRadius(site, ang) {
  const [ux, uz] = toLocal(site, Math.cos(ang), Math.sin(ang));
  return 1 / Math.max(Math.abs(ux) / site.halfX, Math.abs(uz) / site.halfZ);
}

// --- the path she walks -------------------------------------------------
// Waypoints trace a loop through the zones and end at the lookout hill.
const WAYPOINTS = [
  [39, 168], [53, 137], [81, 130], [102, 147], [126, 140],
  [147, 116], [133, 91], [105, 81], [81, 88], [67, 67],
  [91, 49], [119, 42], [144, 53], [165, 70], [175, 95],
];
export const SPAWN = { x: 39, z: 168 };
export const LOOKOUT = { x: 175, z: 95 };

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
      const n = fbm(x / 74, z / 74, 1337, 4);
      const ridge = fbm(x / 26, z / 26, 99, 3) * 0.25;
      const d = Math.hypot(x - cx, z - cz) / (SX * 0.46);
      const falloff = Math.max(0, 1 - Math.pow(d, 3.2));
      let h = Math.round((n * 0.75 + ridge) * 22 * falloff + 3);

      // The lookout is a mesa, not a gentle hill. The sides rise several
      // blocks per step, which auto-step can't climb — so the carved path is
      // the only way up, which is what gives the gate something to guard.
      const dl = Math.hypot(x - LOOKOUT.x, z - LOOKOUT.z);
      if (dl < 29) h += Math.round(14 * Math.max(0, Math.min(1, (29 - dl) / 6)));

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
    if (Math.hypot(path[i][0] - LOOKOUT.x, path[i][1] - LOOKOUT.z) < 30) {
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
  const sites = new Array(MEMORIES.length);
  const placed = [];

  // Biggest first. The sweep only knows about sets already placed, so if a
  // small one takes the one wide shelf on that side of the path, the street
  // that needed it has nowhere left to go.
  const order = MEMORIES.map((m, i) => i).sort((a, b) => {
    const fa = setFootprint(MEMORIES[a].id), fb = setFootprint(MEMORIES[b].id);
    return fb.halfX * fb.halfZ - fa.halfX * fa.halfZ;
  });

  for (const i of order) {
    // The footprint comes from the set's own geometry. A street wants a long
    // terrace and a bedroom a small one; giving both a circle big enough for
    // the longer side is what made the sets crowd each other off the island.
    const fp = setFootprint(MEMORIES[i].id);
    const radius = Math.max(fp.halfX, fp.halfZ);   // coarse bound, for reach
    let best = null;

    /**
     * Candidates around one point on the path, sweeping a fan either side of
     * it rather than straight out. Where the path loops back on itself both
     * perpendiculars can be blocked, and a wider search finds the shoulder
     * that isn't.
     */
    const sweepFrom = (pi, range, margin, clear, compromised) => {
      const [px, pz] = path[pi];
      const [ax, az] = path[Math.min(path.length - 1, pi + 5)];
      const tx = ax - px, tz = az - pz;
      const tl = Math.hypot(tx, tz) || 1;
      const perpX = -tz / tl, perpZ = tx / tl;      // across the path

      for (const side of [1, -1]) {
        for (let sweep = -50; sweep <= 50; sweep += 12.5) {
          const a = (sweep * Math.PI) / 180;
          const dirX = perpX * side * Math.cos(a) + (tx / tl) * Math.sin(a);
          const dirZ = perpZ * side * Math.cos(a) + (tz / tl) * Math.sin(a);

          for (let d = radius * 0.95; d <= radius * range; d += 1.2) {
            const cx = Math.round(px + dirX * d);
            const cz = Math.round(pz + dirZ * d);
            if (cx - radius < 1 || cz - radius < 1) continue;
            if (cx + radius >= SX - 1 || cz + radius >= SZ - 1) continue;

            const h = height[cx + cz * SX];
            if (h <= SEA + 1) continue;               // not in the water
            if (h > 24) continue;                     // not up the mesa

            // The path may not run through the footprint — she'd be walking
            // through the middle of the set. Running close alongside it is
            // only a preference: a set right on the verge is cramped, but it
            // beats one shoved somewhere the island has no room for at all.
            const facing = Math.atan2(px - cx, pz - cz);
            const cf = Math.cos(facing), sf = Math.sin(facing);
            const VERGE = 5;
            let onPath = 0, alongPath = 0;
            for (let lz = -fp.halfZ - VERGE; lz <= fp.halfZ + VERGE; lz += 2) {
              for (let lx = -fp.halfX - VERGE; lx <= fp.halfX + VERGE; lx += 2) {
                const qx = Math.round(cx + lx * cf + lz * sf);
                const qz = Math.round(cz - lx * sf + lz * cf);
                if (qx < 0 || qz < 0 || qx >= SX || qz >= SZ) continue;
                if (!pathMask[qx + qz * SX]) continue;
                if (Math.abs(lx) <= fp.halfX && Math.abs(lz) <= fp.halfZ) onPath++;
                else alongPath++;
              }
            }

            const cand = {
              x: cx, z: cz, facing, halfX: fp.halfX, halfZ: fp.halfZ, radius, pi,
            };

            let score = -roughness(cx, cz, Math.round(radius * 0.6)) * 3;
            score -= Math.abs(d - radius * 1.15) * 1.4;   // sit about a radius out
            score -= Math.abs(sweep) * 0.02;              // prefer square to the path
            // Two sets close enough to overlap read as one confused place —
            // and worse, the second terrace cuts a cliff through the first —
            // so separation is a requirement rather than a preference. The
            // test is between the real oriented footprints, not bounding
            // circles: two long sets end to end are fine, side by side aren't.
            let crowded = false, squeeze = 0;
            for (const other of placed) {
              const slack = boxGap(cand, other);
              if (slack < 8) squeeze += (8 - slack) * 8;
              if (slack < margin) crowded = true;
            }
            score -= squeeze + alongPath * 2.5;

            cand.score = score;
            if (onPath === 0 && !crowded) clear.push(cand);
            else {
              cand.score -= onPath * 10 + (crowded ? 60 : 0);
              compromised.push(cand);
            }
          }
        }
      }
    };

    // Passes, widening only as far as they have to. A set that finds room
    // beside its own stretch of path should stay there; when it can't, it
    // slides *along* the path before it wanders away from it, because the
    // island has far more room lengthways than it does out to the sides. The
    // last resort is walking further from the path. Each pass stops the
    // moment it turns up clear ground.
    const base = anchorIndex(i);
    const slide = (n) => Math.max(2, Math.min(path.length - 2, base + n));
    // `margin` is the breathing space demanded between this set and its
    // neighbours. It relaxes to nothing before the search gives up, because
    // two verges meeting is a far smaller problem than two terraces cut
    // through each other — which leaves a cliff standing in both sets.
    const PASSES = [
      { offsets: [0], range: 1.8, margin: 6 },
      { offsets: [0, 10, -10, 20, -20], range: 1.9, margin: 6 },
      { offsets: [0, 14, -14, 28, -28, 42, -42], range: 2.4, margin: 4 },
      { offsets: [0, 12, -12, 24, -24, 36, -36, 48, -48], range: 3.0, margin: 1 },
    ];

    let fallbackAnchor = base;
    for (const pass of PASSES) {
      const clear = [];       // candidates with no path inside the footprint
      const compromised = []; // everything else, in case nothing is clear
      for (const off of pass.offsets) {
        sweepFrom(slide(off), pass.range, pass.margin, clear, compromised);
      }

      const pool = clear.length ? clear : compromised;
      for (const c of pool) if (!best || c.score > best.score) best = c;
      if (clear.length) break;
      best = null;            // a compromised winner only stands if nothing better turns up
      if (pool.length) fallbackAnchor = pool.reduce((a, b) => (b.score > a.score ? b : a)).pi;
      if (pass === PASSES[PASSES.length - 1]) {
        for (const c of compromised) if (!best || c.score > best.score) best = c;
      }
    }

    // If nowhere scored at all (edge of the map, all sea), fall back to the
    // old fixed offset rather than dropping a memory entirely.
    const anchor = path[best ? best.pi : fallbackAnchor];
    if (!best) {
      const bx = Math.round(anchor[0]) - 3, bz = Math.round(anchor[1]) - 3;
      best = {
        x: bx, z: bz, radius, halfX: fp.halfX, halfZ: fp.halfZ, score: 0,
        facing: Math.atan2(anchor[0] - bx, anchor[1] - bz), pi: fallbackAnchor,
      };
    }
    best.anchor = best.pi;
    sites[i] = best;
    placed.push(best);
  }

  // Cut a terrace for each — the shape of the set, not a circle around it, so
  // the whole footprint is level and nothing hangs over a drop. Beyond the
  // footprint the ground eases back into the hillside over a shoulder whose
  // width wobbles with the angle, so it reads as a natural bench in the slope
  // rather than a plateau stamped on top of one.
  //
  // setMask holds site index + 1, not a flag: terraces are cut one after
  // another, and without knowing who owns a cell a later site's eased rim
  // erodes an earlier site's level ground — which is a slope under a floor.
  const setMask = new Uint8Array(SX * SZ);
  const RIM = 6;              // how far the terrace eases back into the slope
  for (let si = 0; si < sites.length; si++) {
    const site = sites[si];
    const own = si + 1;
    const reach = Math.ceil(Math.hypot(site.halfX, site.halfZ) + RIM + 2);

    // Where the path runs alongside a set, cut the terrace to the *path's*
    // height rather than the hillside's. The path can't be re-levelled — it's
    // the only route to the gate — so the alternative is a ramp easing down
    // to it, and that ramp runs several blocks inward, under the set. Sitting
    // flush with the path means there is nothing to ease.
    let target = height[site.x + site.z * SX];
    let nearestPath = Infinity;
    for (let dz = -reach; dz <= reach; dz++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = site.x + dx, z = site.z + dz;
        if (x < 0 || z < 0 || x >= SX || z >= SZ) continue;
        if (!pathMask[x + z * SX]) continue;
        const d = boxDist(site, x, z);
        if (d < nearestPath) { nearestPath = d; target = height[x + z * SX]; }
      }
    }
    if (nearestPath > RIM) target = height[site.x + site.z * SX];
    for (let dz = -reach; dz <= reach; dz++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = site.x + dx, z = site.z + dz;
        if (x < 0 || z < 0 || x >= SX || z >= SZ) continue;

        const outside = boxDist(site, x, z);
        const ang = Math.atan2(dz, dx);
        const rim = RIM * (0.72 + 0.56 * noise2(Math.cos(ang) * 1.7 + 8,
                                                Math.sin(ang) * 1.7 + 8, 606));
        if (outside > rim) continue;

        const w = outside <= 0 ? 1 : smooth(1 - outside / rim);
        const k = x + z * SX;
        // Leave the path exactly as carved — it is the only way to the gate.
        if (pathMask[k]) continue;
        // A rim never eats into another set's level ground.
        if (setMask[k] && setMask[k] !== own && w < 1) continue;
        height[k] = Math.round(height[k] * (1 - w) + target * w);
        if (outside <= 0 && !setMask[k]) setMask[k] = own;
      }
    }
  }

  // A worn track from the path to each set. Without one they read as things
  // dropped on the island rather than places anyone ever walked to.
  // Wide enough to read as a turning off the path rather than as a worn line
  // in the grass. Getting lost was the complaint, and a spur you have to look
  // for is the same as no spur at all.
  const spurMask = new Uint8Array(SX * SZ);
  const junctions = [];
  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    const pi = site.anchor ?? anchorIndex(i);
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
      const lip = ds - boxDist(site, cx, cz);   // where the terrace edge is
      let h;
      if (ds <= lip) h = toH;
      else {
        const u = Math.max(0, Math.min(1, (outer - ds) / Math.max(1, outer - lip)));
        h = Math.round(fromH + (toH - fromH) * smooth(u));
      }
      // The mouth is flared: wide where it meets the main path, narrowing as
      // it goes, so from the path it reads as an opening rather than a seam.
      const flare = 1 + (1 - Math.min(1, t * 3.2)) * 1.4;
      const tread = 2.1 * flare, edge = tread + 1.1;
      const reach = Math.ceil(edge);
      for (let dz = -reach; dz <= reach; dz++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const x = cx + dx, z = cz + dz;
          if (x < 0 || z < 0 || x >= SX || z >= SZ) continue;
          const d = Math.hypot(dx, dz);
          if (d > edge) continue;
          const k = x + z * SX;
          if (pathMask[k]) continue;
          // Nor does one set's approach track gouge a channel across another's.
          if (setMask[k] && setMask[k] !== i + 1) continue;
          if (d <= tread) { height[k] = h; spurMask[k] = 1; }
          else height[k] = Math.round(height[k] * 0.45 + h * 0.55);
        }
      }
    }

    // Where this spur leaves the main path, and which way it goes — a
    // signpost stands here.
    const jdx = (site.x - px), jdz = (site.z - pz);
    const jl = Math.hypot(jdx, jdz) || 1;
    const ux = jdx / jl, uz = jdz / jl;
    junctions.push({
      id: MEMORIES[i].id,
      // A little way up the spur and off to one side of it, so it's the first
      // thing you see when you turn off — and not something you walk through.
      x: Math.round(px + ux * 5.5 - uz * 4.5),
      z: Math.round(pz + uz * 5.5 + ux * 4.5),
      facing: Math.atan2(ux, uz),
    });
  }

  // Where a terrace runs up against the path, ease between the two rather than
  // leaving a step. The path can't be re-levelled — it's the route to the gate
  // — so the terrace has to be the one that gives way at the join.
  for (let z = 1; z < SZ - 1; z++) {
    for (let x = 1; x < SX - 1; x++) {
      const k = x + z * SX;
      if (!setMask[k] || pathMask[k]) continue;
      // Only the verge gives way, never the ground the set stands on.
      if (boxDist(sites[setMask[k] - 1], x, z) <= 0) continue;

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
      if (sites.some((st) => boxDist(st, x, z) < 2)) continue;
      // Keep the camera's first view clear — a tree at spawn fills the screen.
      const nearSpawn = Math.hypot(x - SPAWN.x, z - SPAWN.z) < 9;
      // And keep the mesa bare. The last shot of the game looks out over the
      // island from the bench, and a pine on the shoulder of the hill stands
      // right in front of it. The bald top is also what makes the lookout read
      // as a lookout from down on the path.
      if (Math.hypot(x - LOOKOUT.x, z - LOOKOUT.z) < 34) continue;
      const r = hash2(x, z, 4242);
      const density = fbm(x / 49, z / 49, 777, 2);
      if (r > 0.9715 - density * 0.018) {
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
    // Scale the dressing to the perimeter, so a long set gets a long verge.
    const count = Math.round((site.halfX + site.halfZ) * 7);
    for (let n = 0; n < count; n++) {
      const r1 = hash2(i * 977 + n, n * 31 + 7, 5150);
      const r2 = hash2(n * 53 + 3, i * 611 + n, 8801);
      const r3 = hash2(i + n * 17, n * 7 + i * 3, 2027);

      const ang = r1 * Math.PI * 2;
      // a band hugging the lip, mostly just outside the level ground — which
      // follows the shape of the terrace rather than a circle around it
      const R = edgeRadius(site, ang);
      const dist = R * (0.94 + r2 * 0.5);
      const x = Math.round(site.x + Math.cos(ang) * dist);
      const z = Math.round(site.z + Math.sin(ang) * dist);
      if (x < 1 || z < 1 || x >= SX - 1 || z >= SZ - 1) continue;

      const k = x + z * SX;
      if (pathMask[k] || spurMask[k]) continue;      // not on anything walked
      const h = height[k];
      if (h <= SEA + 1) continue;

      // rocks cluster on the cut edge, greenery spreads further out
      const onLip = dist < R * 1.12;
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

  // Which way the path leaves the beach. The opening shot is framed from this
  // rather than from a fixed angle — move the waypoints and the camera still
  // starts behind her looking inland, instead of out to sea.
  const heading = (() => {
    const [x0, z0] = path[0], [x1, z1] = path[Math.min(10, path.length - 1)];
    const l = Math.hypot(x1 - x0, z1 - z0) || 1;
    return { x: (x1 - x0) / l, z: (z1 - z0) / l };
  })();

  return {
    grid, height, pathMask, spurMask, lamps, nodes, flowers, trees, decor, gate,
    junctions, spawn: SPAWN, lookout: LOOKOUT, heading,
  };
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
