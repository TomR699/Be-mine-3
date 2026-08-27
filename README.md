# Be Mine

A small voxel game. She plays as herself, walks an island built out of things
you've done together, and finds you at the end of it.

**Status: P2 complete, real content in.** The world, the character, the camera, and the memory
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
  ending.js         the gate, the cinematic, fireflies
  memories.js       >>> the content file — this is the one you write <<<
```

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

**Memories drive everything.** Each entry in `memories.js` becomes a prop
anchored to real ground along the path, with a halo while it's unfound. Opening
one lights another lamp and pushes the sky further toward dusk, so the island
gets warmer and darker the more she remembers.

## The ending

The lookout is a mesa with cliff sides, so the carved path is the only way up
and the gate across it genuinely blocks — she cannot simply walk around it. It
opens when she's found `GATE_REQUIREMENT` memories (`memories.js`, currently all
but two).

Past the gate she walks up alone. Within six metres of him the game takes over:
control locks, letterbox bars come in, she walks the last two paces herself and
turns to face him, and the camera drifts in closer with each line. Then the
question, and two buttons — `Yes`, and `Ask me again out loud`, which is not a
rejection but a hand-off to the room you're both sitting in. Yes gets a burst of
hearts; the other releases control back and leaves you standing together.

`Ctrl`+`Shift`+`E` jumps straight there with everything found. That's for your
dry run — and for the unthinkable case of something going wrong in the moment.

## What's left

- **P3** — zone-specific tilesets so the island reads as distinct places
- **P4** — real content (see below)
- **P5** — the dry run: deploy, then play it start to finish on the actual
  laptop, offline, before the day

## The night the sky turns

The nine memories sit along the path in chronological order. One of them —
the meteor shower — carries `turns: 'night'`. Before she finds it the world
only ever reaches late afternoon; opening it eases the sky into night over a
few seconds and starts the shooting stars, which run for the rest of the game.

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
