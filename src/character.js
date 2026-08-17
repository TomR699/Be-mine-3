import * as THREE from 'three';

/**
 * A voxel character built from boxes, with pivots at the shoulders and hips
 * so the walk cycle is real rotation rather than a sprite swap.
 *
 * Colors are the two variables that make it her: HAIR and OUTFIT.
 */
export const HER = {
  skin: 0xe8b896,
  hair: 0x3a2a22,
  outfit: 0xc8385f,
  legs: 0x3b3350,
  shoes: 0x2a2334,
};

export const HIM = {
  skin: 0xdba97f,
  hair: 0x2b2018,
  outfit: 0x3d5a8c,
  legs: 0x2f3a4e,
  shoes: 0x24202c,
};

function box(w, h, d, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class Character {
  constructor(palette = HER) {
    this.root = new THREE.Group();
    this.palette = palette;

    // Proportions in world units, where 1 unit = 1 voxel block.
    const legH = 0.75, torsoH = 0.8, headH = 0.55;

    this.hipY = legH;
    const body = new THREE.Group();
    body.position.y = 0;
    this.root.add(body);
    this.body = body;

    // torso
    const torso = box(0.62, torsoH, 0.34, palette.outfit);
    torso.position.y = legH + torsoH / 2;
    body.add(torso);

    // head + hair
    this.head = new THREE.Group();
    this.head.position.y = legH + torsoH;
    body.add(this.head);

    const head = box(0.5, headH, 0.46, palette.skin);
    head.position.y = headH / 2;
    this.head.add(head);

    const hairTop = box(0.56, 0.2, 0.52, palette.hair);
    hairTop.position.y = headH - 0.04;
    this.head.add(hairTop);

    const hairBack = box(0.56, 0.5, 0.16, palette.hair);
    hairBack.position.set(0, headH / 2, -0.22);
    this.head.add(hairBack);

    for (const s of [-1, 1]) {
      const eye = box(0.07, 0.09, 0.03, 0x241d2e);
      eye.position.set(s * 0.12, headH * 0.55, 0.235);
      this.head.add(eye);
    }

    // limbs, each hung from a pivot so rotation looks like a joint
    this.limbs = [];
    const mkLimb = (x, y, w, h, d, color) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const m = box(w, h, d, color);
      m.position.y = -h / 2;
      pivot.add(m);
      body.add(pivot);
      return pivot;
    };

    this.armL = mkLimb(-0.39, legH + torsoH - 0.06, 0.16, 0.62, 0.16, palette.skin);
    this.armR = mkLimb(0.39, legH + torsoH - 0.06, 0.16, 0.62, 0.16, palette.skin);
    this.legL = mkLimb(-0.16, legH, 0.22, legH, 0.22, palette.legs);
    this.legR = mkLimb(0.16, legH, 0.22, legH, 0.22, palette.legs);

    for (const s of [-1, 1]) {
      const shoe = box(0.26, 0.16, 0.3, palette.shoes);
      shoe.position.set(s * 0.16, 0.08, 0.02);
      body.add(shoe);
      if (s === -1) this.shoeL = shoe; else this.shoeR = shoe;
    }

    this.height = legH + torsoH + headH + 0.2;
    this.phase = 0;
  }

  /** speed is horizontal m/s; grounded toggles the airborne pose. */
  update(dt, speed, grounded) {
    const moving = speed > 0.15;
    this.phase += dt * (moving ? 6 + speed * 1.4 : 3);

    if (!grounded) {
      const a = 0.7;
      this.armL.rotation.x = -a; this.armR.rotation.x = -a;
      this.legL.rotation.x = 0.35; this.legR.rotation.x = -0.25;
      this.body.position.y = 0;
      return;
    }

    if (moving) {
      const swing = Math.sin(this.phase) * Math.min(0.95, 0.35 + speed * 0.12);
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
      this.armL.rotation.x = -swing * 0.8;
      this.armR.rotation.x = swing * 0.8;
      this.shoeL.position.z = 0.02 + Math.sin(this.phase) * 0.14;
      this.shoeR.position.z = 0.02 - Math.sin(this.phase) * 0.14;
      this.shoeL.position.y = 0.08 + Math.max(0, Math.sin(this.phase)) * 0.1;
      this.shoeR.position.y = 0.08 + Math.max(0, -Math.sin(this.phase)) * 0.1;
      // a small bounce on each footfall
      this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.06;
    } else {
      // idle: breathe, and let the arms settle
      const ease = 1 - Math.pow(0.001, dt);
      this.legL.rotation.x += (0 - this.legL.rotation.x) * ease;
      this.legR.rotation.x += (0 - this.legR.rotation.x) * ease;
      this.armL.rotation.x += (0 - this.armL.rotation.x) * ease;
      this.armR.rotation.x += (0 - this.armR.rotation.x) * ease;
      this.shoeL.position.z += (0.02 - this.shoeL.position.z) * ease;
      this.shoeR.position.z += (0.02 - this.shoeR.position.z) * ease;
      this.shoeL.position.y += (0.08 - this.shoeL.position.y) * ease;
      this.shoeR.position.y += (0.08 - this.shoeR.position.y) * ease;
      this.body.position.y = Math.sin(this.phase * 0.6) * 0.02;
    }
  }

  /** Turn smoothly toward a heading in radians. */
  faceTowards(yaw, dt) {
    let d = yaw - this.root.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.root.rotation.y += d * Math.min(1, dt * 12);
  }
}
