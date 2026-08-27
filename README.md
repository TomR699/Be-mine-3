# Be Mine

A small voxel game. She plays as herself, walks an island built out of things
you've done together, and finds you at the end of it.

**Status: P3 — low-poly, dressed sets, real content in.** The world, the character, the camera, and the memory
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
| `Space` | during the ending, move to the next line |
| `Ctrl`+`Shift`+`E` | rehearsal shortcut: find everything and jump to the ending |

The camera is free — orbit, zoom, the lot.

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
  sky.js            sky shader: gradient, sun, stars
  water.js          sea shader: waves, fresnel, specular, shore foam
  sets.js           the dressed scenery around each checkpoint
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

**One mesh, not thousands of cubes.** `voxel.js` walks the grid and emits only
the faces that touch air — the inside of the terrain costs nothing. The whole
island is two draw calls (solid and water) rather than a quarter of a million
individual boxes.

**Small scenery is props, not blocks.** Flowers and lamps are real geometry
rather than voxels, because a full-block flower looks like chewing gum and a
full-block lamp post looks like a wall. Flowers are instanced, so hundreds of
them cost two draw calls.

**Checkpoints are sited, not stamped.** For each memory the generator sweeps a
fan of candidate positions either side of the path and scores them on how flat
the island already is there, how far they sit from the path, and how far from
the other checkpoints. Candidates with any path inside their footprint are
rejected outright unless nothing else qualifies — the path loops back on itself,
so being clear of the stretch you arrived on is no guarantee. The winner gets a
terrace cut into the hillside with an eased rim whose radius wobbles with angle,
so it reads as a natural shoulder rather than a circular plateau. The carved
path is never re-cut: it is the only route to the gate.

Each set then faces back toward the path, so it opens to the direction she
arrives from. `SET_RADIUS` in `sets.js` is how each set tells the generator how
much flat ground it needs.

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
`Enter` sets off a burst of hearts.

`Ctrl`+`Shift`+`E` jumps straight there with everything found.

## What's left

- **P3** — zone-specific tilesets so the island reads as distinct places
- **P4** — real content (see below)
- **P5** — the dry run: deploy, then play it start to finish on the actual
  laptop, offline, before the day

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

## The part that needs you

The nine memories in `src/memories.js` are drafts written from your notes,
with your own phrases kept deliberately. Read them as her and change anything
that doesn't sound like you.

`ENDING_LINES` and `THE_QUESTION` at the bottom of that file are also drafts,
and those are the ones that should really be yours.

Her sprite colours are `HER` at the top of `src/character.js`: `hair` and
`outfit` are the two that matter.
