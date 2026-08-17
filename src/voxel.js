import * as THREE from 'three';

// Block ids. AIR must stay 0.
export const B = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  WOOD: 6,
  LEAF: 7,
  PATH: 8,
  PLANK: 9,
  POST: 10,
  LAMP_OFF: 11,
  LAMP_ON: 12,
  FLOWER: 13,
  ROOF: 14,
  SNOW: 15,
};

export const COLORS = {
  [B.GRASS]:    0x6aa04f,
  [B.DIRT]:     0x6b4f36,
  [B.STONE]:    0x8a8698,
  [B.SAND]:     0xd9c68d,
  [B.WATER]:    0x3f7fa8,
  [B.WOOD]:     0x7d5a3e,
  [B.LEAF]:     0x4c8a53,
  [B.PATH]:     0xb0996f,
  [B.PLANK]:    0x9a6f45,
  [B.POST]:     0x4a4258,
  [B.LAMP_OFF]: 0x6e6684,
  [B.LAMP_ON]:  0xffd98a,
  [B.FLOWER]:   0xd45a7a,
  [B.ROOF]:     0x9c4a52,
  [B.SNOW]:     0xe8eef5,
};

// Blocks you can walk through.
export const PASSABLE = new Set([B.AIR, B.WATER, B.FLOWER]);
// Blocks that glow — excluded from shading so lamps read as light sources.
export const EMISSIVE = new Set([B.LAMP_ON]);

export function isPassable(id) { return PASSABLE.has(id); }

export class Grid {
  constructor(sx, sy, sz) {
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.data = new Uint8Array(sx * sy * sz);
  }
  idx(x, y, z) { return x + z * this.sx + y * this.sx * this.sz; }
  inBounds(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz;
  }
  get(x, y, z) {
    x |= 0; y |= 0; z |= 0;
    if (!this.inBounds(x, y, z)) return B.AIR;
    return this.data[this.idx(x, y, z)];
  }
  set(x, y, z, v) {
    x |= 0; y |= 0; z |= 0;
    if (!this.inBounds(x, y, z)) return;
    this.data[this.idx(x, y, z)] = v;
  }
  // Highest non-air block at a column, or -1.
  columnTop(x, z) {
    for (let y = this.sy - 1; y >= 0; y--) {
      const v = this.get(x, y, z);
      if (v !== B.AIR && v !== B.WATER) return y;
    }
    return -1;
  }
}

// Face order: +X, -X, +Y, -Y, +Z, -Z. Corners wound CCW seen from outside.
// Side shading is deliberately shallow: the directional light already darkens
// these faces, and stacking both crushes anything in shadow to black.
const FACES = [
  { dir: [1, 0, 0],  corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], shade: 0.86 },
  { dir: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], shade: 0.80 },
  { dir: [0, 1, 0],  corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], shade: 1.00 },
  { dir: [0, -1, 0], corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]], shade: 0.62 },
  { dir: [0, 0, 1],  corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], shade: 0.94 },
  { dir: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], shade: 0.76 },
];

/**
 * Build one merged mesh for all opaque blocks and one for water.
 * Only faces touching air (or a transparent block) are emitted, so the
 * interior of the terrain costs nothing.
 */
export function buildMeshes(grid) {
  const opaque = { pos: [], norm: [], col: [], idx: [] };
  const water = { pos: [], norm: [], col: [], idx: [] };
  const c = new THREE.Color();

  const emit = (target, x, y, z, face, id, shade) => {
    const base = target.pos.length / 3;
    c.setHex(COLORS[id] ?? 0xff00ff);
    const s = EMISSIVE.has(id) ? 1 : shade;
    for (const [dx, dy, dz] of face.corners) {
      target.pos.push(x + dx, y + dy, z + dz);
      target.norm.push(face.dir[0], face.dir[1], face.dir[2]);
      target.col.push(c.r * s, c.g * s, c.b * s);
    }
    target.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let y = 0; y < grid.sy; y++) {
    for (let z = 0; z < grid.sz; z++) {
      for (let x = 0; x < grid.sx; x++) {
        const id = grid.get(x, y, z);
        if (id === B.AIR) continue;
        const isWater = id === B.WATER;
        const target = isWater ? water : opaque;

        for (const face of FACES) {
          const nx = x + face.dir[0], ny = y + face.dir[1], nz = z + face.dir[2];
          const n = grid.get(nx, ny, nz);
          // Water only shows its surface against air; solids hide behind solids.
          if (isWater) {
            if (n !== B.AIR) continue;
          } else {
            if (n !== B.AIR && n !== B.WATER && n !== B.FLOWER) continue;
            if (id === B.FLOWER && n === B.FLOWER) continue;
          }
          emit(target, x, y, z, face, id, face.shade);
        }
      }
    }
  }

  return {
    opaque: toMesh(opaque, false),
    water: water.pos.length ? toMesh(water, true) : null,
  };
}

function toMesh(d, transparent) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(d.norm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(d.col, 3));
  geo.setIndex(d.idx);
  geo.computeBoundingSphere();

  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    transparent,
    opacity: transparent ? 0.72 : 1,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = !transparent;
  mesh.receiveShadow = true;
  return mesh;
}
