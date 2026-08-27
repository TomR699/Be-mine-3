import * as THREE from 'three';
import { generate, SEA, SX, SZ } from './world.js';
import {
  buildLowPolyTerrain, buildLowPolyWater, buildLowPolyTrees,
  makeGroundSampler, addTreeWind,
} from './lowpoly.js';

// Art style. ?style=voxel falls back to the block renderer — the two share
// the same world, so it is a pure A/B.
const LOWPOLY = new URLSearchParams(location.search).get('style') !== 'voxel';
import { buildMeshes, addWind, addWaves } from './voxel.js';
import { Character, HER, HIM } from './character.js';
import { Input, Player, FollowCamera } from './controls.js';
import { makeProp, makeHalo, makeGlow, makeFlowerField, makeLamp } from './props.js';
import { makeSet, HERO_OFFSET } from './sets.js';
import { GATE_REQUIREMENT } from './memories.js';
import { Ending, makeGate, makeFireflies, makeTownLights, makeMeteors } from './ending.js';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { BokehPass } from '../vendor/addons/postprocessing/BokehPass.js';

const SAVE_KEY = 'be-mine-3.save.v1';

const ui = {
  counter: document.getElementById('counter'),
  prompt: document.getElementById('prompt'),
  note: document.getElementById('note'),
  noteTitle: document.getElementById('note-title'),
  noteWhen: document.getElementById('note-when'),
  noteText: document.getElementById('note-text'),
  noteClose: document.getElementById('note-close'),
  loading: document.getElementById('loading'),
  journal: document.getElementById('journal'),
  journalList: document.getElementById('journal-list'),
  letterbox: document.getElementById('letterbox'),
  line: document.getElementById('line'),
  ask: document.getElementById('ask'),
  question: document.getElementById('question'),
  yes: document.getElementById('yes'),
  other: document.getElementById('other'),
  hint: document.getElementById('hint'),
};

// --- scene --------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('game'),
  antialias: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Filmic response instead of a linear clip: highlights roll off rather than
// blowing out, which is what stops the lit faces reading as flat paint.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 500);

// Sky: an inverted dome with a vertex-coloured gradient, repainted as dusk
// falls. A canvas texture set as scene.background was the obvious approach and
// it does not reliably re-upload once the renderer has cached it — the fog
// went orange while the sky stayed blue. Vertex colours always update.
const SKY_TOP_DAY = new THREE.Color(0x4f9ed6);
const SKY_BOT_DAY = new THREE.Color(0xbfe0f0);
const SKY_TOP_DUSK = new THREE.Color(0x241c46);
const SKY_BOT_DUSK = new THREE.Color(0xe08a63);
const SKY_R = 300;

const skyGeo = new THREE.SphereGeometry(SKY_R, 20, 14);
const skyColors = new Float32Array(skyGeo.attributes.position.count * 3);
skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
const skyMesh = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({
  side: THREE.BackSide, vertexColors: true, fog: false, depthWrite: false,
}));
skyMesh.renderOrder = -1;
scene.add(skyMesh);

const horizon = new THREE.Color();
const _skyC = new THREE.Color();
function paintSky(dusk) {
  const top = SKY_TOP_DAY.clone().lerp(SKY_TOP_DUSK, dusk);
  const bot = SKY_BOT_DAY.clone().lerp(SKY_BOT_DUSK, dusk);
  const pos = skyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const h = Math.max(0, Math.min(1, (pos.getY(i) / SKY_R) * 1.35 + 0.32));
    _skyC.copy(bot).lerp(top, h);
    skyColors[i * 3] = _skyC.r;
    skyColors[i * 3 + 1] = _skyC.g;
    skyColors[i * 3 + 2] = _skyC.b;
  }
  skyGeo.attributes.color.needsUpdate = true;
  horizon.copy(bot);
}
paintSky(0);

// Far enough that the whole island is visible from the lookout — the view
// down over the valley is the point of standing up there.
scene.fog = new THREE.Fog(horizon.clone(), 115, 340);

const hemi = new THREE.HemisphereLight(0xbfd9ef, 0x6a7560, 1.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0d4, 1.55);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 220;
sun.shadow.bias = -0.0012;
scene.add(sun);
scene.add(sun.target);

// Bloom. Lantern heads, fireflies and the heart burst are additive, so this
// is what turns them from bright pixels into light.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.75, 0.72);
composer.addPass(bloom);

// Shallow depth of field. Blocks read as a handmade diorama rather than a
// screenshot of Minecraft largely because of this — the eye is told what to
// look at, and the far hills go soft the way a miniature does.
const dof = new BokehPass(scene, camera, { focus: 14, aperture: 0.00016, maxblur: 0.006 });
composer.addPass(dof);

composer.addPass(new OutputPass());

// --- world --------------------------------------------------------------
const world = generate();

// The visible ground. In low-poly the surface is smooth while collision stays
// blocky underneath, so everything that sits on the ground is placed by this
// rather than by the voxel column it happens to be standing in.
const groundAt = makeGroundSampler(world.height, SX, SZ);

if (LOWPOLY) {
  for (const n of world.nodes) n.y = groundAt(n.x, n.z);
  for (const l of world.lamps) l.y = groundAt(l.x, l.z);
  for (const f of world.flowers) f.y = groundAt(f.x, f.z);
  for (const t of world.trees) t.y = groundAt(t.x, t.z) - 0.3;
  world.gate.y = groundAt(world.gate.x, world.gate.z);
}

let advanceWind = () => {};
let advanceWater = () => {};

if (LOWPOLY) {
  const terrain = buildLowPolyTerrain(world.height, world.pathMask, SX, SZ);
  scene.add(terrain);

  const trees = buildLowPolyTrees(world.trees);
  scene.add(trees);
  advanceWind = addTreeWind(trees.material);

  const water = buildLowPolyWater(SX, SZ);
  scene.add(water);
  advanceWater = addWaves(water.material);
} else {
  const meshes = buildMeshes(world.grid);
  scene.add(meshes.opaque);
  if (meshes.water) {
    scene.add(meshes.water);
    advanceWater = addWaves(meshes.water.material);
  }
  if (meshes.foliage) {
    scene.add(meshes.foliage);
    advanceWind = addWind(meshes.foliage.material, 0.11);
  }
}
scene.add(makeFlowerField(world.flowers));

// Memory checkpoints: a dressed set, with the memory's own object as its hero.
// Every node sits back from the path by the same offset, so every set turns the
// same way — toward the path she walks in on.
const SET_FACING = Math.PI / 4;

const nodeObjects = [];
for (const node of world.nodes) {
  const group = new THREE.Group();
  group.position.set(node.x, node.y, node.z);

  // Everything sits inside a rotated container, so hero offsets can be written
  // in the set's own space rather than pre-rotated by hand.
  const dress = new THREE.Group();
  dress.rotation.y = SET_FACING;
  group.add(dress);

  const set = makeSet(node.id);
  if (set) dress.add(set);

  const [ox, oy, oz] = HERO_OFFSET[node.id] || [0, 0, 0];

  const prop = makeProp(node.prop);
  prop.position.set(ox, oy, oz);
  dress.add(prop);

  const halo = makeHalo();
  halo.position.set(ox, oy + 1.7, oz);
  dress.add(halo);

  const glow = makeGlow(0xffe9a8, 2.6, 0.16);
  glow.position.set(ox, oy + 0.06, oz);
  glow.visible = false;
  dress.add(glow);

  scene.add(group);
  nodeObjects.push({ node, group, halo, glow, prop });
}

// Path lamps. Each lights as she remembers more, so the route behind her
// fills with light she made.
const lamps = world.lamps.map((l) => {
  const { group, headMat } = makeLamp();
  group.position.set(l.x, l.y, l.z);
  scene.add(group);

  const glow = makeGlow(0xffd98a, 6, 0);
  glow.position.set(l.x, l.y + 0.06, l.z);
  scene.add(glow);

  return { headMat, glow, lit: false };
});

// --- characters ---------------------------------------------------------
const her = new Character(HER);
scene.add(her.root);

const him = new Character(HIM);
const lookoutTop = LOWPOLY
  ? groundAt(world.lookout.x + 0.5, world.lookout.z + 0.5) - 1
  : world.grid.columnTop(world.lookout.x, world.lookout.z);
scene.add(him.root);

// The bench at the top. She reads about a bench above a town, then climbs to
// one — the last memory before the gate is the place the ending happens.
// The bench faces out over the island, because that's the view. Its local +Z
// is the front, so its rotation is simply the direction they look.
const viewDir = new THREE.Vector3(
  SX / 2 - world.lookout.x, 0, SZ / 2 - world.lookout.z
).normalize();
const benchFacing = Math.atan2(viewDir.x, viewDir.z);

// Out at the lip of the mesa rather than the middle of it, so what's past
// them is the drop and the valley instead of more hilltop.
const benchX = world.lookout.x + 0.5 + viewDir.x * 8;
const benchZ = world.lookout.z + 0.5 + viewDir.z * 8;
const benchY = LOWPOLY
  ? groundAt(benchX, benchZ)
  : world.grid.columnTop(Math.floor(benchX), Math.floor(benchZ)) + 1;
const benchPos = new THREE.Vector3(benchX, benchY, benchZ);

const lookoutBench = makeProp('bench');
lookoutBench.position.copy(benchPos);
lookoutBench.rotation.y = benchFacing;
scene.add(lookoutBench);

// Seats, offset along the bench's local X. The seat surface sits ~0.5 above
// the bench origin, and a character meets a seat at its hip.
const SEAT_TOP = 0.5;
function seatAt(localX, character) {
  const c = Math.cos(benchFacing), s = Math.sin(benchFacing);
  return {
    x: benchPos.x + localX * c,
    z: benchPos.z - localX * s,
    y: benchPos.y + SEAT_TOP - character.hipHeight,
  };
}

// He's been sitting there the whole time, which is a nice thing to catch sight
// of from down on the path long before she gets up there.
const seatHim = seatAt(-0.4, him);
const seatHer = seatAt(0.42, her);
him.root.position.set(seatHim.x, seatHim.y, seatHim.z);
him.root.rotation.y = benchFacing;
him.setSitting(true);

// --- the gate ------------------------------------------------------------
const gate = makeGate(world.gate.x, world.gate.y, world.gate.z, world.gate.facing);
scene.add(gate.group);

// --- fireflies, which arrive with the dusk -------------------------------
const fireflies = makeFireflies(
  240,
  new THREE.Vector3(world.gate.x - 6, world.gate.y - 1, world.gate.z + 4),
  26
);
scene.add(fireflies.points);

// The valley below the lookout, lit up. This is the view she should get when
// she reaches the top at dusk.
const townLights = makeTownLights(world.grid, world.lookout, SEA);
scene.add(townLights.points);

const meteors = makeMeteors(7);
scene.add(meteors.lines);

// --- input & player -----------------------------------------------------
const input = new Input(renderer.domElement);
const player = new Player(world.grid, world.spawn);
player.spawnX = world.spawn.x + 0.5;
player.spawnZ = world.spawn.z + 0.5;
const follow = new FollowCamera(camera, world.grid, LOWPOLY ? groundAt : null);

player.barriers.push({
  x: world.gate.x, z: world.gate.z, facing: world.gate.facing,
  halfWidth: 3.0, halfDepth: 0.55,
  get open() { return gate.isOpen; },
});

// --- progress -----------------------------------------------------------
let found = new Set();
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) found = new Set(JSON.parse(raw).found || []);
} catch { /* a corrupt save should never stop the game starting */ }

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ found: [...found] }));
  } catch { /* private browsing — play on without persistence */ }
}

function refreshCounter() {
  ui.counter.textContent = `${found.size} / ${world.nodes.length} remembered`;
  const litCount = Math.round((found.size / Math.max(1, world.nodes.length)) * lamps.length);
  lamps.forEach((lamp, i) => {
    const on = i < litCount;
    if (on === lamp.lit) return;
    lamp.lit = on;
    lamp.headMat.color.setHex(on ? 0xffe9a8 : 0x6e6684);
    lamp.headMat.emissive.setHex(on ? 0x6b4d16 : 0x000000);
    lamp.glow.material.opacity = on ? 0.3 : 0;
  });
}

for (const n of nodeObjects) {
  if (found.has(n.node.id)) markFound(n, true);
}

function markFound(n, silent) {
  n.node.found = true;
  n.halo.visible = false;
  n.glow.visible = true;
  n.prop.traverse((o) => {
    if (o.isMesh && o.material.emissive) o.material.emissive.setHex(0x3a2c10);
  });
  if (!silent) {
    found.add(n.node.id);
    save();
    refreshCounter();
    checkGate();
  }
}

// --- the ending ----------------------------------------------------------
const ending = new Ending({
  scene, camera, her, him, player, gate,
  bench: { x: benchPos.x, y: benchPos.y, z: benchPos.z, facing: benchFacing, seatHer, seatHim },
  ui: { letterbox: ui.letterbox, hud: [ui.counter, ui.hint] },
});

function checkGate() {
  if (found.size >= GATE_REQUIREMENT) ending.unlock();
}

refreshCounter();
checkGate();

// --- note panel ---------------------------------------------------------
let noteOpen = false;
function openNote(node) {
  noteOpen = true;
  ui.noteTitle.textContent = node.title;
  ui.noteWhen.textContent = node.when;
  ui.noteText.textContent = node.text;
  ui.note.hidden = false;
  ui.noteClose.focus();
}
function closeNote() {
  noteOpen = false;
  ui.note.hidden = true;
  renderer.domElement.focus();
}
ui.noteClose.addEventListener('click', closeNote);

let journalOpen = false;
function toggleJournal() {
  journalOpen = !journalOpen;
  ui.journal.hidden = !journalOpen;
  if (!journalOpen) return;
  ui.journalList.innerHTML = '';
  for (const { node } of nodeObjects) {
    const li = document.createElement('li');
    li.className = node.found ? 'got' : 'missing';
    li.textContent = node.found ? node.title : '— not yet found —';
    ui.journalList.appendChild(li);
  }
}

addEventListener('keydown', (e) => {
  // No words, no buttons — but Enter during the bench scene sets off the
  // hearts, if she says yes and you want the sky to say something.
  if (e.code === 'Enter' && ending.state === 'seated') { ending.celebrate(); return; }
  if (e.code === 'Space' && ending.locksInput) return;

  // Rehearsal shortcut: jump to the ending with everything found. For your
  // dry run, and for the unthinkable case of something going wrong in the room.
  if (e.code === 'KeyE' && e.ctrlKey && e.shiftKey) {
    nodeObjects.forEach((n) => { if (!n.node.found) markFound(n); });
    const l = world.lookout;
    const ry = LOWPOLY ? groundAt(l.x + 0.5, l.z + 0.5) : world.grid.columnTop(l.x, l.z) + 1;
    player.pos.set(l.x + 0.5, ry, l.z + 0.5);
    player.vel.set(0, 0, 0);
    return;
  }

  if (e.code === 'Escape') {
    if (noteOpen) closeNote();
    else if (!ending.locksInput) toggleJournal();
  }
});

// --- loop ---------------------------------------------------------------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let paintedDusk = 0;
let dusk = 0;
let smoothY = null;
let nearest = null;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  input.update(dt);

  if (!noteOpen && !journalOpen && !ending.locksInput) {
    player.update(dt, input);
  }
  gate.update(dt);
  ending.update(dt);
  ending.checkApproach();

  // Physics is blocky, the ground is smooth: drop her onto what she can see.
  let renderY = player.pos.y;
  if (ending.forcedY !== null) {
    renderY = ending.forcedY;
    smoothY = renderY;
  } else if (LOWPOLY) {
    const g = groundAt(player.pos.x, player.pos.z);
    const want = player.grounded ? g : Math.max(player.pos.y, g);
    smoothY = smoothY === null ? want : smoothY + (want - smoothY) * Math.min(1, dt * 16);
    renderY = smoothY;
  }
  her.root.position.set(player.pos.x, renderY, player.pos.z);
  her.faceTowards(player.yaw, dt);
  her.update(dt, noteOpen ? 0 : player.speed, player.grounded);
  him.update(dt, 0, true);

  if (!ending.inControlOfCamera) follow.update(dt, player.pos, input.orbit);
  skyMesh.position.copy(camera.position);

  // Sun follows the player so shadows stay sharp across a large world.
  sun.position.set(player.pos.x + 45, player.pos.y + 70, player.pos.z + 28);
  sun.target.position.copy(player.pos);

  advanceWind(t);
  advanceWater(t);

  // Dusk deepens as she remembers more — but the meteor-shower memory is the
  // hinge. Before she finds it the world only reaches late afternoon; finding
  // it tips the sky into night, and the meteors start.
  const progress = found.size / Math.max(1, world.nodes.length);
  const nightTurned = world.nodes.some((n) => n.turns === 'night' && found.has(n.id));
  const duskTarget = nightTurned
    ? Math.min(1, 0.66 + progress * 0.34)
    : progress * 0.5;
  // Eased, so the change reads as the sky turning rather than a hard cut.
  dusk += (duskTarget - dusk) * Math.min(1, dt * 0.5);

  meteors.update(dt, player.pos, nightTurned);

  if (Math.abs(dusk - paintedDusk) > 0.005) {
    paintedDusk = dusk;
    paintSky(dusk * 0.9);
  }
  scene.fog.color.copy(horizon);
  hemi.intensity = 1.15 - dusk * 0.45;
  sun.intensity = 1.55 - dusk * 0.7;
  sun.color.setHSL(0.09, 0.35 + dusk * 0.3, 0.62 - dusk * 0.1);

  // Find the closest unopened memory within reach.
  nearest = null;
  let best = 6.5;
  for (const n of nodeObjects) {
    n.halo.rotation.y += dt * 1.1;
    n.halo.position.y = 1.7 + Math.sin(t * 1.8) * 0.09;
    if (n.node.found) continue;
    const d = Math.hypot(n.group.position.x - player.pos.x, n.group.position.z - player.pos.z);
    const dy = Math.abs(n.group.position.y - player.pos.y);
    if (d < best && dy < 3) { best = d; nearest = n; }
  }

  ui.prompt.hidden = !nearest || noteOpen || journalOpen || ending.locksInput;
  fireflies.update(t, dusk);
  townLights.update(t, dusk);

  if (input.consumeInteract() && !noteOpen && !journalOpen && !ending.locksInput && nearest) {
    markFound(nearest);
    openNote(nearest.node);
  }

  // Focus tracks her distance from the camera, so she is always sharp.
  const focusDist = camera.position.distanceTo(her.root.position);
  dof.uniforms.focus.value += (focusDist - dof.uniforms.focus.value) * Math.min(1, dt * 2.5);
  // The ending is intimate: tighter focus, more falloff.
  const wantAperture = ending.inControlOfCamera ? 0.00022 : 0.00016;
  dof.uniforms.aperture.value +=
    (wantAperture - dof.uniforms.aperture.value) * Math.min(1, dt * 0.8);

  composer.render();
}

ui.loading.hidden = true;
renderer.domElement.focus();
frame();

// Expose a little for tuning from the console during the build.
window.BM = { world, player, input, scene, found, ending, gate, townLights, groundAt, LOWPOLY, GATE_REQUIREMENT, SEA, nodeObjects, markFound, checkGate };
