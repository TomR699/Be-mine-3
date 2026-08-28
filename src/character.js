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
  hair: 0x6f4230,        // dark brown, with the red only as a warmth in it
  hairShade: 0x4f2e20,   // the darker under-layer, so it isn't one flat slab
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
  hair: 0x3d2b1f,
  hairShade: 0x2a1d14,
  longHair: false,
  curtains: true,        // parted in the middle, sweeping either side
  glasses: 0x33313a,
  outfit: 0x3d5a8c,
  outfitShade: 0x314a76,
  graphic: null,
  hood: false,
  legs: 0x2f3a4e,
  stripe: null,
  shoes: 0x24202c,
  scale: 1.07,
};

function place(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }

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

    // The hood first, because the hair has to be built around where it sits.
    // Bunched at the base of the neck and low enough that the fall of her hair
    // passes behind it rather than through it.
    const HOOD_BACK = -torsoD / 2 - 0.17;     // z of the hood's outer face
    if (palette.hood) {
      const hood = box(0.6, 0.3, 0.26, palette.outfitShade);
      hood.position.set(0, legH + torsoH - 0.17, -torsoD / 2 - 0.04);
      body.add(hood);
    }

    // hair: a cap, a centre part, and — if it's long — a fall down the back
    const hairTop = box(0.56, 0.2, 0.6, palette.hair);
    hairTop.position.set(0, headH - 0.03, -0.03);
    this.head.add(hairTop);

    for (const s of [-1, 1]) {
      const side = box(0.1, 0.42, 0.5, palette.hair);
      side.position.set(s * 0.24, headH * 0.55, -0.02);
      this.head.add(side);
    }

    if (palette.curtains) {
      // A centre parting: two flaps angled off the forehead, longer at the
      // outside than the middle, which is what makes it read as curtains
      // rather than as a fringe.
      // Kept above the eyes and swept outward. Hung lower and straighter they
      // met in the middle and covered his face, which is a fringe over a
      // curtain rather than a centre parting.
      for (const s of [-1, 1]) {
        const flap = box(0.16, 0.26, 0.1, palette.hair);
        flap.position.set(s * 0.15, headH * 0.82, 0.2);
        flap.rotation.z = s * 0.5;
        this.head.add(flap);

        const sweep = box(0.12, 0.3, 0.13, palette.hair);
        sweep.position.set(s * 0.26, headH * 0.76, 0.12);
        sweep.rotation.z = s * 0.24;
        this.head.add(sweep);
      }
      // the part itself, a shade darker so the split reads
      const part = box(0.045, 0.13, 0.1, palette.hairShade);
      part.position.set(0, headH * 0.95, 0.21);
      this.head.add(part);
    }

    if (palette.longHair) {
      // The fall, built as a stack rather than one slab.
      //
      // A single box behind the head had to clear the hood, which meant it
      // stood a third of a block off her back with a gap behind her neck —
      // a plank following her about. This hugs the skull at the top, steps
      // out over the hood where real hair would lie on it, and tapers to a
      // point past her shoulders. Each segment overlaps the one above so
      // there is no seam, and none of them touch the hood.
      //
      //          w     h     d     y      z
      const fall = [
        [0.52, 0.26, 0.17, 0.42, -0.28],   // crown and nape, against the head
        [0.54, 0.31, 0.18, 0.155, -0.34],  // down the back of the neck
        [0.54, 0.30, 0.18, -0.16, -0.47],  // out over the hood
        [0.46, 0.26, 0.16, -0.42, -0.47],  // past the shoulders
        [0.34, 0.18, 0.13, -0.62, -0.45],  // and tapering off
      ];
      for (const [w, h, d, y, z] of fall) {
        const seg = box(w, h, d, palette.hair);
        seg.position.set(0, y, z);
        this.head.add(seg);
      }
      // a darker under-layer at the ends, so it isn't one flat colour
      const under = box(0.38, 0.3, 0.11, palette.hairShade);
      under.position.set(0, -0.52, -0.42);
      this.head.add(under);

      // Locks framing the face, hanging in front of her shoulders. Thin, and
      // set out far enough that they never sink into her chest.
      for (const sx of [-1, 1]) {
        const lock = box(0.11, 0.46, 0.13, palette.hair);
        lock.position.set(sx * 0.22, headH * 0.5 - 0.36, 0.14);
        this.head.add(lock);
        const tip = box(0.09, 0.16, 0.11, palette.hairShade);
        tip.position.set(sx * 0.22, headH * 0.5 - 0.66, 0.14);
        this.head.add(tip);
      }
    } else if (!palette.curtains) {
      const back = box(0.54, 0.44, 0.14, palette.hair);
      back.position.set(0, headH * 0.5, -0.24);
      this.head.add(back);
    } else {
      const back = box(0.54, 0.3, 0.14, palette.hair);
      back.position.set(0, headH * 0.42, -0.26);
      this.head.add(back);
    }

    for (const s of [-1, 1]) {
      const eye = box(0.07, 0.09, 0.03, 0x241d2e);
      eye.position.set(s * 0.12, headH * 0.55, 0.235);
      this.head.add(eye);
    }

    if (palette.glasses) {
      // Rims, not lenses. Filled boxes over both eyes merge into one dark band
      // and read as a visor; four thin bars around an open middle read as
      // spectacles, and you can still see his eyes through them.
      const eyeY = headH * 0.55, gz = 0.255, t = 0.028;
      for (const s of [-1, 1]) {
        const cx = s * 0.12;
        this.head.add(place(box(0.2, t, 0.03, palette.glasses), cx, eyeY + 0.07, gz));
        this.head.add(place(box(0.2, t, 0.03, palette.glasses), cx, eyeY - 0.07, gz));
        this.head.add(place(box(t, 0.15, 0.03, palette.glasses), cx + s * 0.086, eyeY, gz));
        this.head.add(place(box(t, 0.15, 0.03, palette.glasses), cx - s * 0.086, eyeY, gz));

        const arm = box(0.03, t, 0.22, palette.glasses);
        arm.position.set(s * 0.235, eyeY + 0.05, 0.15);
        this.head.add(arm);
      }
      this.head.add(place(box(0.07, t, 0.03, palette.glasses), 0, eyeY + 0.045, gz));
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

    // Feet are children of the legs. Parented to the body instead they slide
    // around underneath the stride, which is most of what makes a walk cycle
    // look wrong.
    const mkShoe = (leg) => {
      const shoe = box(0.29, 0.16, 0.34, palette.shoes);
      shoe.position.set(0, -legH + 0.08, 0.04);
      leg.add(shoe);
      return shoe;
    };
    this.shoeL = mkShoe(this.legL);
    this.shoeR = mkShoe(this.legR);

    this.height = (legH + torsoH + headH + 0.2) * (palette.scale ?? 1);
    // Where the body meets a seat, in world units — used to sit her on the bench.
    this.hipHeight = legH * (palette.scale ?? 1);
    this.legLength = legH * (palette.scale ?? 1);
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
      // thighs forward, so the feet need to come back level with the ground
      to(this.shoeL.rotation, 'x', 1.35);
      to(this.shoeR.rotation, 'x', 1.35);
      to(this.head.rotation, 'z', 0);
      // a slow breath, so they aren't statues
      this.phase += dt * 0.9;
      this.body.position.y = Math.sin(this.phase) * 0.018;
      return;
    }

    const moving = speed > 0.15;

    // How far the legs swing, and therefore how far one stride carries her.
    // Deriving the stride from the swing rather than picking both separately
    // is what stops the feet skating: a foot planted at the front of the
    // swing travels backwards at exactly ground speed.
    const amp = 0.34 + Math.min(0.5, speed * 0.09);
    const stride = 4 * this.legLength * Math.sin(amp);
    if (moving) this.phase += (speed * dt) * ((Math.PI * 2) / stride);
    else this.phase += dt * 2.2;

    if (!grounded) {
      const a = 0.7;
      this.armL.rotation.x = -a; this.armR.rotation.x = -a;
      this.legL.rotation.x = 0.35; this.legR.rotation.x = -0.25;
      this.body.position.y = 0;
      return;
    }

    if (moving) {
      const swing = Math.sin(this.phase) * amp;
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
      this.armL.rotation.x = -swing * 0.7;
      this.armR.rotation.x = swing * 0.7;
      // The ankle keeps the foot flatter than the shin it hangs from.
      this.shoeL.rotation.x = -swing * 0.55;
      this.shoeR.rotation.x = swing * 0.55;
      // A dip at each footfall — twice per cycle, which is what abs() gives.
      this.body.position.y = -Math.abs(Math.sin(this.phase)) * 0.045;
      // long hair lags behind the stride
      if (this.palette.longHair) {
        this.head.rotation.z = Math.sin(this.phase) * 0.035;
      }
    } else {
      // idle: breathe, and let the arms settle
      const ease = 1 - Math.pow(0.001, dt);
      this.legL.rotation.x += (0 - this.legL.rotation.x) * ease;
      this.legR.rotation.x += (0 - this.legR.rotation.x) * ease;
      this.armL.rotation.x += (0 - this.armL.rotation.x) * ease;
      this.armR.rotation.x += (0 - this.armR.rotation.x) * ease;
      this.shoeL.rotation.x += (0 - this.shoeL.rotation.x) * ease;
      this.shoeR.rotation.x += (0 - this.shoeR.rotation.x) * ease;
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
