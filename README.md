# Be Mine

A small voxel game. She plays as herself, walks an island built out of things
you've done together, and finds you at the end of it.

**Status: P1 complete.** The world, the character, the camera, and the memory
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

## What's left

- **P2** — the gate to the lookout, and the ending sequence
- **P3** — zone-specific tilesets, richer dusk lighting
- **P4** — real content (see below)
- **P5** — the dry run: deploy, then play it start to finish on the actual
  laptop, offline, before the day

## The part that needs you

Everything in `src/memories.js` marked `PLACEHOLDER`. Twelve entries, one or
two sentences each, plus `ENDING_LINES` and `THE_QUESTION` at the bottom of
that file. Nothing else in the codebase needs to change when you write them —
add an entry and it appears in the world.

Her sprite colours are `HER` at the top of `src/character.js`: `hair` and
`outfit` are the two that matter.
