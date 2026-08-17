# Addendum — Should it be 3D?

Follow-up to [DESIGN.md](./DESIGN.md). Status: **recommendation, awaiting a call.**

Short answer: 3D is very much possible, it doesn't break any of the constraints
in the original proposal, and for the ending it's probably the better choice.

---

## Three ways to do it

| Approach | Reference | Cost | Verdict |
|---|---|---|---|
| **Full voxel** | Crossy Road, Minecraft-adjacent | ~+40% build time | Works. Geometry still generated from code, same as the 2D tiles. But a voxel character is blocky enough that "that's me" comes from hair color and little else. |
| **HD-2D** — voxel world, 2D pixel sprites | Octopath Traveler | ~+50% build time | **Recommended.** Real depth and lighting in the world; she stays a hand-drawn sprite with an actual face that can be tuned until it reads as her. |
| **Low-poly / PS1-style** | Early 3D, deliberately crunchy | ~+200%, needs a modeller | Steer clear. Needs modelled and textured assets, a character rig, animations. Wrong shape of risk when there's a date attached. |

---

## What 3D buys

- **A much better ending.** This is the real argument. The camera can push in on
  the two sprites, the world can dim around the lookout, and a lantern-lit path
  climbing a hill has genuine verticality instead of being implied by a tile.
  The last thirty seconds are the whole point.
- **Light does the emotional work.** Dusk falling was a color-swap trick in 2D.
  In 3D it's real lighting — long shadows, lanterns casting warm pools, the sky
  going orange behind her. Nearly free once the renderer exists.
- **The world still comes from code.** Voxel geometry is built from data arrays,
  exactly like the 2D tilemap. No asset pipeline, nothing to lose.

## What 3D costs

- **Roughly half again the build time.** Camera, collision in three axes, depth
  sorting, a lighting pass. Not double — the content and writing work is
  identical, and that's the half that depends on external input.
- **Places get harder to recognize.** A flat pixel café table reads as a café
  table instantly. In 3D there's more surface, so a vague object looks vague
  rather than iconic. Keep props stylized; let the note text carry specificity.
- **One new failure mode: WebGL on the target laptop.** Fine on anything modern,
  but hardware-dependent in a way canvas isn't. Mitigation is non-negotiable:
  test on the real machine in week one, not the night before.

---

## Non-negotiable: the camera stays fixed

It follows her. It does not rotate. There is no mouse-look.

If she isn't a regular gamer, moving *and* steering a camera is a real skill
barrier, and the failure mode is her fighting the controls and apologising
during what's meant to be a lovely moment. A fixed three-quarter camera costs
nothing to learn and nothing to build. Depth should be something she sees, never
something she has to operate.

---

## What is unchanged by this decision

- `memories.js` is identical. Entries just gain a `z`. Nothing written for the
  2D version gets thrown away.
- GitHub Pages hosting, same repo, same link.
- Zero network calls. three.js vendors into the repo as a single ~690 KB file.
- No build step. Plain files opened in a browser.
- Controls: arrows/WASD, space to look, Esc for the journal.
- The ending beats, the two buttons, and the pushback on the running-away "No".

---

## Revised build plan (HD-2D)

| Phase | What | Detail |
|---|---|---|
| P1 | Renderer + world | three.js vendored, fixed three-quarter camera, voxel terrain from data arrays, sprite billboarding, collision. **Milestone: walk a sprite around an empty world.** |
| P2 | Memory system | Interactable props, note panel, counter, journal, save/load. Unchanged from the 2D plan. |
| P3 | Light and atmosphere | Zone tilesets, the afternoon-to-dusk light curve, lantern glow, shadows. |
| P4 | The ending sequence | Gate, the climb, camera push-in, dialogue pacing, the question. |
| P5 | Content | Memories in, prose pass, sprite colors, the final words. |
| P6 | Dry run | Deploy, play start to finish on the real laptop, offline, plus the hidden skip-to-ending key combo. |

P1 is the one to do first regardless — it's the milestone that proves the feel
before any content goes in.
