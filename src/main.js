import * as THREE from 'three';
import { generate, SEA, SX, SZ } from './world.js';
import {
  buildLowPolyTerrain, buildLowPolyTrees, buildScatter, buildCobbles,
  makeGroundSampler, addTreeWind,
} from './lowpoly.js';

// Art style. ?style=voxel falls back to the block renderer — the two share
// the same world, so it is a pure A/B.
const LOWPOLY = new URLSearchParams(location.search).get('style') !== 'voxel';
import { buildMeshes, addWind, addWaves } from './voxel.js';
import { Character, HER, HIM } from './character.js';
import { Input, Player, FollowCamera } from './controls.js';
import {
  makeProp, makeHalo, makeGlow, makeFlowerField, makeLamp, makeLightPool, makeLightCone,
  makeSignpost, makeStair, makeTerrace, makeLookoutBench,
} from './props.js';
import { makeSet, mergeFlat, HERO_OFFSET } from './sets.js';
import { GATE_REQUIREMENT, HER_NAME, TITLE_LINE } from './memories.js';
import { Sound } from './audio.js';
import {
  Ending, SkyCutscene, makeGate, makeFireflies, makeTownLights, makeMeteors, makeCity,
} from './ending.js';
import { makeSky } from './sky.js';
import { makeWater } from './water.js';
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
  curtain: document.getElementById('curtain'),
  line: document.getElementById('line'),
  ask: document.getElementById('ask'),
  question: document.getElementById('question'),
  yes: document.getElementById('yes'),
  other: document.getElementById('other'),
  hint: document.getElementById('hint'),
  title: document.getElementById('title'),
  titleName: document.getElementById('title-name'),
  titleLine: document.getElementById('title-line'),
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
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 700);

// Sky: a shader dome carrying a gradient, the sun, and a field of stars that
// comes out as the world turns to night. It follows the camera every frame.
const sky = makeSky(320);
scene.add(sky.mesh);
const horizon = sky.horizon;

// Far enough that the whole island is visible from the lookout — the view
// down over the valley is the point of standing up there.
scene.fog = new THREE.Fog(new THREE.Color(0xdcecf4), 130, 460);

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

// A whisper of depth of field. It used to be a lot stronger, which read as a
// handmade diorama but also softened the whole island and the sky along with
// it — and the sky is worth looking at. Now it only takes the hard edge off
// the very near foreground, and everything past her stays sharp.
const dof = new BokehPass(scene, camera, { focus: 14, aperture: 0.00004, maxblur: 0.0016 });
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
  for (const d of world.decor) d.y = groundAt(d.x, d.z) - 0.15;
  world.gate.y = groundAt(world.gate.x, world.gate.z);
}

let advanceWind = () => {};
let advanceWater = () => {};
let water = null;          // the shader sea, in low-poly mode

if (LOWPOLY) {
  const terrain = buildLowPolyTerrain(world.height, world.pathMask, SX, SZ, world.spurMask);
  scene.add(terrain);

  const trees = buildLowPolyTrees(world.trees);
  scene.add(trees);
  advanceWind = addTreeWind(trees.material);

  scene.add(buildScatter(world.decor));
  // Stones set into each spur, so the way off the path is something you can
  // see rather than something you have to notice.
  scene.add(buildCobbles(world.cobbles, groundAt));

  water = makeWater(SX, SZ, world.height);
  scene.add(water.mesh);
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
  // Voxel mode is meant to be a true A/B of the same world, so it gets the
  // cobbles too — sat on top of the blocky ground rather than the smooth one.
  scene.add(buildCobbles(world.cobbles, (x, z) => world.grid.columnTop(x, z) + 1));
}
scene.add(makeFlowerField(world.flowers));

// Memory checkpoints: a dressed set, with the memory's own object as its hero.
// Each node carries the facing chosen when its terrace was cut, so every set
// opens toward the stretch of path she actually arrives from.

const nodeObjects = [];
for (const node of world.nodes) {
  const group = new THREE.Group();
  group.position.set(node.x, node.y, node.z);

  // Everything sits inside a rotated container, so hero offsets can be written
  // in the set's own space rather than pre-rotated by hand.
  const dress = new THREE.Group();
  dress.rotation.y = node.facing ?? 0;
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
const groundFor = (x, z) => (LOWPOLY ? groundAt(x, z) : world.grid.columnTop(x, z) + 1);
const lamps = world.lamps.map((l) => {
  const { group, headMat } = makeLamp();
  group.position.set(l.x, l.y, l.z);
  scene.add(group);

  // A pool of light that follows the ground, and a faint cone joining it to
  // the bulb — see makeLightPool. Both are additive and both start dark.
  const pool = makeLightPool(l.x, l.z, groundFor, { radius: 4.6 });
  scene.add(pool.mesh);
  const cone = makeLightCone(l.y + 2.97, l.y, 2.2);
  cone.mesh.position.x = l.x;
  cone.mesh.position.z = l.z;
  scene.add(cone.mesh);

  return { headMat, pool, cone, lit: false, glowAt: 0 };
});

// A fingerpost where each spur leaves the main path, pointing at what's down
// it. The spur alone doesn't say there is anywhere at the end of it.
for (const j of world.junctions) {
  const post = makeSignpost();
  post.position.set(j.x + 0.5, groundFor(j.x + 0.5, j.z + 0.5), j.z + 0.5);
  post.rotation.y = j.facing;
  scene.add(post);
}

// The city the overlook overlooks. Its bearing is taken from the set's own
// facing — the view is the side away from the path — and the distance is found
// by walking out until the land runs out, so it always sits on open water
// rather than inside the next hill.
let city = null;
{
  const look = world.nodes.find((n) => n.id === 'the-bench');
  if (look) {
    const dx = -Math.sin(look.facing), dz = -Math.cos(look.facing);
    let shore = 40;
    for (let d = 10; d <= 190; d += 4) {
      const x = look.x + dx * d, z = look.z + dz * d;
      if (x < 0 || z < 0 || x >= SX || z >= SZ) break;
      if (world.height[Math.floor(x) + Math.floor(z) * SX] > SEA) shore = d;
    }
    // Far enough that it is scenery on the horizon rather than a wall at the
    // end of the garden. The first attempt sat it seventy blocks past the
    // shore, where a thirty-storey tower fills half the sky.
    const out = shore + 175;
    city = makeCity(look.x + dx * out, look.z + dz * out, SEA - 5,
      Math.atan2(dx, dz), { width: 320, seed: 11 });
    scene.add(city.group);
  }
}

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
// The spot and its facing come from the generator, which levelled the ground
// for them — computing it here as well is how the bench ended up with a leg
// over a drop.
const viewDir = new THREE.Vector3(world.benchSpot.view.x, 0, world.benchSpot.view.z);
const benchFacing = world.benchSpot.facing;
const benchX = world.benchSpot.x;
const benchZ = world.benchSpot.z;
const benchY = LOWPOLY
  ? groundAt(benchX, benchZ)
  : world.grid.columnTop(Math.floor(benchX), Math.floor(benchZ)) + 1;
const benchPos = new THREE.Vector3(benchX, benchY, benchZ);

// A paved terrace under it, and steps up the last of the climb.
const terrace = makeTerrace(6.4);
terrace.position.set(benchX, benchY + 0.01, benchZ);
terrace.rotation.y = benchFacing;
scene.add(terrace);

{
  // Every step in one mesh per colour. There are forty of them and each is
  // half a dozen boxes, which is a couple of hundred draw calls for a
  // staircase.
  const flights = new THREE.Group();
  for (const st of world.stairs) {
    const flight = makeStair(5.2);
    const y = LOWPOLY ? groundAt(st.x, st.z) : st.y + 1;
    flight.position.set(st.x, y + 0.02, st.z);
    flight.rotation.y = st.facing;
    flights.add(flight);
  }
  scene.add(mergeFlat(flights));
}

// Ornamental planting at the top: behind and beside them, never in front.
// The wedge is the same one the generator keeps clear of trees.
{
  const decorate = new THREE.Group();
  const bloom = [0xf0d3dc, 0xe8b65e, 0xd8b0e0, 0xf1ece2, 0xd45a7a];
  for (let i = 0; i < 46; i++) {
    const ang = (i / 46) * Math.PI * 2 + 0.31;
    const dot = Math.sin(ang) * viewDir.x + Math.cos(ang) * viewDir.z;
    if (dot > 0.34) continue;                      // in the sightline
    const r = 10.5 + ((i * 37) % 11) * 0.9;
    const x = benchX + Math.sin(ang) * r, z = benchZ + Math.cos(ang) * r;
    const y = LOWPOLY ? groundAt(x, z) : world.grid.columnTop(x, z) + 1;
    if (i % 5 === 0) {
      // a small blossom tree, kept short so it never crowds the frame
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.2, 6),
        new THREE.MeshLambertMaterial({ color: 0x6b4f36 }));
      trunk.position.set(x, y + 1.1, z);
      trunk.castShadow = true;
      decorate.add(trunk);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0),
        new THREE.MeshLambertMaterial({ color: 0xe7c3d2, flatShading: true }));
      crown.position.set(x, y + 3.0, z);
      crown.castShadow = true;
      decorate.add(crown);
    } else {
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0),
        new THREE.MeshLambertMaterial({ color: 0x4c8a53, flatShading: true }));
      bush.position.set(x, y + 0.45, z);
      bush.castShadow = true;
      decorate.add(bush);
      for (let f = 0; f < 3; f++) {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22),
          new THREE.MeshLambertMaterial({ color: bloom[(i + f) % bloom.length] }));
        head.position.set(x + (f - 1) * 0.5, y + 1.0, z + ((i + f) % 3 - 1) * 0.4);
        decorate.add(head);
      }
    }
  }
  scene.add(mergeFlat(decorate));
}

const lookoutBench = makeLookoutBench();
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
const seatHim = seatAt(-0.55, him);
const seatHer = seatAt(0.58, her);
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

const meteors = makeMeteors(16);
scene.add(meteors.lines);

// --- input & player -----------------------------------------------------
const input = new Input(renderer.domElement);
// Start the camera behind her, looking the way the path goes. The camera sits
// at focus + (sin yaw, _, cos yaw), so behind her is the negated heading.
input.orbit.yaw = Math.atan2(-world.heading.x, -world.heading.z);
const player = new Player(world.grid, world.spawn);
player.yaw = Math.atan2(world.heading.x, world.heading.z);   // facing inland
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
    if (n.node.turns === 'night') { pendingShower = true; pendingSky = true; }
    // each memory a semitone up the scale, so collecting them climbs
    sound.chime([0, 2, 4, 7, 9, 11, 12, 14, 16, 19, 21][found.size % 11]);
  }
}

// --- the ending ----------------------------------------------------------
const ending = new Ending({
  scene, camera, her, him, player, gate,
  bench: { x: benchPos.x, y: benchPos.y, z: benchPos.z, facing: benchFacing, seatHer, seatHim },
  ui: { letterbox: ui.letterbox, hud: [ui.counter, ui.hint], fade: ui.curtain },
});

// Silent until start(), which the title card calls — but constructed here,
// with everything else, rather than down beside the card it is started from.
// Startup can reach it (a saved game arrives with the gate already unlocked),
// and a const declared further down the file is not merely undefined at that
// point, it throws.
const sound = new Sound();

// The sky turning is its own short scene — see SkyCutscene.
const skyScene = new SkyCutscene({
  camera, player, groundAt: LOWPOLY ? groundAt : null,
  ui: { letterbox: ui.letterbox, hud: [ui.counter, ui.hint] },
});

function checkGate(silent) {
  if (found.size >= GATE_REQUIREMENT && ending.state === 'locked') {
    ending.unlock();
    // Opening the gate is a moment; finding it already open because she's
    // reloading a save is not. Only the first one gets the swell.
    if (!silent) sound.swell();
  }
}

refreshCounter();
checkGate(true);

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
    if (!node.found) {
      li.textContent = '— not yet found —';
    } else {
      // the whole memory, so she can read them again without walking back
      const when = document.createElement('span');
      when.className = 'when';
      when.textContent = node.when;
      const title = document.createElement('strong');
      title.textContent = node.title;
      const body = document.createElement('span');
      body.className = 'body';
      body.textContent = node.text;
      li.append(when, title, body);
    }
    ui.journalList.appendChild(li);
  }
}

addEventListener('keydown', (e) => {
  // No words, no buttons — but Enter during the bench scene sets off the
  // hearts, if she says yes and you want the sky to say something.
  if (e.code === 'Enter' && ending.state === 'seated') { ending.celebrate(); return; }
  // Escape from the bench is the way out: the camera pulls back off the
  // island and it fades to black. Escape is the journal everywhere else, so
  // this has to come first.
  if (e.code === 'Escape' && ending.state === 'seated') { ending.finish(); return; }
  if (e.code === 'Space' && ending.locksInput) return;
  // The sky scene runs itself — but not at the cost of the two shortcuts that
  // exist precisely for when something has gone wrong.
  if (skyScene.locksInput && !(e.ctrlKey && e.shiftKey)) return;

  // Rehearsal shortcut: jump to the ending with everything found. For your
  // dry run, and for the unthinkable case of something going wrong in the room.
  if (e.code === 'KeyE' && e.ctrlKey && e.shiftKey) {
    nodeObjects.forEach((n) => { if (!n.node.found) markFound(n); });
    pendingSky = false;
    skyScene.end();
    const l = world.lookout;
    const ry = LOWPOLY ? groundAt(l.x + 0.5, l.z + 0.5) : world.grid.columnTop(l.x, l.z) + 1;
    player.pos.set(l.x + 0.5, ry, l.z + 0.5);
    player.vel.set(0, 0, 0);
    return;
  }

  if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey) { sound.toggleMute(); return; }

  // Rehearsal reset: wipe progress and reload, so you can play it through and
  // still hand her a clean save. index.html carries its own copy of this, so
  // it still works when this file is the thing that's broken — which is when
  // you actually need it.
  if (e.code === 'KeyX' && e.ctrlKey && e.shiftKey) {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* nothing to clear */ }
    location.reload();
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
const sunDir = new THREE.Vector3(1, 0.5, 0.3);
// The shower is held back until the sky has actually darkened. Firing it the
// instant she opens the memory wastes it against a bright sky.
let pendingShower = false;
// The scene waits for the note to be closed — she should be looking at the
// island when the camera takes over, not at a paragraph.
let pendingSky = false;
// Labyrinth is audible from about here out.
const CLUB_EARSHOT = 62;
const clubNode = world.nodes.find((n) => n.id === 'outside-the-club') || null;
let dusk = 0;
let smoothY = null;
let nearest = null;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  input.update();

  if (started && !noteOpen && !journalOpen && !ending.locksInput && !skyScene.locksInput) {
    player.update(dt, input);
  }
  gate.update(dt);
  const wasSeated = ending.state === 'seated';
  ending.update(dt);
  ending.checkApproach();
  if (!wasSeated && ending.state === 'seated') sound.ending();

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

  skyScene.update(dt);
  if (!ending.inControlOfCamera && !skyScene.inControlOfCamera) {
    follow.update(dt, player.pos, input.orbit);
  }

  // Sun follows the player so shadows stay sharp across a large world.
  sun.position.set(player.pos.x + 45, player.pos.y + 70, player.pos.z + 28);
  sun.target.position.copy(player.pos);

  advanceWind(t);
  advanceWater(t);

  // The sun the sky draws and the sun the water reflects have to be the one
  // the scene is actually lit by, or the highlight lands in the wrong place.
  sunDir.copy(sun.position).sub(sun.target.position).normalize();

  // Dusk deepens as she remembers more — but the meteor-shower memory is the
  // hinge. Before she finds it the world only reaches late afternoon; finding
  // it tips the sky into night, and the meteors start.
  const progress = found.size / Math.max(1, world.nodes.length);
  const nightTurned = world.nodes.some((n) => n.turns === 'night' && found.has(n.id));
  const duskTarget = nightTurned
    ? Math.min(1, 0.66 + progress * 0.34)
    : progress * 0.5;
  // Eased, so the change reads as the sky turning rather than a hard cut —
  // but quicker while the cutscene holds the camera, so the whole turn happens
  // inside the shot she is watching it in.
  dusk += (duskTarget - dusk) * Math.min(1, dt * skyScene.skyRate);

  if (pendingSky && !noteOpen && !journalOpen) {
    pendingSky = false;
    skyScene.start();
  }

  if (pendingShower && dusk > 0.55) {
    pendingShower = false;
    meteors.burst();
  }
  meteors.update(dt, player.pos, nightTurned);

  // How close is she to the water? Drives how loud the sea is.
  const groundHere = LOWPOLY ? groundAt(player.pos.x, player.pos.z)
                             : world.grid.columnTop(player.pos.x, player.pos.z) + 1;
  const seaNear = Math.max(0, Math.min(1, 1 - (groundHere - (SEA + 1)) / 9));
  // And how close to the club? You hear Labyrinth before you see it — that's
  // most of what standing outside one is.
  let clubNear = 0;
  if (clubNode) {
    const d = Math.hypot(player.pos.x - clubNode.x, player.pos.z - clubNode.z);
    clubNear = Math.max(0, Math.min(1, (CLUB_EARSHOT - d) / (CLUB_EARSHOT - 12)));
    clubNear *= clubNear;              // falls off the way sound does
  }
  sound.update(dusk, seaNear, clubNear);

  sky.update(dusk, sunDir, t);
  sky.mesh.position.copy(camera.position);
  scene.fog.color.copy(horizon);
  if (water) {
    water.update(t, dusk, sunDir, horizon, sun.color, horizon);
  }
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
  if (city) city.update(dusk);

  // Lamp light only really exists once the light goes. A pool on the ground at
  // four in the afternoon reads as a stain; the same pool at dusk reads as a
  // lamp. Each one also eases on rather than snapping, and breathes very
  // slightly, so a lit path looks alive.
  const lampNight = Math.max(0, Math.min(1, (dusk - 0.18) / 0.5));
  for (let i = 0; i < lamps.length; i++) {
    const lamp = lamps[i];
    const want = lamp.lit ? lampNight : 0;
    lamp.glowAt += (want - lamp.glowAt) * Math.min(1, dt * 1.6);
    const flicker = 0.94 + Math.sin(t * 1.7 + i * 2.3) * 0.06;
    lamp.pool.mat.uniforms.uStrength.value = lamp.glowAt * 0.85 * flicker;
    lamp.cone.mat.uniforms.uStrength.value = lamp.glowAt * flicker;
  }

  if (input.consumeInteract() && !noteOpen && !journalOpen && !ending.locksInput && nearest) {
    markFound(nearest);
    openNote(nearest.node);
  }

  // Focus tracks her distance from the camera, so she is always sharp.
  const focusDist = camera.position.distanceTo(her.root.position);
  dof.uniforms.focus.value += (focusDist - dof.uniforms.focus.value) * Math.min(1, dt * 2.5);
  // The ending is intimate, and it's the one place the softness earns itself.
  const wantAperture = ending.inControlOfCamera ? 0.00010 : 0.00004;
  dof.uniforms.aperture.value +=
    (wantAperture - dof.uniforms.aperture.value) * Math.min(1, dt * 0.8);

  composer.render();
}

// --- title card ----------------------------------------------------------
let started = false;

ui.titleName.textContent = HER_NAME;
ui.titleLine.textContent = TITLE_LINE;

function begin() {
  if (started) return;
  started = true;
  ui.title.classList.add('going');
  setTimeout(() => { ui.title.hidden = true; }, 1000);
  sound.start();
  renderer.domElement.focus();
}
addEventListener('keydown', begin, { once: false });
ui.title.addEventListener('click', begin);

ui.loading.hidden = true;
renderer.domElement.focus();
frame();

// Expose a little for tuning from the console during the build.
window.BM = { world, player, input, scene, found, ending, skyScene, lamps, gate, townLights, groundAt, LOWPOLY, sound, begin, GATE_REQUIREMENT, SEA, nodeObjects, markFound, checkGate };
