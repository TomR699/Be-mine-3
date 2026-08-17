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

/** Does this block cast ambient occlusion onto its neighbours? */
function occludes(id) { return id !== B.AIR && id !== B.WATER && id !== B.FLOWER; }

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

/**
 * Face order: +X, -X, +Y, -Y, +Z, -Z.
 *
 * Each face carries its normal, the two in-plane axes (u, v), its four corners
 * wound CCW seen from outside, and the (du, dv) sign of each corner in that
 * plane — which is what lets the mesher sample the right neighbours for
 * ambient occlusion.
 *
 * Side shading is deliberately shallow: the directional light already darkens
 * these faces, and stacking both crushes anything in shadow to black.
 */
const FACES = [
  {
    dir: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], shade: 0.86,
    corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
    signs: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
  },
  {
    dir: [-1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], shade: 0.80,
    corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
    signs: [[-1, 1], [1, 1], [1, -1], [-1, -1]],
  },
  {
    dir: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 1.00,
    corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
    signs: [[-1, -1], [-1, 1], [1, 1], [1, -1]],
  },
  {
    dir: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.62,
    corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]],
    signs: [[-1, 1], [-1, -1], [1, -1], [1, 1]],
  },
  {
    dir: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.94,
    corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
    signs: [[1, -1], [1, 1], [-1, 1], [-1, -1]],
  },
  {
    dir: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.76,
    corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
    signs: [[-1, -1], [-1, 1], [1, 1], [1, -1]],
  },
];

// Brightness for ambient-occlusion levels 0 (deepest crease) to 3 (open).
const AO_LEVELS = [0.48, 0.68, 0.85, 1.0];

/**
 * Classic voxel corner AO: a vertex is darkened by the two blocks flanking it
 * in the face plane plus the one diagonally across. Two flanking blocks close
 * the corner completely, which is why that case short-circuits to zero.
 */
function cornerAO(side1, side2, corner) {
  if (side1 && side2) return 0;
  return 3 - (side1 + side2 + corner);
}

/**
 * Build merged meshes: one for terrain, one for foliage (so it can sway in
 * the wind independently) and one for water. Only faces touching air are
 * emitted, so the interior of the island costs nothing.
 */
export function buildMeshes(grid) {
  const solid = newBuf(), foliage = newBuf(), water = newBuf();
  const c = new THREE.Color();

  for (let y = 0; y < grid.sy; y++) {
    for (let z = 0; z < grid.sz; z++) {
      for (let x = 0; x < grid.sx; x++) {
        const id = grid.get(x, y, z);
        if (id === B.AIR) continue;

        const isWater = id === B.WATER;
        const isLeaf = id === B.LEAF;
        const target = isWater ? water : (isLeaf ? foliage : solid);

        for (const face of FACES) {
          const nx = x + face.dir[0], ny = y + face.dir[1], nz = z + face.dir[2];
          const n = grid.get(nx, ny, nz);

          if (isWater) {
            if (n !== B.AIR) continue;
          } else if (n !== B.AIR && n !== B.WATER) {
            continue;
          }

          // Ambient occlusion per corner. Water skips it — a flat sea reads
          // better without creases along every shoreline block.
          const ao = [3, 3, 3, 3];
          if (!isWater) {
            for (let i = 0; i < 4; i++) {
              const [du, dv] = face.signs[i];
              const s1 = occludes(grid.get(
                nx + face.u[0] * du, ny + face.u[1] * du, nz + face.u[2] * du));
              const s2 = occludes(grid.get(
                nx + face.v[0] * dv, ny + face.v[1] * dv, nz + face.v[2] * dv));
              const cr = occludes(grid.get(
                nx + face.u[0] * du + face.v[0] * dv,
                ny + face.u[1] * du + face.v[1] * dv,
                nz + face.u[2] * du + face.v[2] * dv));
              ao[i] = cornerAO(s1 ? 1 : 0, s2 ? 1 : 0, cr ? 1 : 0);
            }
          }

          c.setHex(COLORS[id] ?? 0xff00ff);
          const shade = EMISSIVE.has(id) ? 1 : face.shade;
          const base = target.pos.length / 3;

          for (let i = 0; i < 4; i++) {
            const [dx, dy, dz] = face.corners[i];
            const k = shade * (EMISSIVE.has(id) ? 1 : AO_LEVELS[ao[i]]);
            target.pos.push(x + dx, y + dy, z + dz);
            target.norm.push(face.dir[0], face.dir[1], face.dir[2]);
            target.col.push(c.r * k, c.g * k, c.b * k);
          }

          // Split the quad along the darker diagonal, or the AO gradient
          // visibly kinks across the face.
          if (ao[0] + ao[2] > ao[1] + ao[3]) {
            target.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
          } else {
            target.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
          }
        }
      }
    }
  }

  return {
    opaque: toMesh(solid, false),
    foliage: foliage.pos.length ? toMesh(foliage, false) : null,
    water: water.pos.length ? toMesh(water, true) : null,
  };
}

function newBuf() { return { pos: [], norm: [], col: [], idx: [] }; }

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

/**
 * Make a material's vertices drift, so foliage reads as alive rather than
 * moulded. Returns a function to advance time each frame.
 */
export function addWind(material, strength = 0.09) {
  let ref = null;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader =
      'uniform float uTime;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float wind = sin(uTime * 1.4 + position.x * 0.32 + position.z * 0.21);
         float gust = sin(uTime * 0.45 + position.x * 0.05) * 0.5 + 0.75;
         transformed.x += wind * ${strength.toFixed(3)} * gust;
         transformed.z += cos(uTime * 1.1 + position.z * 0.27) * ${(strength * 0.6).toFixed(3)} * gust;`
      );
    ref = shader;
  };
  material.needsUpdate = true;
  return (t) => { if (ref) ref.uniforms.uTime.value = t; };
}
