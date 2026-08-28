# Be Mine

A small voxel game. She plays as herself, walks an island built out of things
you've done together, and finds you at the end of it.

**Status: P3 — low-poly, dressed sets and their surroundings, real content in.** The world, the character, the camera, and the memory
loop all work. The content is placeholder — see
[what's left](#whats-left) below.

## Running it

ES modules need to be served over HTTP, so opening `index.html` directly off
the disk won't work. From this folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works. On GitHub Pages it just works, no configuration.

## Controls

| | |
|---|---|
| `W A S D` / arrows | walk |
| `Shift` | run |
| `Space` | jump, or paddle upward while swimming |
| drag the mouse | orbit the camera |
| scroll | zoom |
| `E` | look closer at a memory |
| `Esc` | the journal of what she's found |
| `Enter` | during the bench scene, a burst of hearts — press it as often as you like |
| `Esc` | during the bench scene, pull back off the island and fade to black |
| `M` | mute |
| `Ctrl`+`Shift`+`E` | rehearsal shortcut: find everything and jump to the ending |
| `Ctrl`+`Shift`+`X` | wipe progress and reload, for a clean hand-over |

The camera is free — orbit, zoom, the lot.

Whether she's on the ground is a probe of the ground beneath her, not an
inference from whether the last downward move collided. At 60fps she falls
about 0.007 of a block per frame — too little to trip the collision epsilon —
so inferring it flickered `grounded` off every other frame, which froze the
walk cycle into its airborne pose and jittered her height. It only showed on
real hardware; a slow test rig falls far enough per frame to land cleanly.

`WALK` in `src/controls.js` is the dial if the pace feels wrong. Her legs are
0.75 m, and keeping her feet on the ground at a given speed fixes the cadence —
so a higher walk speed necessarily means a faster stride, no matter how the
animation is tuned. Lower `WALK` for a calmer walk.

## Layout

```
index.html          page, HUD, WebGL check
vendor/             three.js r170, one file, no CDN
src/
  main.js           scene setup, game loop, interaction, save/load
  world.js          terrain generation, the path, prop placement
  voxel.js          block ids, the grid, the mesher
  character.js      the voxel character rig and walk cycle
  controls.js       input, player physics, the follow camera
  props.js          memory objects, lamps, flowers
  lowpoly.js        faceted terrain, trees, the ground sampler
  audio.js          synthesised wind, sea, pad, chimes
  sky.js            sky shader: gradient, sun, stars
  water.js          sea shader: waves, fresnel, specular, shore foam
  sets.js           the dressed scenery around each checkpoint
  text3d.js         a 5x7 pixel font, for signage that actually reads
  ending.js         the gate, the cinematic, fireflies, meteors
  memories.js       >>> the content file — this is the one you write <<<
```

## Art style

Low-poly by default. `?style=voxel` switches back to the block renderer — both
draw the same world from the same heightmap, so it's a true A/B and voxel stays
a working fallback.

Collision is the voxel grid in both modes. In low-poly the visible ground is
smooth while the collider underneath is blocky, so everything that stands on
the ground — her, the props, the lamps, the gate — is placed by `groundAt()`
from `lowpoly.js` rather than by the block it happens to occupy. Without that
she hovers on every slope.

## How it works

**The world is generated, not authored.** `world.js` builds a heightmap from
value noise with an island falloff, flattens a corridor under a path defined by
fifteen waypoints, then scatters trees, flowers, and lamps around it. Change
the waypoints and the island reshapes around them.

The island is 224 blocks square. It was 128 until the sets grew: eleven dressed
sets want about eight thousand blocks of level ground between them, and on the
old island that was most of the land, so they were being shoved into each other.
The waypoints, the noise scale and the mesa were all scaled with it, so the
island looks the same — there is simply more of it. The opening camera angle is
taken from the direction the path leaves the beach rather than being a fixed
number, so moving the waypoints doesn't leave her staring out to sea.

The lookout stays bare of trees. The last shot of the game looks out over the
island from the bench, and a pine on the shoulder of the hill stands right in
front of it.

**One mesh, not thousands of cubes.** `voxel.js` walks the grid and emits only
the faces that touch air — the inside of the terrain costs nothing. The whole
island is two draw calls (solid and water) rather than a quarter of a million
individual boxes.

**Lamplight is light, not a decal.** The pool under a lamp is a disc with a
radial falloff, drawn additively so the grass and the path read through it, and
every vertex is dropped onto the real ground height so it drapes over a slope
instead of slicing through it. A flat quad of solid colour on lumpy ground is
half-buried at one end and floating at the other, which is exactly what a yellow
square on the grass looks like. A very faint cone joins the pool to the bulb.
None of it exists in daylight — a pool of light at four in the afternoon reads
as a stain.

**Small scenery is props, not blocks.** Flowers and lamps are real geometry
rather than voxels, because a full-block flower looks like chewing gum and a
full-block lamp post looks like a wall. Flowers are instanced, so hundreds of
them cost two draw calls.

**Checkpoints are sited, not stamped.** For each memory the generator sweeps a
fan of candidate positions either side of the path and scores them on how flat
the island already is there, how far they sit from the path, and how far from
the other checkpoints. Candidates with the path running through their footprint
are rejected outright — the path loops back on itself, so being clear of the
stretch you arrived on is no guarantee. The winner gets a terrace cut into the
hillside, level across its **whole** footprint and easing back into the slope
beyond it.

**A set asks for the ground it actually needs.** `setFootprint()` in `sets.js`
builds the set, measures its bounding box and reports a half-extent. Nothing is
declared by hand, because a hand-written radius goes stale the moment a set
grows — every one of these sets outgrew the number written for it, and they
ended up standing on the slope they were meant to be cut into.

It's a rectangle in the set's own space, not a circle. The club is a street and
the bedroom is a room; giving both a circle wide enough for the longer side is
what made them crowd each other off the island. Terraces, spacing and tree
clearance all work in that space, so each set is cut to the shape it is.

**Where a set meets the path, the terrace matches the path's height.** The path
can't be re-levelled — it's the only route to the gate — so the alternative is
easing the terrace down to it, and that ramp runs several blocks inward, under
the set. Cutting the terrace flush with the path instead means there's nothing
to ease. Only the verge outside the footprint gives way.

**Sets are placed biggest first**, and the spacing they demand relaxes in stages
before the search gives up. The sweep only knows about sets already placed, so
if a small one takes the single wide shelf, the street that needed it has
nowhere to go. And two verges meeting is a much smaller problem than two
terraces cut through each other, which leaves a cliff standing in both.

Two more things tie a set to the island rather than leaving it sitting on top
of one. A **worn spur** is carved from the path to each site, climbing between
the two and running level once inside the terrace; without it nothing explains
why there's a flat clearing there. Its mouth is flared where it meets the main
path, and a **fingerpost** stands just inside it pointing the way — a track you
have to look for is the same as no track at all, and not knowing where to go is
the one thing that will pull her out of it. And the **lip of every terrace is dressed**
with boulders, bushes and grass — rocks clustered on the cut edge, greenery
spreading further out — which is what hides the seam where the cut meets the
hillside.

Each set then faces back toward the path, so it opens to the direction she
arrives from.

**Sets are written a box at a time and drawn as a handful.** Writing them box
by box is right; drawing them that way is not — eleven dressed sets came to
about 1250 meshes, and a draw call each is what a browser spends its frame on.
Nothing in a set moves, so `mergeFlat()` bakes each one into one merged
geometry per colour. Same picture, a third of the draw calls.

**Each checkpoint is a dressed set.** `sets.js` builds the scenery around every
memory — a tennis court with a net and lines, a gym floor with a squat rack, a
club frontage with a smoking pen. Each stands on its own floor (decking, paving,
a rug, clay) so it reads as a place rather than furniture on a hillside, and the
terrain generator levels a pad under each one before the world is filled. Sets
are visual only; she can walk through them.

**Memories drive everything.** Each entry in `memories.js` becomes a prop
anchored to real ground along the path, with a halo while it's unfound. Opening
one lights another lamp and pushes the sky further toward dusk, so the island
gets warmer and darker the more she remembers.

## The ending

The lookout is a mesa with cliff sides, so the carved path is the only way up
and the gate across it genuinely blocks — she cannot simply walk around it. It
opens when she's found `GATE_REQUIREMENT` memories.

Past the gate she climbs alone. At the lip of the mesa there's a bench facing
out over the island, and he's been sitting on it the whole game — visible from
down on the path long before she gets there. Cresting the top starts it:
control locks, letterbox bars come in, she walks the last few paces herself and
sits down next to him. The camera settles behind them, framing the valley, and
pushes in very slowly.

Then nothing. No lines, no question, no buttons. **That's the point — the
talking happens in the room.** If she says yes and you want the sky to agree,
`Enter` sets off a burst of hearts — and it's spammable, because one burst is a
gesture and leaning on the key is a reaction. Bursts pile up rather than cutting
each other off, capped at twelve so a thumb can't cost you the frame rate.

`Esc` from the bench is the way out: the camera pulls all the way back off the
island until the two of them are a detail on a hillside, and it fades to black.
It's there so the game has an ending you can reach rather than a frame it sits
on forever.

`Ctrl`+`Shift`+`E` jumps straight there with everything found.

## What's left

- **P3** — zone-specific tilesets so the island reads as distinct places
- **P4** — real content (see below)
- **P5** — the dry run: deploy, then play it start to finish on the actual
  laptop, offline, before the day

## Sound

Synthesised at runtime — no audio files to lose or fail to load. Wind is
filtered noise breathing on two LFOs at different rates so the gusting never
sounds periodic; the sea is darker noise on a slow swell that rises as she
approaches the water; and a quiet held chord opens up and warms as dusk falls,
so the world sounds later rather than only looking it. Each memory rings a soft
bell a step further up the scale, so collecting them climbs.

**Labyrinth you hear before you see.** What you actually hear standing in a
smoking area is not the track — it's the kick and the bassline through a wall
with everything above a few hundred hertz taken out. So that's all it is: four
to the floor, a two-bar bass figure, and a heavy lowpass over the pair. No hats,
no melody; adding those makes it a stereo in a field rather than a room you're
stood outside of. It fades up over the last sixty metres and the wall opens
slightly as she gets closer. Beats are scheduled a fraction of a second ahead
from the frame loop rather than looped, so it costs nothing when she's away.

Browsers refuse to start audio until the user interacts with the page, which is
why the title card exists — it is the gesture that turns the sound on.

**Optional:** drop a file at `audio/theme.mp3` and it plays over the bench scene
at the end. If it isn't there nothing breaks and the ending runs on wind alone.
That's the one place a song of your own belongs.

## Shaders

**The sky** is a shader dome, not a coloured mesh. It carries a vertical
gradient, a horizon band, a real sun disc with bloom around it, and a field of
procedural stars — hashed per cell of the view direction, each with its own
brightness and twinkle — that fades in as night comes. The horizon runs day to
sunset to deep blue in two stages; a single lerp leaves it glowing orange at
midnight.

**The sea** is a shader too. Waves are generated in the vertex stage and the
normal is derived from the same function rather than guessed, so the light sits
correctly on them. Fresnel makes it near-transparent looking down and reflective
at a glance, there's a sun specular, and the swell flattens into the shallows.
Foam at the shoreline is driven by real water depth baked into each vertex from
the terrain heightmap — cheaper and steadier than reading scene depth.

Both are raw ShaderMaterials writing linear colour, which the composer's
OutputPass tone-maps like everything else. The sea does its own fog, since a
raw shader doesn't inherit the scene's.

## The night the sky turns

The nine memories sit along the path in chronological order. One of them —
the meteor shower — carries `turns: 'night'`. Before she finds it the world
only ever reaches late afternoon; opening it eases the sky into night over a
few seconds and starts the shooting stars, which run for the rest of the game.

Finding it also fires a real shower: a burst of meteors running mostly the same
way across the sky, thinning over about half a minute to the occasional streak
that continues for the rest of the game. The burst is held back until the sky
has actually darkened — fired on the keypress it would be wasted against a
bright sky.

It's the emotional hinge of the story, so it changes the world rather than
just adding another note. Move the flag to a different entry and the hinge
moves with it.

**It's a cutscene, because it was happening behind her.** The sky used to turn
while she was mid-stride looking at the ground. Now closing that memory hands
the camera over: it lifts off her shoulder and drifts round until she's small
against the sky, the light goes, the shower runs, and after about twelve seconds
it gives everything back. There is nothing to press — nothing to skip past, so
no skip. `SkyCutscene` in `ending.js`.

## The part that needs you

`HER_NAME` at the top of `src/memories.js` is on the title card and is still
`PLACEHOLDER`. `TITLE_LINE` is the line underneath it.


The nine memories in `src/memories.js` are drafts written from your notes,
with your own phrases kept deliberately. Read them as her and change anything
that doesn't sound like you.

`ENDING_LINES` and `THE_QUESTION` at the bottom of that file are also drafts,
and those are the ones that should really be yours.

Her sprite colours are `HER` at the top of `src/character.js`: `hair` and
`outfit` are the two that matter.
