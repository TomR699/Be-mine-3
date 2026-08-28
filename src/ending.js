import * as THREE from 'three';

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
    // scene, camera, her, him, player, gate, bench, ui, onRelease
    Object.assign(this, opts);
    this.state = 'locked';
    this.timer = 0;
    this.mark = new THREE.Vector3();
    this.hearts = [];
    this.outro = null;
    this.forcedY = null;
    this.camPush = 0;
  }

  get inControlOfCamera() {
    return this.state === 'walking' || this.state === 'seated';
  }

  get locksInput() { return this.inControlOfCamera; }

  /** Called once, when she's found enough. */
  unlock() {
    if (this.state !== 'locked') return;
    this.state = 'open';
    this.gate.open();
  }

  /** Walking up to the bench is what starts it. */
  checkApproach() {
    if (this.state !== 'open') return;
    const b = this.bench;
    const d = Math.hypot(this.her.root.position.x - b.x, this.her.root.position.z - b.z);
    // Wide enough that cresting the mesa is what starts it: she comes over the
    // top, sees him on the bench, and the game takes over from there.
    if (d > 9.5) return;
    this.begin();
  }

  begin() {
    this.state = 'walking';
    this.timer = 0;
    this.mark.set(this.bench.seatHer.x, this.bench.seatHer.y, this.bench.seatHer.z);
    this.ui.letterbox.hidden = false;
    this.ui.hud.forEach((el) => { el.hidden = true; });
    document.body.classList.add('cinematic');
  }

  sit() {
    this.state = 'seated';
    this.timer = 0;
    this.her.setSitting(true);
    this.player.speed = 0;
    this.player.yaw = this.bench.facing;
    this.player.pos.set(this.mark.x, this.player.pos.y, this.mark.z);
    // Her rendered height is the seat, not the ground she was standing on.
    this.forcedY = this.bench.seatHer.y;
  }

  update(dt) {
    if (this.hearts.length) this.updateHearts(dt);
    if (this.outro) this.updateOutro(dt);

    if (this.state === 'walking') this.updateWalking(dt);
    else if (this.state === 'seated') this.timer += dt;

    if (this.inControlOfCamera) this.updateCamera(dt);
  }

  updateWalking(dt) {
    this.timer += dt;
    const pos = this.player.pos;
    const dx = this.mark.x - pos.x, dz = this.mark.z - pos.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.14) {
      const step = Math.min(dist, 1.75 * dt);
      pos.x += (dx / dist) * step;
      pos.z += (dz / dist) * step;
      this.player.speed = 1.75;
      this.player.yaw = Math.atan2(dx, dz);
      return;
    }
    this.sit();
  }

  /**
   * The held shot: over their shoulders, out across the valley. It pushes in
   * very slowly and then stops. Nothing else happens — from here it's his.
   */
  updateCamera(dt) {
    const b = this.bench;
    const fx = Math.sin(b.facing), fz = Math.cos(b.facing);   // the way they face

    if (this.state === 'walking') {
      // Hold wide while she comes up the path, already looking at the bench.
      const want = new THREE.Vector3(
        b.x - fx * 7.5 + fz * 3.5, b.y + 3.4, b.z - fz * 7.5 - fx * 3.5
      );
      this.camera.position.lerp(want, Math.min(1, dt * 1.2));
      this._look = this._look || new THREE.Vector3(b.x, b.y + 1.2, b.z);
      this._look.lerp(new THREE.Vector3(b.x, b.y + 1.2, b.z), Math.min(1, dt * 2));
      this.camera.lookAt(this._look);
      return;
    }

    if (this.outro) return;   // the outro drives the camera itself

    // Seated: settle behind and above them, framing the town beyond.
    this.camPush = Math.min(1, this.camPush + dt * 0.045);
    const ease = 1 - Math.pow(1 - this.camPush, 3);
    const back = 6.4 - ease * 2.1;
    const high = 3.0 - ease * 0.75;

    const want = new THREE.Vector3(
      b.x - fx * back + fz * 1.1,
      b.y + high,
      b.z - fz * back - fx * 1.1
    );
    this.camera.position.lerp(want, Math.min(1, dt * 1.1));

    const target = new THREE.Vector3(
      b.x + fx * 7, b.y + 1.5 - ease * 0.5, b.z + fz * 7
    );
    this._look = this._look || target.clone();
    this._look.lerp(target, Math.min(1, dt * 1.4));
    this.camera.lookAt(this._look);
  }

  /**
   * Optional. There are no words and no buttons in this ending — but if she
   * says yes and you want the sky to agree, Enter sets off the hearts.
   */
  celebrate() {
    if (this.state !== 'seated') return;
    // Spammable on purpose. One burst is a gesture; leaning on the key is a
    // reaction, and that's the bit that belongs to whoever is in the room.
    // Old bursts are kept until they fade, so they pile up rather than cut
    // each other off — capped, so holding the key can't drown the frame rate.
    if (this.hearts.length >= 12) return;

    const N = 180;
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
    const burst = new THREE.Points(geo, mat);
    burst.userData.vel = vel;
    burst.userData.age = 0;
    this.scene.add(burst);
    this.hearts.push(burst);
  }

  updateHearts(dt) {
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      h.userData.age += dt;
      const p = h.geometry.attributes.position;
      for (let j = 0; j < p.count; j++) {
        const v = h.userData.vel[j];
        v.y -= 7 * dt;
        p.setXYZ(j, p.getX(j) + v.x * dt, p.getY(j) + v.y * dt, p.getZ(j) + v.z * dt);
      }
      p.needsUpdate = true;
      h.material.opacity = Math.max(0, 1 - h.userData.age / 5);
      if (h.userData.age > 5) {
        this.scene.remove(h);
        h.geometry.dispose();
        h.material.dispose();
        this.hearts.splice(i, 1);
      }
    }
  }

  /**
   * The way out. Escape from the bench pulls the camera all the way back off
   * the island and fades to black — a curtain, so the game has an ending you
   * can choose to reach rather than a frame it sits on forever.
   */
  finish() {
    if (this.state !== 'seated' || this.outro) return;
    this.outro = { t: 0, from: this.camera.position.clone() };
  }

  updateOutro(dt) {
    const o = this.outro;
    o.t += dt;
    const DUR = 7;
    const k = Math.min(1, o.t / DUR);
    const ease = k * k * (3 - 2 * k);

    // Pull back and up, away from the bench, until the two of them are a
    // detail on a hillside.
    const b = this.bench;
    const fx = Math.sin(b.facing), fz = Math.cos(b.facing);
    const back = 6.4 + ease * 78;
    this.camera.position.set(
      b.x - fx * back + fz * (1.1 + ease * 10),
      b.y + 2.3 + ease * 46,
      b.z - fz * back - fx * (1.1 + ease * 10)
    );
    this.camera.lookAt(b.x, b.y + 1.0, b.z);

    // The fade runs behind the pull-back and lands a beat after it stops.
    const fade = Math.max(0, Math.min(1, (o.t - DUR * 0.45) / (DUR * 0.62)));
    if (this.ui.fade) this.ui.fade.style.opacity = fade.toFixed(3);
  }
}

/**
 * The night she watches the sky turn.
 *
 * Finding the meteor-shower memory is the hinge of the whole story, and it
 * used to happen while she was mid-stride looking at the ground. So it takes
 * the controls for a moment: the camera swings round and tilts up, the sky
 * goes over into night, the shower runs, and then it hands everything back.
 *
 * It ends on its own — no key to press. Nothing is skippable here because
 * there is nothing to skip past; it is over in about twelve seconds.
 */
export class SkyCutscene {
  constructor(opts) {
    // camera, player, ui  (ui: { letterbox, hud })
    Object.assign(this, opts);
    this.active = false;
    this.t = 0;
    this.done = false;
    this._look = new THREE.Vector3();
  }

  get locksInput() { return this.active; }
  get inControlOfCamera() { return this.active; }

  /** How fast the sky should be easing while this runs. */
  get skyRate() { return this.active ? 1.35 : 0.5; }

  start() {
    if (this.active || this.done) return;
    this.active = true;
    this.done = true;
    this.t = 0;
    this.from = this.camera.position.clone();
    this.ui.letterbox.hidden = false;
    this.ui.hud.forEach((el) => { el.hidden = true; });
    document.body.classList.add('cinematic');
  }

  end() {
    this.active = false;
    this.ui.letterbox.hidden = true;
    this.ui.hud.forEach((el) => { el.hidden = false; });
    document.body.classList.remove('cinematic');
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const DUR = 12;

    const p = this.player.pos;
    // Rise off her shoulder and drift round, so the sky fills the frame and
    // she stays in the bottom of it — she is watching it too.
    const k = Math.min(1, this.t / 4.5);
    const ease = k * k * (3 - 2 * k);
    const ang = 2.1 + this.t * 0.06;
    const dist = 13 - ease * 3.5;

    const want = new THREE.Vector3(
      p.x + Math.sin(ang) * dist,
      p.y + 1.8 + ease * 1.5,
      p.z + Math.cos(ang) * dist
    );
    // Never let the shot sink into a hillside on the way up.
    if (this.groundAt) {
      want.y = Math.max(want.y, this.groundAt(want.x, want.z) + 1.2);
    }
    // Take over from wherever the follow camera was rather than cutting to
    // the new position — a hard cut here reads as a glitch, not as a shot.
    const blend = Math.min(1, this.t / 1.1);
    this.camera.position.copy(this.from).lerp(want, blend * blend * (3 - 2 * blend));

    // The look target lifts from her to above the horizon — but only about
    // thirty degrees. Aiming straight up fills the frame with sky and loses
    // both her and the island; the shot wants both, with the sky over them.
    const aim = new THREE.Vector3(
      p.x - Math.sin(ang) * 26,
      p.y + 1 + ease * 8,
      p.z - Math.cos(ang) * 26
    );
    if (this.t < dt * 2) this._look.copy(aim);
    this._look.lerp(aim, Math.min(1, dt * 1.6));
    this.camera.lookAt(this._look);

    if (this.t >= DUR) this.end();
  }
}

/**
 * A city on the horizon, for the overlook to overlook.
 *
 * The viewpoint had a railing, a telescope and a plaque, and nothing in front
 * of any of it. This is what she is looking at: a skyline far enough out to sit
 * beyond the island and low enough to read as distance rather than as a wall,
 * with the scene's own fog doing the work of haze. Windows come on with dusk.
 *
 * Placed in the world rather than inside the set, so the direction can be
 * checked against the terrain — a city dropped blindly at a bearing ends up
 * buried in the next hill along.
 */
export function makeCity(cx, cz, y, facing, { width = 230, seed = 7 } = {}) {
  const group = new THREE.Group();
  group.position.set(cx, y, cz);
  group.rotation.y = facing;

  const rand = (() => {
    let n = seed * 9301 + 49297;
    return () => { n = (n * 9301 + 49297) % 233280; return n / 233280; };
  })();

  const STONE = [0x8fa0b4, 0x9caabb, 0x8494a8, 0xa6b2c0];
  const positions = [], normals = [], colours = [], lightPts = [];
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  const box = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  box.computeVertexNormals();

  const add = (w, h, d, x, y2, z, colour) => {
    m.compose(new THREE.Vector3(x, y2 + h / 2, z), new THREE.Quaternion(),
      new THREE.Vector3(w, h, d));
    const gg = box.clone().applyMatrix4(m);
    const pa = gg.attributes.position.array, na = gg.attributes.normal.array;
    for (let i = 0; i < pa.length; i += 3) {
      positions.push(pa[i], pa[i + 1], pa[i + 2]);
      normals.push(na[i], na[i + 1], na[i + 2]);
      colours.push(colour.r, colour.g, colour.b);
    }
    gg.dispose();
  };

  // Three ranks of blocks, tallest in the middle, thinning to the edges so it
  // reads as a town centre with suburbs either side rather than a barricade.
  for (let rank = 0; rank < 3; rank++) {
    const depth = rank * 26;
    const n = 26 - rank * 4;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1) - 0.5;
      const x = t * width + (rand() - 0.5) * 10;
      const centreness = 1 - Math.min(1, Math.abs(t) * 2.3);
      const h = 5 + centreness * (13 + rand() * 17) - rank * 1.5;
      if (h < 4) continue;
      const w = 8 + rand() * 13, d = 8 + rand() * 13;
      c.setHex(STONE[(rand() * STONE.length) | 0]).multiplyScalar(1 - rank * 0.08);
      add(w, h, d, x, 0, -depth, c);
      // a lit window band near the top of the taller ones
      if (h > 13) lightPts.push([x, h * 0.72, -depth + d / 2]);
      if (h > 20) {                                   // a mast on the tallest
        c.setHex(0x6f7d8e);
        add(1.2, 5, 1.2, x, h, -depth, c);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geo.computeBoundingSphere();
  box.dispose();

  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
    vertexColors: true, flatShading: true,
  }));
  mesh.frustumCulled = false;
  group.add(mesh);

  // The lights, as points that come up with the evening.
  const lp = new Float32Array(lightPts.length * 3);
  lightPts.forEach((q, i) => { lp[i * 3] = q[0]; lp[i * 3 + 1] = q[1]; lp[i * 3 + 2] = q[2]; });
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const lmat = new THREE.PointsMaterial({
    color: 0xffd9a0, size: 3.0, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false,
  });
  const lights = new THREE.Points(lgeo, lmat);
  lights.frustumCulled = false;
  group.add(lights);

  return {
    group,
    update(dusk) { lmat.opacity = Math.max(0, (dusk - 0.25) / 0.75) * 0.85; },
  };
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

/**
 * Shooting stars. One LineSegments draw call for the whole sky: each meteor is
 * a single segment from a bright head to a dark tail, moving fast and
 * respawning on a random delay. Additive, so bloom turns them into streaks.
 *
 * These only appear once she's found the meteor-shower memory — that's the
 * moment the world tips into night. Finding it also fires `burst()`, which
 * runs a real shower for half a minute before settling to the odd streak.
 */
export function makeMeteors(count = 16) {
  const pos = new Float32Array(count * 2 * 3);
  const col = new Float32Array(count * 2 * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });

  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;

  const meteors = [];
  for (let i = 0; i < count; i++) {
    meteors.push({ wait: Math.random() * 9, life: 0, max: 1, len: 0.09,
                   p: new THREE.Vector3(), v: new THREE.Vector3() });
  }

  // The shower itself: a burst when she finds the memory, easing back to the
  // occasional streak. `storm` runs 1 -> 0 over roughly half a minute.
  let storm = 0;

  function launch(m, around, intense) {
    const a = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 80;
    m.p.set(around.x + Math.cos(a) * r,
            around.y + 55 + Math.random() * 35,
            around.z + Math.sin(a) * r);
    // During the shower they mostly run the same way, as a real one does.
    const spread = intense ? 0.5 : Math.PI * 2;
    const dir = (intense ? 2.1 : 0) + (Math.random() - 0.5) * spread;
    const speed = 42 + Math.random() * 30;
    m.v.set(Math.cos(dir) * speed, -16 - Math.random() * 14, Math.sin(dir) * speed);
    m.max = 1.0 + Math.random() * 0.8;
    m.life = m.max;
    m.len = 0.07 + Math.random() * 0.06;
  }

  return {
    lines,
    /** Called once when the meteor-shower memory is opened. */
    burst() { storm = 1; },
    get showering() { return storm > 0.02; },

    update(dt, around, active) {
      mat.opacity += ((active ? 1 : 0) - mat.opacity) * Math.min(1, dt * 1.5);
      if (storm > 0) storm = Math.max(0, storm - dt / 34);
      if (mat.opacity < 0.01) return;

      // At the peak they fall thick and fast; afterwards, one now and then.
      const gapMin = 2.2 - storm * 2.1;
      const gapMax = 12 - storm * 11.4;

      for (let i = 0; i < meteors.length; i++) {
        const m = meteors[i];

        if (m.life <= 0) {
          m.wait -= dt;
          if (active && m.wait <= 0) {
            launch(m, around, storm > 0.25);
            m.wait = gapMin + Math.random() * (gapMax - gapMin);
          }
          for (let k = 0; k < 2; k++) {
            const o = (i * 2 + k) * 3;
            pos[o] = pos[o + 1] = pos[o + 2] = 0;
            col[o] = col[o + 1] = col[o + 2] = 0;
          }
          continue;
        }

        m.life -= dt;
        m.p.addScaledVector(m.v, dt);

        // Bright as it enters, fading as it burns out.
        const t = m.life / m.max;
        const fade = Math.min(1, t * 2.4) * Math.min(1, (1 - t) * 6.0 + 0.25);
        const head = (i * 2) * 3, tail = (i * 2 + 1) * 3;

        pos[head] = m.p.x; pos[head + 1] = m.p.y; pos[head + 2] = m.p.z;
        pos[tail] = m.p.x - m.v.x * m.len;
        pos[tail + 1] = m.p.y - m.v.y * m.len;
        pos[tail + 2] = m.p.z - m.v.z * m.len;

        col[head] = fade; col[head + 1] = fade * 0.96; col[head + 2] = fade * 0.85;
        col[tail] = col[tail + 1] = col[tail + 2] = 0;
      }

      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
