import * as THREE from 'three';
import { SEA } from './world.js';

/**
 * The low-poly renderer.
 *
 * It draws the same world the voxel mesher does — same heightmap, same path,
 * same tree positions — as a faceted surface instead of cubes. The voxel grid
 * stays underneath as the collision shape, so nothing about the physics,
 * the gate, or the ending changes when you switch styles.
 *
 * The one visible seam is that collision is blocky while the ground is smooth,
 * which would leave her hovering on slopes. `groundAt` exists so the renderer
 * can drop her onto the surface she can actually see.
 */

const PALETTE = {
  grass: new THREE.Color(0x74a94f),
  grassDry: new THREE.Color(0x93ab55),
  path: new THREE.Color(0xc0a877),
  sand: new THREE.Color(0xe0cd94),
  rock: new THREE.Color(0x8d8a97),
  snow: new THREE.Color(0xecf1f6),
  deep: new THREE.Color(0x4a6f52),
};

/** Vertex heights: cell heights averaged to the corners, so hills round off. */
function cornerHeights(height, sx, sz) {
  const vh = new Float32Array((sx + 1) * (sz + 1));
  for (let z = 0; z <= sz; z++) {
    for (let x = 0; x <= sx; x++) {
      let sum = 0, n = 0;
      for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const cx = x + dx, cz = z + dz;
        if (cx < 0 || cz < 0 || cx >= sx || cz >= sz) continue;
        sum += height[cx + cz * sx];
        n++;
      }
      vh[x + z * (sx + 1)] = n ? sum / n : 0;
    }
  }
  return vh;
}

/**
 * Bilinear sample of the corner heights — the height of the visible ground at
 * any point, used to sit characters and props on the surface.
 */
export function makeGroundSampler(height, sx, sz) {
  const vh = cornerHeights(height, sx, sz);
  const w = sx + 1;
  return function groundAt(x, z) {
    const fx = Math.max(0, Math.min(sx - 0.001, x));
    const fz = Math.max(0, Math.min(sz - 0.001, z));
    const x0 = Math.floor(fx), z0 = Math.floor(fz);
    const tx = fx - x0, tz = fz - z0;
    const h00 = vh[x0 + z0 * w];
    const h10 = vh[x0 + 1 + z0 * w];
    const h01 = vh[x0 + (z0 + 1) * w];
    const h11 = vh[x0 + 1 + (z0 + 1) * w];
    // +1 because a cell of height h has its walkable surface at h + 1.
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz)
         + (h01 * (1 - tx) + h11 * tx) * tz + 1;
  };
}

function jitter(x, z, amount) {
  let h = Math.imul(x, 73856093) ^ Math.imul(z, 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return 1 + ((((h ^ (h >>> 16)) >>> 0) / 4294967295) - 0.5) * amount;
}

/**
 * Terrain as flat-shaded triangles. Every triangle gets its own vertices and
 * one normal, which is what produces the faceted look — shared vertices would
 * smooth it back into a blob.
 */
export function buildLowPolyTerrain(height, pathMask, sx, sz) {
  const vh = cornerHeights(height, sx, sz);
  const w = sx + 1;

  const pos = [];
  const col = [];
  const c = new THREE.Color();
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
  const nrm = [];

  const tri = (p0, p1, p2, colour) => {
    a.set(p0[0], p0[1], p0[2]);
    e1.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    e2.set(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]);
    n.crossVectors(e1, e2).normalize();
    for (const p of [p0, p1, p2]) {
      pos.push(p[0], p[1], p[2]);
      nrm.push(n.x, n.y, n.z);
      col.push(colour.r, colour.g, colour.b);
    }
  };

  for (let z = 0; z < sz; z++) {
    for (let x = 0; x < sx; x++) {
      const i = x + z * sx;
      const h = height[i];

      // Colour by what this cell is, with a little per-cell variation.
      if (pathMask[i]) c.copy(PALETTE.path);
      else if (h <= SEA) c.copy(PALETTE.sand);
      else if (h <= SEA + 1) c.copy(PALETTE.sand).lerp(PALETTE.grass, 0.35);
      else if (h > 34) c.copy(PALETTE.snow);
      else if (h > 30) c.copy(PALETTE.rock);
      else c.copy(PALETTE.grass).lerp(PALETTE.grassDry, jitter(x, z, 1.4) - 0.3);
      c.multiplyScalar(jitter(x + 7, z * 3, 0.11));

      const y00 = vh[x + z * w] + 1;
      const y10 = vh[x + 1 + z * w] + 1;
      const y01 = vh[x + (z + 1) * w] + 1;
      const y11 = vh[x + 1 + (z + 1) * w] + 1;

      const p00 = [x, y00, z], p10 = [x + 1, y10, z];
      const p01 = [x, y01, z + 1], p11 = [x + 1, y11, z + 1];

      // Split along the shorter diagonal so ridges stay sharp.
      if (Math.abs(y00 - y11) <= Math.abs(y10 - y01)) {
        tri(p00, p01, p11, c);
        tri(p00, p11, p10, c);
      } else {
        tri(p00, p01, p10, c);
        tri(p01, p11, p10, c);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Every tree merged into one geometry — trunk plus two stacked cones, low
 * segment counts, flat shaded. Hundreds of trees for one draw call.
 */
export function buildLowPolyTrees(trees) {
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 1, 5, 1).toNonIndexed();
  const leafGeo = new THREE.ConeGeometry(1, 1, 7, 1).toNonIndexed();
  trunkGeo.computeVertexNormals();
  leafGeo.computeVertexNormals();

  const pos = [], nrm = [], col = [], sway = [];
  const m = new THREE.Matrix4();
  const c = new THREE.Color();

  const LEAF_TONES = [0x4f8a4a, 0x437d46, 0x5f9a4e, 0x3c6f40];
  const TRUNK = new THREE.Color(0x6b4a33);

  // baseY/topY let each vertex know how far up its own tree it sits, so wind
  // pivots the crown and leaves the trunk rooted.
  const append = (geo, matrix, colour, baseY, topY) => {
    const g = geo.clone().applyMatrix4(matrix);
    const p = g.attributes.position.array;
    const nn = g.attributes.normal.array;
    const span = Math.max(0.001, topY - baseY);
    for (let i = 0; i < p.length; i += 3) {
      pos.push(p[i], p[i + 1], p[i + 2]);
      nrm.push(nn[i], nn[i + 1], nn[i + 2]);
      col.push(colour.r, colour.g, colour.b);
      const up = Math.max(0, Math.min(1, (p[i + 1] - baseY) / span));
      sway.push(Math.pow(up, 1.7));
    }
    g.dispose();
  };

  for (const t of trees) {
    const s = 0.8 + t.seed * 0.7;          // overall size
    const trunkH = (2.2 + t.seed * 1.6) * s;
    const lean = (t.seed - 0.5) * 0.12;

    m.makeTranslation(t.x, t.y + trunkH / 2, t.z);
    m.multiply(new THREE.Matrix4().makeRotationZ(lean));
    m.multiply(new THREE.Matrix4().makeScale(s, trunkH, s));
    const baseY = t.y;

    c.setHex(LEAF_TONES[Math.floor(t.seed * 997) % LEAF_TONES.length]);
    c.multiplyScalar(0.92 + t.seed * 0.16);

    // Two cones, the upper one smaller — reads as a tree at any distance.
    const r1 = (1.5 + t.seed * 0.5) * s, h1 = (2.4 + t.seed) * s;
    const r2 = r1 * 0.66, h2 = h1 * 0.8;
    const topY = t.y + trunkH * 0.75 + h1 * 0.78 + h2;

    append(trunkGeo, m, TRUNK, baseY, topY);

    m.makeTranslation(t.x, t.y + trunkH * 0.75 + h1 / 2, t.z);
    m.multiply(new THREE.Matrix4().makeScale(r1, h1, r1));
    append(leafGeo, m, c, baseY, topY);

    m.makeTranslation(t.x, t.y + trunkH * 0.75 + h1 * 0.78 + h2 / 2, t.z);
    m.multiply(new THREE.Matrix4().makeScale(r2, h2, r2));
    append(leafGeo, m, c.clone().multiplyScalar(1.1), baseY, topY);
  }

  trunkGeo.dispose();
  leafGeo.dispose();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('sway', new THREE.Float32BufferAttribute(sway, 1));
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Wind for the merged tree mesh. Displacement is weighted by the `sway`
 * attribute, so crowns move and trunks stay planted.
 */
export function addTreeWind(material, strength = 0.34) {
  let ref = null;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader =
      'uniform float uTime;\nattribute float sway;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float gust = sin(uTime * 0.4 + position.x * 0.05) * 0.5 + 0.75;
         transformed.x += sin(uTime * 1.1 + position.x * 0.3 + position.z * 0.2)
                          * sway * ${strength.toFixed(3)} * gust;
         transformed.z += cos(uTime * 0.9 + position.z * 0.25)
                          * sway * ${(strength * 0.6).toFixed(3)} * gust;`
      );
    ref = shader;
  };
  material.needsUpdate = true;
  return (t) => { if (ref) ref.uniforms.uTime.value = t; };
}
