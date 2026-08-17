import * as THREE from 'three';
import { generate, SEA } from './world.js';
import { buildMeshes, addWind } from './voxel.js';
import { Character, HER, HIM } from './character.js';
import { Input, Player, FollowCamera } from './controls.js';
import { makeProp, makeHalo, makeGlow, makeFlowerField, makeLamp } from './props.js';
import { GATE_REQUIREMENT } from './memories.js';

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

// Sky: a vertical gradient baked to a small texture, redrawn as dusk falls.
// Cheaper than a shader dome and it goes through colour management for free.
const SKY_TOP_DAY = new THREE.Color(0x4f9ed6);
const SKY_BOT_DAY = new THREE.Color(0xbfe0f0);
const SKY_TOP_DUSK = new THREE.Color(0x2d2450);
const SKY_BOT_DUSK = new THREE.Color(0xe08a63);

const skyCanvas = document.createElement('canvas');
skyCanvas.width = 4; skyCanvas.height = 128;
const skyCtx = skyCanvas.getContext('2d');
const skyTex = new THREE.CanvasTexture(skyCanvas);
skyTex.colorSpace = THREE.SRGBColorSpace;
skyTex.mapping = THREE.EquirectangularReflectionMapping;
scene.background = skyTex;

const horizon = new THREE.Color();
function paintSky(dusk) {
  const top = SKY_TOP_DAY.clone().lerp(SKY_TOP_DUSK, dusk);
  const bot = SKY_BOT_DAY.clone().lerp(SKY_BOT_DUSK, dusk);
  const grad = skyCtx.createLinearGradient(0, 0, 0, skyCanvas.height);
  grad.addColorStop(0, '#' + top.getHexString());
  grad.addColorStop(0.52, '#' + bot.clone().lerp(top, 0.35).getHexString());
  grad.addColorStop(1, '#' + bot.getHexString());
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
  skyTex.needsUpdate = true;
  horizon.copy(bot);
}
paintSky(0);

scene.fog = new THREE.Fog(horizon.clone(), 70, 210);

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

// --- world --------------------------------------------------------------
const world = generate();
const meshes = buildMeshes(world.grid);
scene.add(meshes.opaque);
if (meshes.water) scene.add(meshes.water);

// Foliage is meshed separately so it can move in the wind.
let advanceWind = () => {};
if (meshes.foliage) {
  scene.add(meshes.foliage);
  advanceWind = addWind(meshes.foliage.material, 0.11);
}
scene.add(makeFlowerField(world.flowers));

// memory props
const nodeObjects = [];
for (const node of world.nodes) {
  const group = new THREE.Group();
  group.position.set(node.x, node.y, node.z);

  const prop = makeProp(node.prop);
  group.add(prop);

  const halo = makeHalo();
  halo.position.y = 1.7;
  group.add(halo);

  const glow = makeGlow(0xffe9a8, 2.6, 0.16);
  glow.position.y = 0.06;
  glow.visible = false;
  group.add(glow);

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
const lookoutTop = world.grid.columnTop(world.lookout.x, world.lookout.z);
him.root.position.set(world.lookout.x + 0.5, lookoutTop + 1, world.lookout.z + 0.5);
him.root.rotation.y = Math.PI;
scene.add(him.root);

// --- input & player -----------------------------------------------------
const input = new Input(renderer.domElement);
const player = new Player(world.grid, world.spawn);
player.spawnX = world.spawn.x + 0.5;
player.spawnZ = world.spawn.z + 0.5;
const follow = new FollowCamera(camera, world.grid);

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
  }
}

refreshCounter();

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
  if (e.code === 'Escape') {
    if (noteOpen) closeNote();
    else toggleJournal();
  }
});

// --- loop ---------------------------------------------------------------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let paintedDusk = 0;
let nearest = null;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  input.update(dt);

  if (!noteOpen && !journalOpen) {
    player.update(dt, input);
  }

  her.root.position.set(player.pos.x, player.pos.y, player.pos.z);
  her.faceTowards(player.yaw, dt);
  her.update(dt, noteOpen ? 0 : player.speed, player.grounded);
  him.update(dt, 0, true);

  follow.update(dt, player.pos, input.orbit);

  // Sun follows the player so shadows stay sharp across a large world.
  sun.position.set(player.pos.x + 45, player.pos.y + 70, player.pos.z + 28);
  sun.target.position.copy(player.pos);

  advanceWind(t);

  // Dusk deepens as she remembers more.
  const dusk = found.size / Math.max(1, world.nodes.length);
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
  let best = 3.2;
  for (const n of nodeObjects) {
    n.halo.rotation.y += dt * 1.1;
    n.halo.position.y = 1.7 + Math.sin(t * 1.8) * 0.09;
    if (n.node.found) continue;
    const d = Math.hypot(n.group.position.x - player.pos.x, n.group.position.z - player.pos.z);
    const dy = Math.abs(n.group.position.y - player.pos.y);
    if (d < best && dy < 3) { best = d; nearest = n; }
  }

  ui.prompt.hidden = !nearest || noteOpen || journalOpen;

  if (input.consumeInteract() && !noteOpen && !journalOpen && nearest) {
    markFound(nearest);
    openNote(nearest.node);
  }

  renderer.render(scene, camera);
}

ui.loading.hidden = true;
renderer.domElement.focus();
frame();

// Expose a little for tuning from the console during the build.
window.BM = { world, player, input, scene, found, GATE_REQUIREMENT, SEA };
