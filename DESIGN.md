# Be-Mine-3 — Design Proposal

A small top-down game where she plays as herself, wanders through the places
you've already been together, and finds you waiting at the end of it.

**Platform:** laptop/desktop web · **Genre:** top-down explorer · **Avatar:** pixel sprite

---

## What she actually experiences

1. **You hand her the laptop.** No app store, no install, no account. A browser
   tab, already open. Title screen with her name on it. She presses an arrow key
   and she's in.

2. **She's a small pixel version of herself,** standing in a world built out of
   your places. She walks. Everything is soft and quiet — no timers, no enemies,
   no way to lose.

3. **Things glow faintly.** A café table. A bus stop. A specific bench. She walks
   up, presses space, and a note opens — a couple of sentences in your voice
   about that day. The object lights up and stays lit. A counter in the corner:
   `4 / 12 remembered`.

4. **The world gets darker and warmer as she goes.** Not a difficulty curve — a
   time-of-day curve. Afternoon at the start, dusk by the middle, and every
   memory she's found is a lit lantern behind her. The map fills with light she
   made.

5. **A gate she couldn't open before is open.** Past it, one path, nothing to
   collect. Another sprite is standing at the end of it. That one's you.

---

## How it's built

The whole thing is one folder of plain files. No framework, no build step, no
dependencies to break the week you need it working.

| | |
|---|---|
| **Stack** | Vanilla JavaScript + HTML5 canvas. Tile-based map, 2D camera, keyboard input. |
| **Art** | Pixel art drawn in code. No image files to lose or mis-path — tiles and sprites are generated from palettes at load. Her sprite's hair and outfit colors are two variables. |
| **Hosting** | GitHub Pages, straight off this repo. Free, and it gives you a real link. |
| **Offline** | Zero network calls. It runs from a file on the desktop if the wifi dies mid-moment. |
| **Save** | Progress in `localStorage`, so a stray refresh doesn't erase an hour of her evening. |
| **Controls** | Arrow keys or WASD to walk, space to look at something, Esc for the journal of what she's found. |

---

## The world

Five zones, connected, walkable in any order except the last. The point of the
shape is that she chooses her own route through your history — it shouldn't feel
like a slideshow with a controller.

| Zone | Size | What's in it |
|---|---|---|
| **Where it started** | 2–3 memories | The place you first met, or first properly talked. Small, and she starts here. |
| **The town** | 4–5 memories | The biggest zone. Restaurants, walks, the shop you went into for one thing and left an hour later. Most of your content lives here. |
| **Somewhere far** | 2–3 memories | A trip, a drive, a day out. Different tileset — sand, or forest, or a train window — so it reads as elsewhere. |
| **The quiet places** | 3–4 memories | The unphotographed stuff. A sofa. A 2am phone call. A specific joke. This is the zone that actually lands — the big days are easy to remember, and being noticed on the ordinary ones is the thing that gets people. |
| **The lookout** | locked, needs 10 | Sealed until she's found enough. No collectibles past the gate — just a walk, and the question. |

---

## The one file only you can write

The split that makes this tractable: the engine knows nothing about your
relationship, and you fill in a single content file. Every memory is one entry.
Add one and it appears in the world — no code changes, no re-layout.

```js
// memories.js — the whole game is driven by this list

{
  id:     'corner-table',
  zone:   'town',
  at:     { x: 14, y: 9 },        // where it sits on the map
  object: 'cafe-table',           // what it looks like: table, bench,
                                  // bus-stop, tree, sign, door, radio…
  title:  'The corner table',
  when:   'a Tuesday in March',
  text:   "You ordered the thing you didn't want just to
           see if I'd notice. I noticed. I've been
           noticing ever since.",
  photo:  null                    // optional, if you want one
}
```

**Write these badly first.** Twelve rough entries beat four perfect ones — the
volume is what makes the world feel full. We can rewrite the prose together once
they're all in and you can see them in place.

---

## The ending

The gate is the whole reason for the collecting. She's spent ten minutes being
reminded that you pay attention, and only then does the game ask her anything.

1. **The path lights itself.** Every lantern she lit across the map flickers on
   at once, then a line of them leads up to the lookout. It should read as: all
   of this was going somewhere.
2. **She walks up alone.** Nothing to interact with. Music, if you want music,
   comes in here. Movement slows slightly.
3. **Your sprite is at the top.** It doesn't move toward her. She closes the
   distance — the last few steps are hers.
4. **The world dims and the words come one line at a time.** Paced, not dumped.
   Your words, not mine — that string stays empty for you to fill.
5. **The question, and two buttons.** And then whatever she says, she says out
   loud, to you, sitting right there.

---

## Two things I'd push back on

### Don't make the "No" button run away from the cursor

It's the most common move in this genre and it's a mistake. It turns a real
question into a bit, and it quietly says the only permitted answer is yes. A
question she couldn't have answered any other way isn't much of a question, and
she'll know it.

Make the second button **"Ask me again out loud."** It's not a rejection — it
hands the moment back to you, in person, which is where it belongs anyway. And
it makes the yes mean something, because it was choosable.

### Keep it to about ten minutes

Twelve memories, not forty. Past fifteen minutes a gift starts to feel like an
assignment, and the ending lands hardest while she still wants more of it.
Anything that doesn't fit goes in the journal screen as a bonus she can read
later.

---

## Build plan

| Phase | What | Detail |
|---|---|---|
| P1 | Engine skeleton | Canvas, tilemap, walking, collision, camera. Playable empty world. |
| P2 | Memory system | Interactable objects, the note panel, the counter, the journal, save/load. |
| P3 | Art and atmosphere | Her sprite, the five zone tilesets, the afternoon-to-dusk light curve, lanterns. |
| P4 | The ending sequence | Gate, walk-up, dialogue pacing, the question, the buttons. |
| P5 | Your content | Your memories in, prose pass together, her sprite colors, the final words. |
| P6 | Dry run | Deploy, then play it start to finish on the actual laptop, in the actual browser, offline. Plus a hidden key combo that jumps to the ending, in case something goes wrong in the room. |

---

## What I need from you

- [ ] **Her name**, and rough hair and outfit colors for the sprite.
- [ ] **Ten to fourteen memories.** For each: where it happened, roughly when,
      and one or two sentences about it. Rough is fine.
- [ ] **The recurring things.** A food you always get, a song, a phrase, a joke
      that won't die. These become objects scattered through the world and
      they're the details she'll notice.
- [ ] **Whether you want real photos in it,** or to keep it entirely pixel art.
      Both work; pixel-only is more cohesive.
- [ ] **The last lines.** What you actually want to say, in your words. The
      moment gets built; the words in it should be yours.

Send the memories and the engine can start in parallel — none of the code
depends on knowing them.
