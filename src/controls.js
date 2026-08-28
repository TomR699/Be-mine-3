import * as THREE from 'three';
import { isPassable, B } from './voxel.js';

export class Input {
  constructor(dom) {
    this.keys = new Set();
    this.orbit = { yaw: Math.PI * 0.75, pitch: 0.62, dist: 14 };
    this.dragging = false;
    this._last = { x: 0, y: 0 };
    this.interactPressed = false;
    this.jumpPressed = false;

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      this.keys.add(k);
      if (k === 'KeyE' || k === 'Enter') this.interactPressed = true;
      if (k === 'Space') { this.jumpPressed = true; e.preventDefault(); }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    // A key held while focus leaves never sends its keyup, so it stays down
    // for ever — she comes back to a character running on her own.
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.keys.clear();
    });

    dom.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this._last = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointerup', (e) => {
      this.dragging = false;
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this._last.x, dy = e.clientY - this._last.y;
      this._last = { x: e.clientX, y: e.clientY };
      this.orbit.yaw -= dx * 0.006;
      this.orbit.pitch = clamp(this.orbit.pitch + dy * 0.005, 0.08, 1.35);
    });
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.orbit.dist = clamp(this.orbit.dist + Math.sign(e.deltaY) * 1.1, 4, 26);
    }, { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  has(...codes) { return codes.some((c) => this.keys.has(c)); }

  /** Desired move direction in world space, relative to where the camera looks. */
  moveVector() {
    let f = 0, s = 0;
    if (this.has('KeyW', 'ArrowUp')) f += 1;
    if (this.has('KeyS', 'ArrowDown')) f -= 1;
    if (this.has('KeyA', 'ArrowLeft')) s -= 1;
    if (this.has('KeyD', 'ArrowRight')) s += 1;
    if (f === 0 && s === 0) return null;

    const yaw = this.orbit.yaw;
    // The camera sits at focus + (sin yaw, _, cos yaw) and looks back at her,
    // so forward on the ground is the negative of that. Right is
    // cross(forward, up) — which is +cos, -sin, not the other way round.
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const vx = fx * f + rx * s, vz = fz * f + rz * s;
    const len = Math.hypot(vx, vz) || 1;
    return { x: vx / len, z: vz / len };
  }

  update() {
    // Q and Shift+E used to spin the camera. Nothing documented them, the
    // mouse already orbits, and Shift+E is *run plus interact* — so running up
    // to a memory and pressing E swung the view every time. Holding both just
    // kept turning. Two live keys is too high a price for a hidden third way
    // to do something the mouse does better.
  }

  consumeInteract() { const v = this.interactPressed; this.interactPressed = false; return v; }
  consumeJump() { const v = this.jumpPressed; this.jumpPressed = false; return v; }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// --- player physics -----------------------------------------------------

const HALF = 0.3;       // horizontal half-width
const HEIGHT = 2.0;     // collision height
const GRAVITY = -26;
const JUMP = 8.4;
// Her legs are 0.75 m. Much above this and the cadence needed to keep the
// feet on the ground looks frantic no matter how the cycle is tuned.
const WALK = 2.8;
const RUN = 5.0;
const SWIM = 2.2;
const ACCEL = 22;

export class Player {
  constructor(grid, spawn) {
    this.grid = grid;
    this.pos = new THREE.Vector3(spawn.x + 0.5, 0, spawn.z + 0.5);
    this.pos.y = this.grid.columnTop(spawn.x, spawn.z) + 1;
    this.vel = new THREE.Vector3();
    this.grounded = true;
    this.yaw = 0;
    this.speed = 0;
    // Solid things that aren't blocks — currently just the gate.
    this.barriers = [];
  }

  /** Oriented box barrier, tested in the barrier's own local space. */
  inBarrier(x, z) {
    for (const bar of this.barriers) {
      if (bar.open) continue;
      const dx = x - bar.x, dz = z - bar.z;
      const c = Math.cos(bar.facing), s = Math.sin(bar.facing);
      const lx = dx * c - dz * s;   // across the gate
      const lz = dx * s + dz * c;   // along the path
      if (Math.abs(lx) < bar.halfWidth + HALF && Math.abs(lz) < bar.halfDepth + HALF) {
        return true;
      }
    }
    return false;
  }

  solidAt(x, y, z) {
    return !isPassable(this.grid.get(Math.floor(x), Math.floor(y), Math.floor(z)));
  }

  // Does the box centred on (x, z) with feet at y overlap anything solid?
  blocked(x, y, z) {
    if (this.inBarrier(x, z)) return true;
    const x0 = Math.floor(x - HALF), x1 = Math.floor(x + HALF);
    const z0 = Math.floor(z - HALF), z1 = Math.floor(z + HALF);
    const y0 = Math.floor(y + 0.02), y1 = Math.floor(y + HEIGHT - 0.02);
    for (let yy = y0; yy <= y1; yy++)
      for (let zz = z0; zz <= z1; zz++)
        for (let xx = x0; xx <= x1; xx++)
          if (this.solidAt(xx + 0.5, yy + 0.5, zz + 0.5)) return true;
    return false;
  }

  /** Is her chest in water? Drives swimming. */
  get inWater() {
    return this.grid.get(
      Math.floor(this.pos.x), Math.floor(this.pos.y + 1.0), Math.floor(this.pos.z)
    ) === B.WATER;
  }

  update(dt, input) {
    const want = input.moveVector();
    const running = input.has('ShiftLeft', 'ShiftRight');
    const swimming = this.inWater;
    const base = swimming ? SWIM : (running ? RUN : WALK);
    const target = want ? base : 0;

    // Horizontal velocity eases toward the desired direction.
    const tvx = want ? want.x * target : 0;
    const tvz = want ? want.z * target : 0;
    const k = Math.min(1, dt * (swimming ? ACCEL * 0.35 : ACCEL));
    this.vel.x += (tvx - this.vel.x) * k;
    this.vel.z += (tvz - this.vel.z) * k;

    const jump = input.consumeJump();

    if (swimming) {
      // Buoyancy: she bobs up to the surface rather than sinking to the sea
      // floor, and space paddles upward so she can always get out.
      const surface = this.waterSurface();
      const lift = (surface - 1.0 - this.pos.y) * 9;
      this.vel.y += (lift - this.vel.y) * Math.min(1, dt * 5);
      if (input.has('Space') || jump) this.vel.y = Math.max(this.vel.y, 3.4);
      this.vel.y = Math.max(-5, Math.min(6, this.vel.y));
      this.grounded = false;
    } else {
      if (jump && this.grounded) {
        this.vel.y = JUMP;
        this.grounded = false;
      } else if (this.grounded && this.vel.y < 0) {
        this.vel.y = 0;          // no creeping downward while stood still
      }
      this.vel.y = Math.max(-40, this.vel.y + GRAVITY * dt);
    }

    this.moveAxis('x', this.vel.x * dt);
    this.moveAxis('z', this.vel.z * dt);
    this.moveAxis('y', this.vel.y * dt);

    // Whether she's on the ground is a question about the ground, not about
    // whether the last downward move happened to collide. At 60fps she falls
    // ~0.007 of a block per frame — too little to trip the collision epsilon —
    // so inferring it flickered grounded off every other frame, which froze the
    // walk cycle into the airborne pose and made her height jitter.
    if (!swimming) {
      const standing = this.blocked(this.pos.x, this.pos.y - 0.12, this.pos.z);
      this.grounded = standing && this.vel.y <= 0.001;
      if (this.grounded) {
        this.vel.y = 0;
        this.pos.y = Math.round(this.pos.y);   // settle onto the block surface
      }
    }

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.swimming = swimming;
    if (want) this.yaw = Math.atan2(want.x, want.z);

    // Don't let her fall out of the world if she walks off the island.
    if (this.pos.y < -8) {
      this.pos.set(this.spawnX ?? this.pos.x, 30, this.spawnZ ?? this.pos.z);
      this.vel.set(0, 0, 0);
    }
  }

  /** Y of the air block just above the water column she's in. */
  waterSurface() {
    const x = Math.floor(this.pos.x), z = Math.floor(this.pos.z);
    let y = Math.floor(this.pos.y + 1.0);
    while (y < this.grid.sy && this.grid.get(x, y, z) === B.WATER) y++;
    return y;
  }

  moveAxis(axis, amount) {
    if (amount === 0) return;
    const before = this.pos[axis];
    this.pos[axis] += amount;

    if (!this.blocked(this.pos.x, this.pos.y, this.pos.z)) return;

    // Auto-step: walking into a single block just steps up onto it.
    if ((axis === 'x' || axis === 'z') && this.grounded) {
      const lifted = this.pos.y + 1.02;
      if (!this.blocked(this.pos.x, lifted, this.pos.z)) {
        this.pos.y = lifted;
        return;
      }
    }

    this.pos[axis] = before;
    if (axis === 'y') this.vel.y = 0;
    else this.vel[axis] = 0;
  }
}

// --- camera -------------------------------------------------------------

export class FollowCamera {
  /**
   * `groundAt` is optional. When the visible ground is smooth but the grid is
   * blocky, testing the grid pulls the camera in against terrain that isn't
   * really there — which jams it inside her head.
   */
  constructor(camera, grid, groundAt = null) {
    this.camera = camera;
    this.grid = grid;
    this.groundAt = groundAt;
    this.current = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this.initialised = false;
  }

  update(dt, target, orbit) {
    const focus = new THREE.Vector3(target.x, target.y + 1.4, target.z);
    const cp = Math.cos(orbit.pitch);
    let dist = orbit.dist;

    const dir = new THREE.Vector3(
      Math.sin(orbit.yaw) * cp,
      Math.sin(orbit.pitch),
      Math.cos(orbit.yaw) * cp
    );

    // Pull the camera in if terrain would sit between it and her.
    for (let d = 0.5; d <= dist; d += 0.5) {
      const p = focus.clone().addScaledVector(dir, d);
      const blocked = this.groundAt
        ? p.y < this.groundAt(p.x, p.z) + 0.4
        : !isPassable(this.grid.get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)));
      if (blocked) {
        dist = Math.max(3.6, d - 0.6);
        break;
      }
    }

    const want = focus.clone().addScaledVector(dir, dist);
    if (!this.initialised) {
      this.current.copy(want);
      this.lookAt.copy(focus);
      this.initialised = true;
    } else {
      this.current.lerp(want, Math.min(1, dt * 9));
      this.lookAt.lerp(focus, Math.min(1, dt * 12));
    }

    this.camera.position.copy(this.current);
    this.camera.lookAt(this.lookAt);
  }
}
