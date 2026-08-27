import * as THREE from 'three';

/**
 * A voxel character built from boxes, with pivots at the shoulders and hips
 * so the walk cycle is real rotation rather than a sprite swap.
 *
 * The palette is what makes it a person rather than a mannequin. Change the
 * colours here and the character changes everywhere.
 */
export const HER = {
  skin: 0xe9bb98,
  hair: 0xc98a52,        // strawberry blonde
  hairShade: 0xa96f3e,   // the darker under-layer, so it isn't one flat slab
  longHair: true,
  outfit: 0x596069,      // the oversized charcoal hoodie
  outfitShade: 0x474d55,
  graphic: 0xd6dc8e,     // the pale yellow print on the front and sleeve
  hood: true,
  legs: 0x1e2129,        // black track pants
  stripe: 0xd8dce2,      // with the white side stripes
  shoes: 0xf0eee9,
  scale: 1.0,
};

export const HIM = {
  skin: 0xdba97f,
  hair: 0x2b2018,
  hairShade: 0x1f1710,
  longHair: false,
  outfit: 0x3d5a8c,
  outfitShade: 0x314a76,
  graphic: null,
  hood: false,
  legs: 0x2f3a4e,
  stripe: null,
  shoes: 0x24202c,
  scale: 1.07,
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
    const legH = 0.75, torsoH = palette.hood ? 0.92 : 0.8, headH = 0.55;
    const torsoW = palette.hood ? 0.74 : 0.62;   // the hoodie is oversized
    const torsoD = palette.hood ? 0.42 : 0.34;

    const body = new THREE.Group();
    this.root.add(body);
    this.body = body;
    this.root.scale.setScalar(palette.scale ?? 1);

    // torso
    const torso = box(torsoW, torsoH, torsoD, palette.outfit);
    torso.position.y = legH + torsoH / 2;
    body.add(torso);

    // the hoodie hem, a shade darker so the silhouette reads
    const hem = box(torsoW + 0.02, 0.12, torsoD + 0.02, palette.outfitShade);
    hem.position.y = legH + 0.06;
    body.add(hem);

    if (palette.graphic) {
      // the print on the chest
      const g1 = box(0.26, 0.34, 0.02, palette.graphic);
      g1.position.set(-0.14, legH + torsoH * 0.62, torsoD / 2 + 0.01);
      body.add(g1);
      // the kangaroo pocket
      const pocket = box(torsoW * 0.62, 0.22, 0.03, palette.outfitShade);
      pocket.position.set(0, legH + 0.28, torsoD / 2 + 0.015);
      body.add(pocket);
    }

    // head
    this.head = new THREE.Group();
    this.head.position.y = legH + torsoH;
    body.add(this.head);

    const head = box(0.5, headH, 0.46, palette.skin);
    head.position.y = headH / 2;
    this.head.add(head);

    // hair: a cap, a centre part, and — if it's long — a fall down the back
    const hairTop = box(0.56, 0.2, 0.52, palette.hair);
    hairTop.position.y = headH - 0.03;
    this.head.add(hairTop);

    for (const s of [-1, 1]) {
      const side = box(0.1, 0.42, 0.5, palette.hair);
      side.position.set(s * 0.24, headH * 0.55, -0.02);
      this.head.add(side);
    }

    if (palette.longHair) {
      // Falls past the shoulders. Hung off the head so it swings when she turns.
      const back = box(0.54, 0.95, 0.17, palette.hair);
      back.position.set(0, headH * 0.5 - 0.44, -0.24);
      this.head.add(back);

      const under = box(0.46, 0.5, 0.1, palette.hairShade);
      under.position.set(0, headH * 0.5 - 0.72, -0.2);
      this.head.add(under);

      // a strand over each shoulder, which is how it sits in the photo
      const strand = box(0.12, 0.5, 0.12, palette.hair);
      strand.position.set(-0.2, headH * 0.5 - 0.4, 0.2);
      this.head.add(strand);
    } else {
      const back = box(0.54, 0.44, 0.14, palette.hair);
      back.position.set(0, headH * 0.5, -0.24);
      this.head.add(back);
    }

    for (const s of [-1, 1]) {
      const eye = box(0.07, 0.09, 0.03, 0x241d2e);
      eye.position.set(s * 0.12, headH * 0.55, 0.235);
      this.head.add(eye);
    }

    if (palette.hood) {
      // the hood, bunched at the back of the neck
      const hood = box(0.6, 0.34, 0.26, palette.outfitShade);
      hood.position.set(0, legH + torsoH - 0.06, -torsoD / 2 - 0.04);
      body.add(hood);
    }

    // limbs, each hung from a pivot so rotation looks like a joint
    const mkLimb = (x, y, w, h, d, color) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const m = box(w, h, d, color);
      m.position.y = -h / 2;
      pivot.add(m);
      body.add(pivot);
      pivot.limb = m;
      return pivot;
    };

    // Sleeves are hoodie-coloured with a hand at the end, not bare arms.
    const armX = torsoW / 2 + 0.09;
    const sleeveColor = palette.hood ? palette.outfit : palette.skin;
    const armH = palette.hood ? 0.62 : 0.62;

    this.armL = mkLimb(-armX, legH + torsoH - 0.08, 0.2, armH, 0.2, sleeveColor);
    this.armR = mkLimb(armX, legH + torsoH - 0.08, 0.2, armH, 0.2, sleeveColor);

    if (palette.hood) {
      for (const arm of [this.armL, this.armR]) {
        const hand = box(0.17, 0.14, 0.17, palette.skin);
        hand.position.y = -armH - 0.06;
        arm.add(hand);
      }
      // the print carries onto one sleeve
      if (palette.graphic) {
        const mark = box(0.09, 0.26, 0.09, palette.graphic);
        mark.position.set(-0.06, -0.3, 0.11);
        this.armL.add(mark);
      }
    }

    this.legL = mkLimb(-0.16, legH, 0.26, legH, 0.26, palette.legs);
    this.legR = mkLimb(0.16, legH, 0.26, legH, 0.26, palette.legs);

    if (palette.stripe) {
      for (const [leg, s] of [[this.legL, -1], [this.legR, 1]]) {
        const stripe = box(0.03, legH * 0.92, 0.1, palette.stripe);
        stripe.position.set(s * 0.14, -legH / 2, 0.02);
        leg.add(stripe);
      }
    }

    for (const s of [-1, 1]) {
      const shoe = box(0.28, 0.16, 0.32, palette.shoes);
      shoe.position.set(s * 0.16, 0.08, 0.02);
      body.add(shoe);
      if (s === -1) this.shoeL = shoe; else this.shoeR = shoe;
    }

    this.height = (legH + torsoH + headH + 0.2) * (palette.scale ?? 1);
    // Where the body meets a seat, in world units — used to sit her on the bench.
    this.hipHeight = legH * (palette.scale ?? 1);
    this.phase = 0;
    this.sitting = false;
  }

  /** Sitting: thighs forward from the hip, feet down, hands in the lap. */
  setSitting(on) { this.sitting = on; }

  /** speed is horizontal m/s; grounded toggles the airborne pose. */
  update(dt, speed, grounded) {
    if (this.sitting) {
      const ease = 1 - Math.pow(0.0001, dt);
      const to = (part, prop, target) => {
        part[prop] += (target - part[prop]) * ease;
      };
      to(this.legL.rotation, 'x', -1.42);
      to(this.legR.rotation, 'x', -1.42);
      to(this.armL.rotation, 'x', -0.42);
      to(this.armR.rotation, 'x', -0.42);
      to(this.shoeL.position, 'z', 0.62);
      to(this.shoeR.position, 'z', 0.62);
      to(this.shoeL.position, 'y', 0.06);
      to(this.shoeR.position, 'y', 0.06);
      to(this.head.rotation, 'z', 0);
      // a slow breath, so they aren't statues
      this.phase += dt * 0.9;
      this.body.position.y = Math.sin(this.phase) * 0.018;
      return;
    }

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
      // long hair lags behind the stride
      if (this.palette.longHair) {
        this.head.rotation.z = Math.sin(this.phase) * 0.05;
      }
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
      if (this.palette.longHair) {
        this.head.rotation.z += (0 - this.head.rotation.z) * ease;
      }
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
