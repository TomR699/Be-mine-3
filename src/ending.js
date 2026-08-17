import * as THREE from 'three';
import { ENDING_LINES, THE_QUESTION, YES_LABEL, OTHER_LABEL } from './memories.js';

/**
 * The last thirty seconds.
 *
 * States:
 *   locked     the gate is shut, she hasn't found enough yet
 *   open       the gate has swung open, the path up is lit
 *   cinematic  control is hers no longer: she walks the last steps, camera
 *              closes in, lines arrive one at a time
 *   question   the question is on screen with two buttons
 *   answered   whatever she chose has happened
 */
export class Ending {
  constructor(opts) {
    Object.assign(this, opts); // scene, camera, her, him, player, gate, ui, onRelease
    this.state = 'locked';
    this.lineIndex = -1;
    this.timer = 0;
    this.camAngle = 0;
    this.mark = new THREE.Vector3();
    this.hearts = null;

    this.ui.yes.addEventListener('click', () => this.answer('yes'));
    this.ui.other.addEventListener('click', () => this.answer('other'));
  }

  get inControlOfCamera() {
    return this.state === 'cinematic' || this.state === 'question' || this.state === 'answered';
  }

  get locksInput() {
    return this.inControlOfCamera;
  }

  /** Called once, when she's found enough. */
  unlock() {
    if (this.state !== 'locked') return;
    this.state = 'open';
    this.gate.open();
  }

  /** Distance at which walking up to him starts the sequence. */
  checkApproach() {
    if (this.state !== 'open') return;
    const d = this.her.root.position.distanceTo(this.him.root.position);
    if (d > 6) return;
    this.begin();
  }

  begin() {
    this.state = 'cinematic';
    this.timer = 0;
    this.lineIndex = -1;

    // Her mark: a couple of paces in front of him, facing him.
    const him = this.him.root.position;
    const from = this.her.root.position;
    const dir = new THREE.Vector3().subVectors(from, him).setY(0).normalize();
    this.mark.copy(him).addScaledVector(dir, 2.1);
    this.mark.y = him.y;

    this.camAngle = Math.atan2(from.x - him.x, from.z - him.z) + 1.1;

    this.ui.letterbox.hidden = false;
    this.ui.hud.forEach((el) => { el.hidden = true; });
    document.body.classList.add('cinematic');
  }

  advanceLine() {
    this.lineIndex++;
    if (this.lineIndex < ENDING_LINES.length) {
      this.ui.line.textContent = ENDING_LINES[this.lineIndex];
      this.ui.line.hidden = false;
      // restart the fade
      this.ui.line.classList.remove('show');
      void this.ui.line.offsetWidth;
      this.ui.line.classList.add('show');
      this.timer = 0;
    } else {
      this.ask();
    }
  }

  ask() {
    this.state = 'question';
    this.ui.line.hidden = true;
    this.ui.question.textContent = THE_QUESTION;
    this.ui.yes.textContent = YES_LABEL;
    this.ui.other.textContent = OTHER_LABEL;
    this.ui.ask.hidden = false;
    this.ui.yes.focus();
  }

  answer(which) {
    if (this.state !== 'question') return;
    this.state = 'answered';
    this.ui.ask.hidden = true;

    if (which === 'yes') {
      this.ui.line.textContent = '';
      this.ui.line.hidden = true;
      this.celebrate();
    } else {
      // Not a rejection — it hands the moment back to the room.
      this.ui.line.textContent = 'Then ask me.';
      this.ui.line.hidden = false;
      this.ui.line.classList.add('show');
      this.timer = 0;
      this.release = 3.2;
    }
  }

  celebrate() {
    // A burst of hearts over the two of them.
    const N = 160;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const vel = [];
    const mid = new THREE.Vector3()
      .addVectors(this.her.root.position, this.him.root.position).multiplyScalar(0.5);

    for (let i = 0; i < N; i++) {
      pos[i * 3] = mid.x;
      pos[i * 3 + 1] = mid.y + 1.4;
      pos[i * 3 + 2] = mid.z;
      const a = Math.random() * Math.PI * 2;
      const s = 1.5 + Math.random() * 4;
      vel.push(new THREE.Vector3(Math.cos(a) * s, 4 + Math.random() * 5, Math.sin(a) * s));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xff6e92, size: 0.34, transparent: true, opacity: 1,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.hearts = new THREE.Points(geo, mat);
    this.hearts.userData.vel = vel;
    this.hearts.userData.age = 0;
    this.scene.add(this.hearts);

    this.ui.line.textContent = '';
    setTimeout(() => {
      this.ui.line.textContent = '♥';
      this.ui.line.hidden = false;
      this.ui.line.classList.add('show');
    }, 900);
  }

  update(dt, t) {
    if (this.hearts) {
      const h = this.hearts;
      h.userData.age += dt;
      const p = h.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const v = h.userData.vel[i];
        v.y -= 7 * dt;
        p.setXYZ(i, p.getX(i) + v.x * dt, p.getY(i) + v.y * dt, p.getZ(i) + v.z * dt);
      }
      p.needsUpdate = true;
      h.material.opacity = Math.max(0, 1 - h.userData.age / 4.5);
    }

    if (this.state === 'cinematic') this.updateCinematic(dt);
    else if (this.state === 'answered' && this.release !== undefined) {
      this.timer += dt;
      if (this.timer > this.release) {
        this.release = undefined;
        this.finishAndRelease();
      }
    }

    if (this.inControlOfCamera) this.updateCamera(dt);
  }

  updateCinematic(dt) {
    this.timer += dt;

    // She walks the last couple of paces herself.
    const pos = this.player.pos;
    const to = new THREE.Vector3(this.mark.x - pos.x, 0, this.mark.z - pos.z);
    const dist = to.length();
    if (dist > 0.12) {
      to.normalize();
      const step = Math.min(dist, 1.9 * dt);
      pos.x += to.x * step;
      pos.z += to.z * step;
      this.player.speed = 1.9;
      this.player.yaw = Math.atan2(to.x, to.z);
      return;
    }

    this.player.speed = 0;
    // Turn to face him, then start talking.
    const him = this.him.root.position;
    this.player.yaw = Math.atan2(him.x - pos.x, him.z - pos.z);
    this.him.root.rotation.y = Math.atan2(pos.x - him.x, pos.z - him.z);

    if (this.lineIndex === -1) {
      if (this.timer > 1.1) this.advanceLine();
      return;
    }
    if (this.timer > 3.4) this.advanceLine();
  }

  /** Space or click moves the lines along, for a reader who wants to go faster. */
  nudge() {
    if (this.state === 'cinematic' && this.lineIndex >= 0 && this.timer > 0.6) {
      this.advanceLine();
    }
  }

  updateCamera(dt) {
    const a = this.her.root.position, b = this.him.root.position;
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mid.y += 1.5;

    // Slow drift around the pair, easing closer as the lines land.
    this.camAngle += dt * 0.09;
    const closeness = this.state === 'cinematic'
      ? Math.max(0, Math.min(1, (this.lineIndex + 1) / (ENDING_LINES.length + 1)))
      : 1;
    const dist = 8.2 - closeness * 3.0;
    const height = 2.6 - closeness * 0.7;

    const want = new THREE.Vector3(
      mid.x + Math.sin(this.camAngle) * dist,
      mid.y + height,
      mid.z + Math.cos(this.camAngle) * dist
    );

    this.camera.position.lerp(want, Math.min(1, dt * 1.6));
    this._look = this._look || mid.clone();
    this._look.lerp(mid, Math.min(1, dt * 3));
    this.camera.lookAt(this._look);
  }

  finishAndRelease() {
    this.state = 'open';
    this.ui.line.hidden = true;
    this.ui.letterbox.hidden = true;
    this.ui.hud.forEach((el) => { el.hidden = false; });
    document.body.classList.remove('cinematic');
    this._look = null;
    if (this.onRelease) this.onRelease();
  }
}

/**
 * The gate across the path up to the lookout: two posts and a bar that swings
 * aside. It's a prop with its own collision box rather than terrain, so
 * opening it doesn't mean rebuilding the island.
 */
export function makeGate(x, y, z, facing) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = facing;

  const postMat = new THREE.MeshLambertMaterial({ color: 0x6b4f36 });
  const barMat = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });

  const post = (dx) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), postMat);
    m.position.set(dx, 1.5, 0);
    m.castShadow = true;
    group.add(m);
  };
  post(-2.6); post(2.6);

  const swing = new THREE.Group();
  swing.position.set(-2.6, 0, 0);
  group.add(swing);

  for (const h of [0.9, 1.8]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.26, 0.18), barMat);
    bar.position.set(2.6, h, 0);
    bar.castShadow = true;
    swing.add(bar);
  }

  // A lock that glows while it's shut.
  const lockMat = new THREE.MeshLambertMaterial({ color: 0x8b6fa8, emissive: 0x2a1f38 });
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.28), lockMat);
  lock.position.set(5.0, 1.35, 0);
  swing.add(lock);

  let t = 0, opening = false, opened = false;

  return {
    group,
    lockMat,
    /** AABB in world space, used for collision while shut. */
    bounds: {
      minX: x - Math.abs(Math.cos(facing)) * 3 - 0.5,
      maxX: x + Math.abs(Math.cos(facing)) * 3 + 0.5,
      minZ: z - Math.abs(Math.sin(facing)) * 3 - 0.5,
      maxZ: z + Math.abs(Math.sin(facing)) * 3 + 0.5,
      minY: y,
      maxY: y + 3,
    },
    get isOpen() { return opened; },
    open() { opening = true; },
    update(dt) {
      if (!opening || opened) return;
      t = Math.min(1, t + dt * 0.55);
      // ease-out so it swings hard then settles
      const e = 1 - Math.pow(1 - t, 3);
      swing.rotation.y = -e * 1.9;
      lockMat.emissive.setScalar(0.16 * (1 - e));
      if (t >= 1) opened = true;
    },
  };
}

/**
 * Fireflies that come out as dusk deepens. Points with additive blending, so
 * bloom picks them up and they read as light rather than dots.
 */
export function makeFireflies(count, centre, radius) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    pos[i * 3] = centre.x + Math.cos(a) * r;
    pos[i * 3 + 1] = centre.y + 1 + Math.random() * 4;
    pos[i * 3 + 2] = centre.z + Math.sin(a) * r;
    seed.push(Math.random() * Math.PI * 2);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffe9a8, size: 0.22, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  const base = pos.slice();

  return {
    points,
    update(t, dusk) {
      mat.opacity = Math.max(0, dusk - 0.25) * 0.9;
      if (mat.opacity <= 0) return;
      const p = geo.attributes.position;
      for (let i = 0; i < count; i++) {
        const s = seed[i];
        p.setY(i, base[i * 3 + 1] + Math.sin(t * 0.8 + s) * 0.5);
        p.setX(i, base[i * 3] + Math.sin(t * 0.35 + s * 1.7) * 0.9);
        p.setZ(i, base[i * 3 + 2] + Math.cos(t * 0.3 + s * 2.1) * 0.9);
      }
      p.needsUpdate = true;
    },
  };
}

/**
 * Town lights scattered across the low ground, so the view from the lookout at
 * dusk is a valley full of them. They fade up as the sky darkens, the way a
 * town does when you're standing on a hill watching it get dark.
 */
export function makeTownLights(grid, keepAway, sea) {
  const pts = [];
  const cols = [];
  const warm = [
    new THREE.Color(0xffd9a0), new THREE.Color(0xfff0cf),
    new THREE.Color(0xffbe73), new THREE.Color(0xcfe2ff),
  ];

  for (let x = 2; x < grid.sx - 2; x += 2) {
    for (let z = 2; z < grid.sz - 2; z += 2) {
      const h = grid.columnTop(x, z);
      if (h <= sea + 1 || h > 18) continue;
      if (Math.hypot(x - keepAway.x, z - keepAway.z) < 26) continue;

      // Clump them: towns, not an even sprinkle.
      const clump = Math.sin(x * 0.11) * Math.cos(z * 0.09) + Math.sin(z * 0.17) * 0.6;
      const density = clump > 0.55 ? 0.5 : (clump > 0.1 ? 0.09 : 0.012);
      if (Math.random() > density) continue;

      pts.push(x + Math.random(), h + 1 + Math.random() * 1.6, z + Math.random());
      const c = warm[(Math.random() * warm.length) | 0];
      cols.push(c.r, c.g, c.b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.5, vertexColors: true, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    // Distant lights are the whole point; fogging them out defeats it.
    fog: false,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  return {
    points,
    count: pts.length / 3,
    update(t, dusk) {
      // They only exist once it is dark enough to see them.
      const v = Math.max(0, (dusk - 0.3) / 0.7);
      mat.opacity = v * (0.85 + Math.sin(t * 1.7) * 0.04);
    },
  };
}
